/**
 * Browser bootstrap of every CLI output, compiled into one classic script
 * (IIFE) from the published player and plugins: the standalone HTML, the
 * static build and the capture page used for PDF and video. No editor, no
 * React, no network in the inline profile, no project code execution.
 */
import {
  createAssetResolver,
  createPlayer,
  defaultMessages,
  italianMessages,
} from "@spatialdeck/player";
import type {
  AssetResolver,
  ContentRenderer,
  Player,
  RendererFactory,
} from "@spatialdeck/player";
import { validateDocument } from "@spatialdeck/core";
import type { CapturePlan, ProjectDocument } from "@spatialdeck/core";
import { createBuiltinRegistry } from "@spatialdeck/plugins/builtins";
import type { RuntimeConfig } from "../config.js";

const read = (id: string): unknown => {
  const element = document.getElementById(id);
  if (!element?.textContent) throw new Error(`Missing ${id}`);
  return JSON.parse(element.textContent);
};
const bytes = (base64: string) =>
  Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

/** Static stand-in for content outside the output profile, declared in the manifest. */
function placeholder(kind: "excluded" | "poster"): RendererFactory {
  return (): ContentRenderer => {
    let host: HTMLElement;
    let done: Promise<void> = Promise.resolve();
    let release: (() => void) | undefined;
    return {
      mount(element, context) {
        host = element;
        const messages = context.messages ?? defaultMessages;
        const note = () => {
          const p = host.ownerDocument.createElement("p");
          p.className = "sd-export-placeholder";
          p.lang = messages.lang;
          p.textContent = messages.contentUnavailable(context.block.type);
          host.append(p);
        };
        const b = context.block;
        if (
          kind === "poster" &&
          b.type === "video" &&
          b.data.posterAssetId &&
          context.services.assets
        ) {
          const poster = b.data.posterAssetId;
          done = context.services.assets
            .resolve(poster, context.signal)
            .then(async (lease) => {
              release = () => lease.release();
              const img = host.ownerDocument.createElement("img");
              img.alt = b.data.alt;
              img.src = lease.url;
              host.append(img);
              await img.decode().catch(() => undefined);
            })
            .catch(note);
        } else note();
      },
      update() {},
      destroy() {
        release?.();
        host.replaceChildren();
      },
      ready: () => done,
    };
  };
}

async function start() {
  const config = read("spatialdeck-config") as RuntimeConfig;
  const stage = document.getElementById("spatialdeck-stage")!;
  let input: unknown, blobs: Map<string, Blob>;
  if (config.assets === "inline") {
    input = read("spatialdeck-project");
    const data = read("spatialdeck-assets") as Record<string, string>;
    const checked = validateDocument(input);
    if (!checked.ok) throw new Error(checked.diagnostics[0]!.message);
    blobs = new Map(
      checked.value.assets
        .filter((a) => typeof data[a.id] === "string")
        .map((a) => [a.id, new Blob([bytes(data[a.id]!)], { type: a.mime })]),
    );
    input = checked.value;
  } else {
    // Static build: same-origin files only (connect-src 'self'), verified by the resolver.
    const response = await fetch("project.json");
    input = await response.json();
    const checked = validateDocument(input);
    if (!checked.ok) throw new Error(checked.diagnostics[0]!.message);
    const files = (read("spatialdeck-files") as Record<string, string>) ?? {};
    blobs = new Map();
    await Promise.all(
      checked.value.assets.map(async (a) => {
        const name = files[a.id];
        if (!name) return;
        const file = await fetch(name);
        if (file.ok)
          blobs.set(a.id, new Blob([await file.blob()], { type: a.mime }));
      }),
    );
    input = checked.value;
  }
  const project = input as ProjectDocument;
  const builtins = createBuiltinRegistry({
    replace: Object.fromEntries(
      Object.entries(config.placeholders).map(([type, kind]) => [
        type,
        placeholder(kind),
      ]),
    ),
  });
  const assets: AssetResolver = createAssetResolver(project.assets, blobs);
  const capture = config.mode === "capture";
  const player: Player = createPlayer({
    registry: builtins.registry,
    assets,
    messages: config.messages === "it" ? italianMessages : defaultMessages,
    ...(capture
      ? { controls: false, input: false, motion: "reduced", muted: true }
      : {}),
  });
  const mounted = await player.mount(stage, project);
  if (!mounted.ok) throw new Error(mounted.diagnostics[0]!.message);
  if (capture)
    Object.assign(window, {
      spatialdeckCapture: {
        renderAt: (plan: CapturePlan, elapsedMs: number) =>
          player.renderAt(plan, elapsedMs),
      },
    });
  document.documentElement.dataset.spatialdeck = "ready";
}

start().catch((error: unknown) => {
  document.documentElement.dataset.spatialdeck = "error";
  const stage = document.getElementById("spatialdeck-stage");
  if (stage) {
    const p = document.createElement("p");
    p.setAttribute("role", "alert");
    p.textContent = `SpatialDeck: ${String(error)}`;
    stage.replaceChildren(p);
  }
});
