import { useCallback, useEffect, useRef, useState } from "react";
import {
  createAssetResolver,
  createPlayer,
  italianMessages,
} from "@spatialdeck/player";
import type {
  AssetBlobs,
  NavigationRequest,
  Player,
} from "@spatialdeck/player";
import {
  createPresenterSession,
  publicWindowName,
} from "@spatialdeck/player/presenter";
import type {
  PresenterCommand,
  PresenterSession,
} from "@spatialdeck/player/presenter";
import { createBuiltinRegistry } from "@spatialdeck/plugins/builtins";
import type { PluginDefinition } from "@spatialdeck/plugins";
import { publicDocument } from "@spatialdeck/core";
import type { Choice, ProjectDocument } from "@spatialdeck/core";

export const PRESENTER_SESSION_KEY = "spatialdeck-presenter-session";
/** Opens the public window on the user's gesture; null when a blocker refuses it. */
export function openPublicWindow(sessionId: string): Window | null {
  return window.open(
    `present.html#session=${sessionId}`,
    publicWindowName(sessionId),
    "popup,width=1280,height=760",
  );
}
/**
 * After this tab reloads, finds the public window of the session again by its
 * name (on the user's click). A blank window means it no longer exists: it is
 * closed and the console offers to open a new one.
 */
export function findPublicWindow(sessionId: string): Window | null {
  const found = window.open("", publicWindowName(sessionId));
  if (!found) return null;
  try {
    if (found.location.href !== "about:blank") return found;
  } catch {
    /* Not ours: treat as absent. */
  }
  found.close();
  return null;
}
const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
/**
 * Presenter console: the only navigation authority. Its previews are muted;
 * audio plays only in the public window. Notes come from the authored
 * document and never enter a message, a public DOM or a public renderer.
 */
export function PresenterView({
  document,
  blobs,
  plugins,
  sessionId,
  popup,
  onClose,
  onSingleWindow,
}: {
  document: ProjectDocument;
  blobs: AssetBlobs;
  plugins: readonly PluginDefinition[];
  sessionId: string;
  popup: Window | null;
  onClose: () => void;
  onSingleWindow: () => void;
}) {
  const currentHost = useRef<HTMLDivElement>(null),
    nextHost = useRef<HTMLDivElement>(null);
  const controller = useRef<Player | null>(null),
    session = useRef<PresenterSession | null>(null),
    run = useRef<(request: NavigationRequest) => void>(() => {});
  const [nodeId, setNodeId] = useState<string | null>(null),
    [choices, setChoices] = useState<Choice[]>([]),
    [connected, setConnected] = useState(false),
    [blocked, setBlocked] = useState(popup === null),
    [elapsed, setElapsed] = useState(0),
    [running, setRunning] = useState(false);
  const timer = useRef({ started: 0, accumulated: 0 });
  const initial = useRef({ document, blobs, plugins, popup });
  useEffect(() => {
    const { document: doc, blobs: files, plugins: approved } = initial.current;
    const assets = createAssetResolver(doc.assets, files);
    const registries = [
      createBuiltinRegistry({ plugins: approved }),
      createBuiltinRegistry({ plugins: approved }),
    ];
    const current = createPlayer({
      messages: italianMessages,
      registry: registries[0]!.registry,
      assets,
      muted: true,
      input: false,
      // Its own choice and outline buttons go through the session too.
      delegate: (request) => run.current(request),
    });
    const next = createPlayer({
      messages: italianMessages,
      registry: registries[1]!.registry,
      assets,
      muted: true,
      input: false,
      motion: "reduced",
      controls: false,
    });
    controller.current = current;
    let disposed = false;
    const refresh = () => {
      const state = current.getState();
      setNodeId(state.nodeId);
      const options = state.choices.filter((c) => !c.disabledReason);
      setChoices(state.choices);
      const path = doc.paths.find((p) => p.id === state.pathId);
      const edge =
        options.length === 1
          ? path?.edges.find((e) => e.id === options[0]!.edgeId)
          : undefined;
      // Preview the next visit only when `next` would not ask for a choice.
      if (path && edge && edge.condition?.kind !== "manual")
        void next.goTo({ pathId: path.id, nodeId: edge.to }, { durationMs: 0 });
    };
    const send = (command: PresenterCommand) => session.current?.send(command);
    run.current = (request) => {
      const state = current.getState();
      if (request.kind === "prev") {
        send({ kind: "prev" });
        void current.prev();
      } else if (request.kind === "next") {
        send(
          request.edgeId
            ? { kind: "next", edgeId: request.edgeId }
            : { kind: "next" },
        );
        void current.next(request.edgeId ? { edgeId: request.edgeId } : {});
      } else if (state.pathId) {
        send({ kind: "goTo", pathId: state.pathId, nodeId: request.nodeId });
        void current.goTo({ pathId: state.pathId, nodeId: request.nodeId });
      }
    };
    current.on("scenechange", refresh);
    current.on("choice", refresh);
    void Promise.all([
      current.mount(currentHost.current!, doc),
      next.mount(nextHost.current!, doc),
    ]).then(() => {
      if (disposed) return;
      refresh();
      session.current = createPresenterSession({
        window,
        sessionId,
        popup: initial.current.popup,
        snapshot: () => {
          const state = current.getState();
          return {
            document: publicDocument(doc),
            assets: Object.fromEntries(
              doc.assets.flatMap((a) => {
                const blob = files.get(a.id);
                return blob ? [[a.id, blob]] : [];
              }),
            ),
            pathId: state.pathId,
            visits: state.history.map((v) => v.nodeId),
          };
        },
        onRequest: (request) => run.current(request),
        onConnection: (value) => {
          setConnected(value);
          if (value) setBlocked(false);
        },
      });
    });
    return () => {
      disposed = true;
      session.current?.dispose();
      session.current = null;
      current.destroy();
      next.destroy();
      registries.forEach((r) => r.plugins.destroy());
      controller.current = null;
    };
  }, [sessionId]);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(
      () =>
        setElapsed(
          timer.current.accumulated + performance.now() - timer.current.started,
        ),
      250,
    );
    return () => window.clearInterval(id);
  }, [running]);
  const toggleTimer = () => {
    const t = timer.current;
    if (running) {
      t.accumulated += performance.now() - t.started;
      setElapsed(t.accumulated);
    } else t.started = performance.now();
    setRunning(!running);
  };
  const resetTimer = () => {
    timer.current = { started: performance.now(), accumulated: 0 };
    setElapsed(0);
  };
  const end = useCallback(() => {
    session.current?.close();
    popup?.close();
    sessionStorage.removeItem(PRESENTER_SESSION_KEY);
    onClose();
  }, [popup, onClose]);
  const retry = () => {
    const opened = openPublicWindow(sessionId);
    if (opened) {
      session.current?.attach(opened);
      setBlocked(false);
    }
  };
  const node = document.paths
    .flatMap((p) => p.nodes)
    .find((n) => n.id === nodeId);
  const scene = document.scenes.find((s) => s.id === node?.sceneId);
  const eligible = choices.filter((c) => !c.disabledReason);
  return (
    <div
      className="presenter"
      role="region"
      aria-label="Vista relatore"
      tabIndex={-1}
      onKeyDown={(event) => {
        if ((event.target as Element).matches("input,textarea,select,button"))
          return;
        const command = {
          ArrowRight: "next",
          PageDown: "next",
          " ": "next",
          ArrowLeft: "prev",
          PageUp: "prev",
        }[event.key] as "next" | "prev" | undefined;
        if (command) {
          event.preventDefault();
          run.current({ kind: command });
        }
      }}
    >
      <header className="presenter-bar">
        <h2>Vista relatore</h2>
        <p role="status" className={connected ? "is-connected" : ""}>
          {connected
            ? "Finestra pubblica collegata"
            : blocked
              ? "Finestra pubblica non aperta"
              : "In attesa della finestra pubblica…"}
        </p>
        <div className="presenter-timer">
          <output aria-label="Tempo trascorso">{clock(elapsed)}</output>
          <button type="button" tabIndex={0} onClick={toggleTimer}>
            {running ? "Pausa" : "Avvia"}
          </button>
          <button type="button" tabIndex={0} onClick={resetTimer}>
            Azzera
          </button>
        </div>
        <button type="button" tabIndex={0} onClick={end}>
          Termina
        </button>
      </header>
      {blocked && (
        <div className="presenter-blocked" role="alert">
          <p>
            Il browser ha bloccato la finestra pubblica. Consenti i popup per
            questo sito e riprova, oppure presenta in questa scheda (senza note
            né anteprime).
          </p>
          <button type="button" tabIndex={0} onClick={retry}>
            Riprova ad aprire
          </button>
          <button type="button" tabIndex={0} onClick={onSingleWindow}>
            Presenta in questa scheda
          </button>
        </div>
      )}
      <div className="presenter-grid">
        <section aria-label="Scena corrente" className="presenter-current">
          <h3>{scene?.title ?? "—"}</h3>
          <div ref={currentHost} className="presenter-player" />
        </section>
        <section aria-label="Successiva" className="presenter-next">
          <h3>Successiva</h3>
          <div
            ref={nextHost}
            className="presenter-player"
            hidden={eligible.length !== 1}
          />
          {eligible.length > 1 && (
            <ul className="presenter-choices" aria-label="Scelte del ramo">
              {eligible.map((c) => (
                <li key={c.edgeId}>
                  <button
                    type="button"
                    tabIndex={0}
                    onClick={() =>
                      run.current({ kind: "next", edgeId: c.edgeId })
                    }
                  >
                    {c.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {eligible.length === 0 && <p>Fine del percorso.</p>}
        </section>
        <section aria-label="Note del relatore" className="presenter-notes">
          <h3>Note</h3>
          <p>{scene?.notes || "Nessuna nota per questa scena."}</p>
        </section>
      </div>
      <nav className="presenter-nav" aria-label="Navigazione relatore">
        <button
          type="button"
          tabIndex={0}
          onClick={() => run.current({ kind: "prev" })}
        >
          Indietro
        </button>
        <button
          type="button"
          tabIndex={0}
          onClick={() => run.current({ kind: "next" })}
        >
          Avanti
        </button>
      </nav>
    </div>
  );
}
