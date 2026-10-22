import type {
  AssetLease,
  ContentContext,
  ContentRenderer,
  RendererRegistry,
} from "@spatialdeck/player";
import { sanitizeContent } from "./security.js";
async function imageLease(
  host: HTMLElement,
  lease: AssetLease,
  prefix: string,
): Promise<AssetLease> {
  if (lease.mime !== "image/svg+xml") return lease;
  try {
    if (!lease.blob)
      throw new Error("SVG richiede il Blob originale per sanitizzazione.");
    const fragment = sanitizeContent(
      host,
      await lease.blob.text(),
      "svg",
      prefix,
    );
    const svg = fragment.querySelector("svg");
    if (!svg) throw new Error("SVG non valido.");
    const url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(svg)], {
        type: "image/svg+xml",
      }),
    );
    let released = false;
    return {
      url,
      mime: lease.mime,
      release() {
        if (!released) {
          released = true;
          URL.revokeObjectURL(url);
        }
      },
    };
  } finally {
    lease.release();
  }
}
function mediaRenderer(): ContentRenderer {
  let host: HTMLElement,
    context: ContentContext,
    element: HTMLMediaElement | undefined,
    status: HTMLElement,
    playButton: HTMLButtonElement | undefined,
    last = "",
    generation = 0,
    failedState = false;
  const leases: AssetLease[] = [];
  function clear() {
    generation++;
    failedState = false;
    if (element) {
      element.onerror = null;
      element.pause();
      element.removeAttribute("src");
      element.querySelectorAll("track").forEach((t) => t.remove());
      element.load();
      element = undefined;
    }
    leases.splice(0).forEach((l) => l.release());
    host.replaceChildren();
    playButton = undefined;
  }
  function message(text: string) {
    status.textContent = text;
    status.hidden = !text;
  }
  function failed(text: string) {
    failedState = true;
    message(text);
    if (!context.signal.aborted) context.services.mediaError?.(text);
  }
  async function play() {
    if (!element || !context.active) return;
    try {
      await element.play();
      if (!context.active) element.pause();
      else {
        failedState = false;
        message("");
      }
    } catch {
      if (!context.signal.aborted)
        failed(
          "Riproduzione rifiutata o codec non supportato. Usa Riproduci o associa un file compatibile.",
        );
    }
  }
  function active() {
    if (!element) return;
    if (playButton) playButton.disabled = !context.active;
    if (!context.active) {
      element.pause();
      if (
        (context.block.type === "audio" || context.block.type === "video") &&
        context.block.data.onExit === "stop"
      ) {
        try {
          element.currentTime = 0;
        } catch {
          /* Not loaded yet. */
        }
      }
    } else if (
      context.mediaEnabled &&
      (context.block.type === "audio" || context.block.type === "video") &&
      context.block.data.autoplay
    )
      void play();
  }
  async function build(token: number) {
    const block = context.block;
    if (!["image", "audio", "video"].includes(block.type)) return;
    if (
      block.type !== "image" &&
      block.type !== "audio" &&
      block.type !== "video"
    )
      return;
    const assets = context.services.assets;
    if (!assets) {
      failed(
        `Risorsa mancante: ${block.data.assetId}. Associa il file nel pannello Risorse.`,
      );
      return;
    }
    try {
      let lease = await assets.resolve(block.data.assetId, context.signal);
      if (block.type === "image")
        lease = await imageLease(host, lease, context.instanceId);
      if (context.signal.aborted || token !== generation) {
        lease.release();
        return;
      }
      leases.push(lease);
      if (block.type === "image") {
        const img = host.ownerDocument.createElement("img");
        img.alt = block.data.alt;
        img.style.objectFit = block.data.fit;
        img.src = lease.url;
        img.onerror = () => {
          if (!context.signal.aborted)
            failed("Immagine non decodificabile. Associa un file compatibile.");
        };
        host.prepend(img);
      } else {
        const media = host.ownerDocument.createElement(block.type);
        element = media;
        media.controls = true;
        media.preload = "metadata";
        media.loop = block.data.loop;
        media.muted = context.mediaMuted;
        media.setAttribute("aria-label", block.data.label);
        media.src = lease.url;
        media.onerror = () =>
          failed(
            "Media non decodificabile o codec non supportato. Associa un file compatibile.",
          );
        const button = host.ownerDocument.createElement("button");
        button.type = "button";
        button.textContent = `Riproduci ${block.data.label}`;
        button.onclick = () => void play();
        playButton = button;
        host.prepend(media);
        host.append(button);
        if (block.type === "video") {
          media.setAttribute("aria-description", block.data.alt);
          if (block.data.posterAssetId) {
            let poster = await assets.resolve(
              block.data.posterAssetId,
              context.signal,
            );
            poster = await imageLease(
              host,
              poster,
              context.instanceId + "-poster",
            );
            if (context.signal.aborted || token !== generation) {
              poster.release();
              return;
            }
            leases.push(poster);
            (media as HTMLVideoElement).poster = poster.url;
          }
          if (block.data.captionsAssetId) {
            const captions = await assets.resolve(
              block.data.captionsAssetId,
              context.signal,
            );
            if (context.signal.aborted || token !== generation) {
              captions.release();
              return;
            }
            leases.push(captions);
            const track = host.ownerDocument.createElement("track");
            track.kind = "captions";
            track.label = block.data.label;
            track.srclang = context.document.metadata.language;
            track.src = captions.url;
            track.default = true;
            media.append(track);
          }
        }
        active();
      }
      if (!failedState) message("");
    } catch (error) {
      if (!context.signal.aborted && token === generation)
        failed(String(error));
    }
  }
  function update(next: ContentContext) {
    const changed = JSON.stringify(next.block) !== last,
      wasEnabled = context?.mediaEnabled,
      wasActive = context?.active;
    context = next;
    if (changed) {
      clear();
      last = JSON.stringify(next.block);
      status = host.ownerDocument.createElement("p");
      status.setAttribute("role", "status");
      host.append(status);
      message("Caricamento risorsa locale…");
      void build(generation);
    } else if (wasActive !== next.active || wasEnabled !== next.mediaEnabled)
      active();
  }
  return {
    mount(element, next) {
      host = element;
      update(next);
    },
    update,
    destroy: clear,
  };
}
export function registerMedia(registry: RendererRegistry): () => void {
  const off = (["image", "audio", "video"] as const).map((type) =>
    registry.register(type, mediaRenderer),
  );
  return () => off.forEach((dispose) => dispose());
}
