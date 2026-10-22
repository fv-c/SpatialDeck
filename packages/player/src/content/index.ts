import type {
  Block,
  ProjectDocument,
  JsonValue,
  NavigationResult,
  PlayerEvents,
  Diagnostic,
} from "@spatialdeck/core";
import type { AssetResolver } from "../assets/index.js";
export interface ContentServices {
  assets?: AssetResolver;
  navigate(target: {
    pathId: string;
    nodeId: string;
  }): Promise<NavigationResult>;
  on<K extends keyof PlayerEvents>(
    event: K,
    handler: (payload: PlayerEvents[K]) => void,
  ): () => void;
  emit(name: string, payload: JsonValue): void;
  report(diagnostic: Diagnostic): void;
  mediaError?(message: string): void;
}
export interface ContentContext {
  block: Block;
  document: ProjectDocument;
  instanceId: string;
  active: boolean;
  mediaEnabled: boolean;
  mediaMuted: boolean;
  signal: AbortSignal;
  services: ContentServices;
}
export interface ContentRenderer {
  mount(host: HTMLElement, context: ContentContext): void;
  update(context: ContentContext): void;
  destroy(): void;
}
export type RendererFactory = () => ContentRenderer;
export class RendererRegistry {
  private factories = new Map<Block["type"], RendererFactory>();
  register(type: Block["type"], factory: RendererFactory): () => void {
    if (this.factories.has(type))
      throw new Error(`Renderer already registered: ${type}`);
    this.factories.set(type, factory);
    return () => {
      if (this.factories.get(type) === factory) this.factories.delete(type);
    };
  }
  get(type: Block["type"]): RendererFactory | undefined {
    return this.factories.get(type);
  }
}
export function blockText(block: Block): string {
  const d = block.data;
  return "text" in d
    ? d.text
    : "alt" in d
      ? d.alt
      : "label" in d
        ? d.label
        : "title" in d
          ? d.title
          : "source" in d
            ? d.source
            : `Plugin: ${d.pluginId}`;
}
/** The boundary owns abort, renderer and DOM, including failed mounts/updates. */
export class ContentMount {
  private renderer: ContentRenderer | undefined;
  private controller = new AbortController();
  private last = "";
  private disposed = false;
  constructor(
    private host: HTMLElement,
    private initial: Omit<ContentContext, "signal">,
    registry?: RendererRegistry,
  ) {
    const factory = registry?.get(initial.block.type);
    if (!factory) {
      host.textContent =
        initial.block.type === "text"
          ? initial.block.data.text
          : `Contenuto non disponibile (${initial.block.type}): ${blockText(initial.block)}`;
      return;
    }
    try {
      this.renderer = factory();
      this.renderer.mount(host, { ...initial, signal: this.controller.signal });
    } catch (error) {
      this.failed(error);
    }
  }
  update(active: boolean, mediaEnabled: boolean) {
    const key = `${active}:${mediaEnabled}`;
    if (this.disposed || key === this.last) return;
    this.last = key;
    try {
      this.renderer?.update({
        ...this.initial,
        active,
        mediaEnabled,
        signal: this.controller.signal,
      });
    } catch (error) {
      this.failed(error);
    }
  }
  private failed(error: unknown) {
    this.destroy();
    this.host.textContent = `Errore contenuto: ${String(error)}`;
    this.host.setAttribute("role", "status");
    this.initial.services.report({
      code: "RENDERER_ERROR",
      severity: "warning",
      pointer: "",
      message: String(error),
    });
  }
  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    this.controller.abort();
    try {
      this.renderer?.destroy();
    } catch {
      /* Other renderers still dispose. */
    }
    this.renderer = undefined;
    this.host.replaceChildren();
  }
}
