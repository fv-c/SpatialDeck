import type {
  ContentContext,
  ContentRenderer,
  RendererRegistry,
} from "@spatialdeck/player";
export interface EmbedPolicy {
  allowedOrigins: readonly string[];
}
export function registerNavigation(
  registry: RendererRegistry,
  policy: EmbedPolicy = { allowedOrigins: [] },
): () => void {
  const link = registry.register("link", () => {
    let host: HTMLElement, context: ContentContext;
    function update(next: ContentContext) {
      context = next;
      if (next.block.type !== "link") return;
      host.replaceChildren();
      const button = host.ownerDocument.createElement("button");
      button.type = "button";
      button.textContent = next.block.data.label;
      button.onclick = () => {
        if (context.block.type === "link")
          void context.services.navigate(context.block.data.target);
      };
      host.append(button);
    }
    return {
      mount(element, next) {
        host = element;
        update(next);
      },
      update,
      destroy() {
        host.replaceChildren();
      },
    };
  });
  const embed = registry.register("embed", (): ContentRenderer => {
    let host: HTMLElement,
      context: ContentContext,
      last = "",
      frame: HTMLIFrameElement | undefined;
    function update(next: ContentContext) {
      context = next;
      const b = next.block;
      if (b.type !== "embed" || JSON.stringify(b) === last) return;
      last = JSON.stringify(b);
      frame?.remove();
      host.replaceChildren();
      const status = host.ownerDocument.createElement("p");
      status.setAttribute("role", "status");
      const url = new URL(b.data.url),
        allowed = policy.allowedOrigins.includes(url.origin);
      status.textContent = allowed
        ? "Contenuto web esterno disattivato. Richiede rete e consenso."
        : "Embed disattivato: origine non autorizzata dall’host. Offline non disponibile.";
      host.append(status);
      if (allowed) {
        const button = host.ownerDocument.createElement("button");
        button.type = "button";
        button.textContent = `Consenti embed: ${b.data.title}`;
        button.onclick = () => {
          if (!host.ownerDocument.defaultView!.navigator.onLine) {
            status.textContent = "Embed non disponibile offline.";
            return;
          }
          if (context.signal.aborted) return;
          frame = host.ownerDocument.createElement("iframe");
          frame.title = b.data.title;
          frame.sandbox.value = "";
          frame.referrerPolicy = "no-referrer";
          frame.setAttribute("allow", "");
          frame.setAttribute(
            "csp",
            `default-src 'none'; img-src ${url.origin}; style-src 'unsafe-inline'; font-src ${url.origin}; script-src 'none'; object-src 'none'; form-action 'none'`,
          );
          frame.src = url.href;
          host.append(frame);
          button.disabled = true;
          status.textContent =
            "Embed isolato, script disabilitati. Rimuovi consenso per chiuderlo.";
          const revoke = host.ownerDocument.createElement("button");
          revoke.type = "button";
          revoke.textContent = "Rimuovi consenso embed";
          revoke.onclick = () => {
            frame?.remove();
            frame = undefined;
            button.disabled = false;
            revoke.remove();
            status.textContent = "Embed disattivato.";
          };
          host.append(revoke);
        };
        host.append(button);
      }
    }
    return {
      mount(element, next) {
        host = element;
        update(next);
      },
      update,
      destroy() {
        frame?.remove();
        host.replaceChildren();
      },
    };
  });
  return () => {
    link();
    embed();
  };
}
