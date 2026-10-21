import {
  NavigationMachine,
  diagnostic,
  failure,
  getWorldMatrix,
  validateDocument,
  viewMatrix,
} from "@spatialdeck/core";
import type {
  Diagnostic,
  NavigationOptions,
  NavigationResult,
  PlayerEvents,
  PlayerState,
  ProjectDocument,
  Result,
} from "@spatialdeck/core";
export interface PlayerClock {
  now(): number;
  request(callback: () => void): number;
  cancel(id: number): void;
}
export interface PlayerOptions {
  input?: boolean;
  keymap?: Readonly<Record<string, "next" | "prev">>;
  motion?: "system" | "reduced";
  clock?: PlayerClock;
  onError?: (diagnostic: Diagnostic) => void;
}
export interface Player {
  mount(container: HTMLElement, document: unknown): Promise<Result<void>>;
  destroy(): void;
  goTo(
    target: { pathId?: string; nodeId: string },
    options?: NavigationOptions,
  ): Promise<NavigationResult>;
  next(options?: { edgeId?: string }): Promise<NavigationResult>;
  prev(): Promise<NavigationResult>;
  setPath(pathId: string): Promise<NavigationResult>;
  getState(): Readonly<PlayerState>;
  on<K extends keyof PlayerEvents>(
    event: K,
    handler: (payload: PlayerEvents[K]) => void,
  ): () => void;
}
export function createPlayer(options: PlayerOptions = {}): Player {
  const instanceId = Array.from(
    globalThis.crypto.getRandomValues(new Uint32Array(4)),
  ).join("-");
  let machine: NavigationMachine | undefined,
    host: HTMLElement | undefined,
    root: HTMLElement | undefined,
    viewport: HTMLElement | undefined,
    world: HTMLElement | undefined,
    outline: HTMLElement | undefined,
    live: HTMLElement | undefined,
    emptyMessage: HTMLElement | undefined,
    outlineButton: HTMLButtonElement | undefined,
    stageElement: HTMLElement | undefined,
    focusOrigin: Element | null = null;
  let doc: ProjectDocument | undefined,
    clock: PlayerClock | undefined,
    frame: number | undefined,
    destroyed = false,
    outlineOpen = false,
    spatialSupported = true,
    focusRequested = false,
    focusAllowed = false,
    pathRendered: string | null | undefined;
  let media: MediaQueryList | undefined,
    manualReduced = options.motion === "reduced",
    oldTabindex: string | null = null;
  const cleanup: Array<() => void> = [],
    scenes = new Map<
      string,
      { wrapper: HTMLElement; content: HTMLElement; title: HTMLElement }
    >();
  const handlers = new Map<
    keyof PlayerEvents,
    Set<(payload: unknown) => void>
  >();
  const report = (d: Diagnostic) => {
    try {
      options.onError?.(d);
    } catch {
      /* A failing error sink is isolated. */
    }
  };
  const emit = <K extends keyof PlayerEvents>(
    name: K,
    payload: PlayerEvents[K],
  ) => {
    for (const handler of [...(handlers.get(name) ?? [])])
      try {
        handler(payload);
      } catch (error) {
        const d = diagnostic("HANDLER_ERROR", String(error));
        report(d);
        if (name !== "diagnostic")
          emit("diagnostic", { instanceId, diagnostic: d });
      }
  };
  const state = (): PlayerState =>
    machine?.getState() ?? {
      status: destroyed ? "destroyed" : "unmounted",
      pathId: null,
      nodeId: null,
      sceneId: null,
      history: [],
      camera: null,
      transition: null,
      choices: [],
      diagnostics: [],
    };
  const unavailable = (): Promise<NavigationResult> =>
    Promise.resolve({
      status: "error",
      diagnostic: diagnostic(
        destroyed ? "PLAYER_DESTROYED" : "PLAYER_UNMOUNTED",
        destroyed ? "Player is destroyed" : "Player is not mounted",
      ),
    });
  const element = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className = "",
  ) => {
    const el = host!.ownerDocument.createElement(tag);
    el.className = className;
    return el;
  };
  const render = () => {
    if (!root || !machine || !doc || destroyed) return;
    const s = machine.getState();
    if (
      focusRequested &&
      focusOrigin &&
      host?.ownerDocument.activeElement !== focusOrigin
    )
      focusAllowed = false;
    if (emptyMessage) emptyMessage.hidden = s.status !== "empty";
    if (outlineButton)
      outlineButton.disabled = !spatialSupported || s.status === "empty";
    if (stageElement) stageElement.hidden = outlineOpen || s.status === "empty";
    if (s.camera && world)
      world.style.transform = `matrix3d(${viewMatrix(s.camera).join(",")})`;
    for (const [id, scene] of scenes) {
      const active = id === s.sceneId;
      scene.content.inert = !active || outlineOpen;
      scene.content.setAttribute("aria-hidden", String(!active || outlineOpen));
      scene.wrapper.dataset.active = String(active);
    }
    if (outline && pathRendered !== s.pathId) {
      pathRendered = s.pathId;
      outline.replaceChildren();
      const path = doc.paths.find((p) => p.id === s.pathId);
      let id = path?.startNodeId ?? null;
      while (id && path) {
        const node = path.nodes.find((n) => n.id === id)!;
        const scene = doc.scenes.find((s) => s.id === node.sceneId)!;
        const li = element("li"),
          button = element("button");
        button.type = "button";
        button.textContent = scene.title;
        button.dataset.nodeId = node.id;
        li.append(button);
        for (const block of scene.blocks) {
          const p = element("p");
          p.textContent = block.data.text;
          li.append(p);
        }
        outline.append(li);
        id = path.edges.find((e) => e.from === id)?.to ?? null;
      }
    }
    outline?.querySelectorAll("button").forEach((button) => {
      button.setAttribute(
        "aria-current",
        String(button.dataset.nodeId === s.nodeId),
      );
    });
    if (live) {
      const title =
        doc.scenes.find((scene) => scene.id === s.sceneId)?.title ??
        "Presentazione vuota";
      if (live.textContent !== title) live.textContent = title;
    }
    if (
      s.status === "transitioning" &&
      frame === undefined &&
      clock &&
      !host?.ownerDocument.hidden
    )
      frame = clock.request(() => {
        frame = undefined;
        machine?.tick();
      });
    if (
      (s.status !== "transitioning" || host?.ownerDocument.hidden) &&
      frame !== undefined
    ) {
      clock?.cancel(frame);
      frame = undefined;
    }
  };
  const invoke = (command: () => Promise<NavigationResult>) => {
    if (host?.ownerDocument.activeElement === host) focusRequested = true;
    return command().then((result) => {
      if (result.status !== "completed" && state().status !== "transitioning")
        focusRequested = false;
      return result;
    });
  };
  const player: Player = {
    async mount(container, input) {
      if (destroyed) return failure("PLAYER_DESTROYED", "Player is destroyed");
      if (machine)
        return failure("ALREADY_MOUNTED", "Player is already mounted");
      const validated = validateDocument(input);
      if (!validated.ok) return validated;
      host = container;
      doc = validated.value;
      const win = container.ownerDocument.defaultView;
      if (!win)
        return failure("NO_WINDOW", "Container must belong to a window");
      spatialSupported =
        win.CSS.supports("transform-style", "preserve-3d") &&
        win.CSS.supports("perspective", "1000px");
      outlineOpen = !spatialSupported;
      clock = options.clock ?? {
        now: () => win.performance.now(),
        request: (callback) => win.requestAnimationFrame(callback),
        cancel: (id) => win.cancelAnimationFrame(id),
      };
      oldTabindex = host.getAttribute("tabindex");
      if (oldTabindex === null) host.tabIndex = 0;
      root = element("section", "sd-player");
      root.setAttribute("aria-label", doc.metadata.title || "SpatialDeck");
      const controls = element("div", "sd-access");
      const outlineToggle = element("button");
      outlineButton = outlineToggle;
      outlineToggle.type = "button";
      outlineToggle.textContent = "Vista testuale";
      outlineToggle.setAttribute("aria-expanded", String(outlineOpen));
      outlineToggle.disabled = !spatialSupported;
      const motionToggle = element("button");
      motionToggle.type = "button";
      motionToggle.textContent = "Riduci movimento";
      motionToggle.setAttribute("aria-pressed", String(manualReduced));
      controls.append(outlineToggle, motionToggle);
      const stage = element("div", "sd-stage");
      stageElement = stage;
      emptyMessage = element("p", "sd-empty");
      emptyMessage.textContent = "Nessuna scena nel percorso selezionato.";
      emptyMessage.hidden = true;
      stage.setAttribute("aria-label", "Presentazione spaziale");
      viewport = element("div", "sd-viewport");
      viewport.style.width = `${doc.settings.viewport.width}px`;
      viewport.style.height = `${doc.settings.viewport.height}px`;
      viewport.style.perspective = `${doc.settings.viewport.perspective}px`;
      world = element("div", "sd-world");
      viewport.append(world);
      stage.append(viewport);
      outline = element("ol", "sd-outline");
      outline.id = `sd-outline-${instanceId}`;
      outline.hidden = !outlineOpen;
      stage.hidden = outlineOpen;
      outlineToggle.setAttribute("aria-controls", outline.id);
      live = element("p", "sd-live");
      live.setAttribute("aria-live", "polite");
      live.setAttribute("aria-atomic", "true");
      for (const scene of doc.scenes) {
        const wrapper = element("div", "sd-scene");
        wrapper.dataset.sceneId = scene.id;
        wrapper.hidden = !scene.visible;
        const matrix = getWorldMatrix(doc, scene.id);
        if (matrix.ok)
          wrapper.style.transform = `matrix3d(${matrix.value.join(",")})`;
        const content = element("article", "sd-content");
        content.style.width = `${scene.size[0]}px`;
        content.style.height = `${scene.size[1]}px`;
        const title = element("h2");
        title.textContent = scene.title;
        title.tabIndex = -1;
        content.append(title);
        for (const block of scene.blocks) {
          const text = element("p");
          text.textContent = block.data.text;
          content.append(text);
        }
        wrapper.append(content);
        world.append(wrapper);
        scenes.set(scene.id, { wrapper, content, title });
      }
      root.append(controls, stage, outline, live, emptyMessage);
      host.append(root);
      const listen = (
        target: EventTarget,
        event: string,
        handler: EventListener,
      ) => {
        target.addEventListener(event, handler);
        cleanup.push(() => target.removeEventListener(event, handler));
      };
      const resize = () => {
        if (!host || !viewport || !doc) return;
        const bounds = stage.getBoundingClientRect();
        const fit = Math.min(
          bounds.width / doc.settings.viewport.width,
          bounds.height / doc.settings.viewport.height,
        );
        viewport.style.transform = `translate(-50%, -50%) scale(${fit})`;
      };
      machine = new NavigationMachine(
        doc,
        instanceId,
        () => clock!.now(),
        emit,
        render,
      );
      player.on("navigationstart", () => {
        if (focusRequested) {
          focusOrigin = host?.ownerDocument.activeElement ?? null;
          focusAllowed = true;
        }
      });
      player.on("scenechange", () => {
        if (focusRequested) {
          focusRequested = false;
          if (
            !focusAllowed ||
            (host?.ownerDocument.activeElement !== focusOrigin &&
              host?.ownerDocument.activeElement !== host?.ownerDocument.body)
          )
            return;
          if (outlineOpen)
            outline
              ?.querySelector<HTMLButtonElement>('[aria-current="true"]')
              ?.focus({ preventScroll: true });
          else if (state().sceneId)
            scenes.get(state().sceneId!)?.title.focus({ preventScroll: true });
        }
      });
      const applyMotion = () =>
        machine?.setReduced(
          outlineOpen ||
            manualReduced ||
            doc?.settings.presentation.motion === "reduced" ||
            media?.matches === true,
        );
      media = win.matchMedia("(prefers-reduced-motion: reduce)");
      listen(media, "change", applyMotion);
      listen(container.ownerDocument, "visibilitychange", () =>
        machine?.setHidden(container.ownerDocument.hidden),
      );
      listen(outlineToggle, "click", () => {
        outlineOpen = !outlineOpen;
        outline!.hidden = !outlineOpen;
        stage.hidden = outlineOpen;
        outlineToggle.setAttribute("aria-expanded", String(outlineOpen));
        applyMotion();
        render();
      });
      listen(motionToggle, "click", () => {
        manualReduced = !manualReduced;
        motionToggle.setAttribute("aria-pressed", String(manualReduced));
        applyMotion();
      });
      listen(outline, "click", (event) => {
        const button = (event.target as Element).closest<HTMLButtonElement>(
          "button[data-node-id]",
        );
        if (button?.dataset.nodeId) {
          focusRequested = true;
          void player.goTo({ nodeId: button.dataset.nodeId });
        }
      });
      if (options.input !== false)
        listen(container, "keydown", (event) => {
          const key = event as KeyboardEvent;
          if (
            key.defaultPrevented ||
            key.altKey ||
            key.ctrlKey ||
            key.metaKey ||
            key.shiftKey ||
            key
              .composedPath()
              .some(
                (target) =>
                  target instanceof win.Element &&
                  target.matches(
                    'input,textarea,select,[contenteditable]:not([contenteditable="false"]),audio,video,button,a',
                  ),
              )
          )
            return;
          const command = (options.keymap ?? {
            ArrowRight: "next",
            ArrowDown: "next",
            PageDown: "next",
            " ": "next",
            ArrowLeft: "prev",
            ArrowUp: "prev",
            PageUp: "prev",
          })[key.key];
          if (command) {
            key.preventDefault();
            focusRequested = true;
            void player[command]();
          }
        });
      const observer = new win.ResizeObserver(resize);
      observer.observe(stage);
      cleanup.push(() => observer.disconnect());
      applyMotion();
      machine.setHidden(container.ownerDocument.hidden);
      render();
      resize();
      emit("ready", { instanceId });
      return { ok: true, value: undefined, diagnostics: [] };
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      machine?.destroy();
      if (frame !== undefined) {
        clock?.cancel(frame);
        frame = undefined;
      }
      cleanup.splice(0).forEach((dispose) => dispose());
      root?.remove();
      if (host) {
        if (oldTabindex === null) host.removeAttribute("tabindex");
        else host.setAttribute("tabindex", oldTabindex);
      }
      emit("destroy", { instanceId });
      handlers.clear();
      scenes.clear();
      host = undefined;
      root = undefined;
      viewport = undefined;
      world = undefined;
      outline = undefined;
      live = undefined;
      emptyMessage = undefined;
      outlineButton = undefined;
      stageElement = undefined;
      focusOrigin = null;
      doc = undefined;
      media = undefined;
      clock = undefined;
    },
    goTo: (target, opts) =>
      machine ? invoke(() => machine!.goTo(target, opts)) : unavailable(),
    next: (opts) =>
      machine ? invoke(() => machine!.next(opts)) : unavailable(),
    prev: () => (machine ? invoke(() => machine!.prev()) : unavailable()),
    setPath: (pathId) =>
      machine ? invoke(() => machine!.setPath(pathId)) : unavailable(),
    getState: state,
    on(event, handler) {
      if (destroyed) return () => {};
      let set = handlers.get(event);
      if (!set) {
        set = new Set();
        handlers.set(event, set);
      }
      const wrapped = (payload: unknown) =>
        handler(payload as PlayerEvents[typeof event]);
      set.add(wrapped);
      return () => {
        set.delete(wrapped);
      };
    },
  };
  return player;
}
