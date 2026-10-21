import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { Player } from "@spatialdeck/player";
import { serializeDocument, validateDocument } from "@spatialdeck/core";
import type { Result } from "@spatialdeck/core";
import {
  createScene,
  deleteImpact,
  deleteScene,
  emptyProject,
} from "../commands/index.js";
import { EditorStore } from "../store/index.js";
import { Autosave, RecoveryRepository } from "../storage/index.js";
import type { Revision } from "../storage/index.js";
import { Dialog } from "./Dialog.js";
import { Inspector } from "./Inspector.js";
import { MapView } from "./MapView.js";
import { PlayerSurface } from "./PlayerSurface.js";
export interface StudioProps {
  store?: EditorStore;
  repository?: RecoveryRepository;
  onPlayer?: (player: Player | null, present: boolean) => void;
}
export function Studio({
  store: providedStore,
  repository: providedRepository,
  onPlayer,
}: StudioProps) {
  const store = useMemo(
    () => providedStore ?? new EditorStore(emptyProject()),
    [providedStore],
  );
  const repository = useMemo(
    () => providedRepository ?? new RecoveryRepository(),
    [providedRepository],
  );
  const session = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const [warning, setWarning] = useState(""),
    [error, setError] = useState(""),
    [present, setPresent] = useState(false),
    [preview, setPreview] = useState(true);
  const [dialog, setDialog] = useState<{
      title: string;
      body: string;
      action: () => void;
      confirm?: string;
    } | null>(null),
    [revisions, setRevisions] = useState<Revision[]>([]),
    [recoveryIndex, setRecoveryIndex] = useState(0);
  const openButton = useRef<HTMLButtonElement>(null);
  const undoButton = useRef<HTMLButtonElement>(null),
    redoButton = useRef<HTMLButtonElement>(null);
  const file = useRef<HTMLInputElement>(null),
    presentButton = useRef<HTMLButtonElement>(null),
    presentation = useRef<HTMLDivElement>(null);
  const autosave = useMemo(
    () => new Autosave(repository, new Map(), setWarning),
    [repository],
  );
  const selected = session.document.scenes.find(
    (s) => s.id === session.selection,
  );
  function report(result: Result<unknown>) {
    setError(
      result.ok ? "" : result.diagnostics.map((d) => d.message).join("; "),
    );
  }
  useEffect(() => {
    autosave.resume();
    let active = true;
    void repository
      .heads()
      .then((heads) => {
        if (active && heads.length) setRevisions(heads);
      })
      .catch((e) => {
        if (active)
          setWarning(`Recupero non disponibile: ${String(e)} Usa Salva JSON.`);
      });
    return () => {
      active = false;
      autosave.dispose();
      if (!providedRepository) void repository.close();
    };
  }, [repository, autosave, providedRepository]);
  useEffect(() => {
    if (session.dirty && !session.dragging) autosave.schedule(session.document);
  }, [session.document, session.dirty, session.dragging, autosave]);
  useEffect(() => {
    const flush = () => {
      const current = store.getSnapshot();
      if (document.hidden && current.dirty && !current.dragging)
        void autosave.flush(current.document);
    };
    document.addEventListener("visibilitychange", flush);
    const unload = (event: BeforeUnloadEvent) => {
      if (store.getSnapshot().dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", unload);
    return () => {
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("beforeunload", unload);
    };
  }, [autosave, store]);
  useEffect(() => {
    if (present) presentation.current?.focus();
    else presentButton.current?.focus({ preventScroll: true });
  }, [present]);
  function confirmReplace(action: () => void) {
    if (store.getSnapshot().dirty)
      setDialog({
        title: "Scartare le modifiche?",
        body: "Le modifiche non salvate nel file JSON saranno sostituite. Puoi annullare e salvare prima di continuare.",
        action,
      });
    else action();
  }
  async function openFile(input: File) {
    if (input.size > 10 * 1024 * 1024) {
      setError("Il file supera 10 MiB.");
      return;
    }
    try {
      const valid = validateDocument(await input.text());
      if (!valid.ok) {
        report(valid);
        return;
      }
      confirmReplace(() => {
        autosave.cancelPending();
        report(store.replace(valid.value));
        void repository
          .heads()
          .then((heads) => {
            const head = heads.find((h) => h.projectId === valid.value.id);
            if (
              head &&
              JSON.stringify(serializeDocument(head.document)) ===
                JSON.stringify(serializeDocument(valid.value))
            )
              autosave.setRevision(
                head.projectId,
                head.revision,
                head.document,
              );
            else if (head) {
              setWarning(
                "Esiste un recupero diverso per questo progetto. Apri Recupero per confrontare le revisioni; il file attivo resta intatto.",
              );
            }
          })
          .catch(() => {});
      });
    } catch (e) {
      setError(`Apertura non riuscita: ${String(e)}`);
    }
  }
  function save() {
    const active = window.document.activeElement as HTMLElement | null;
    if (active?.matches("input,textarea,select")) active.blur();
    store.endDrag();
    const document = store.getSnapshot().document;
    const serialized = store.serialize();
    if (!serialized.ok) {
      report(serialized);
      return;
    }
    const url = URL.createObjectURL(
      new Blob([serialized.value], { type: "application/json" }),
    );
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `${document.metadata.title.replace(/[^\p{L}\p{N}_-]/gu, "_") || "spatialdeck"}.json`;
    window.document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    store.markSaved(document);
    active?.focus({ preventScroll: true });
    void autosave.flush(document);
  }
  function remove() {
    if (!selected) return;
    const impact = deleteImpact(session.document, selected.id);
    if (impact.length) {
      setError(`Eliminazione rifiutata: ${impact.join(", ")}.`);
      return;
    }
    setDialog({
      title: "Eliminare la scena?",
      body: `“${selected.title}” sarà rimossa e il percorso principale ricucito. Annulla ripristinerà anche le transizioni originali.`,
      confirm: "Elimina scena",
      action: () => report(store.execute(deleteScene(selected.id))),
    });
  }
  async function recoverList() {
    try {
      setRecoveryIndex(0);
      const heads = await repository.heads();
      if (!heads.length) {
        setError("Nessun recupero disponibile.");
        return;
      }
      const all = (
        await Promise.all(heads.map((h) => repository.revisions(h.projectId)))
      ).flat();
      setRevisions(all);
    } catch (e) {
      setWarning(String(e));
    }
  }
  function recover() {
    const revision = revisions[recoveryIndex];
    if (!revision) return;
    setRevisions([]);
    confirmReplace(() => {
      autosave.cancelPending();
      const result = store.replace(revision.document, false);
      report(result);
      if (result.ok)
        autosave.setRevision(
          revision.projectId,
          revision.revision,
          revision.document,
        );
    });
  }
  return (
    <main
      className={`studio ${present ? "is-presenting" : ""}`}
      onKeyDown={(event) => {
        if (event.key === "Escape" && present) {
          setPresent(false);
          return;
        }
        if (present || dialog || revisions.length) return;
        const editing = (event.target as Element).matches(
          "input,textarea,select,[contenteditable]",
        );
        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === "s"
        ) {
          event.preventDefault();
          save();
        } else if (
          (event.ctrlKey || event.metaKey) &&
          !editing &&
          event.key.toLowerCase() === "z"
        ) {
          event.preventDefault();
          if (event.shiftKey) store.redo();
          else store.undo();
        } else if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === "o"
        ) {
          event.preventDefault();
          file.current?.click();
        } else if (
          !editing &&
          (event.key === "Delete" || event.key === "Backspace")
        ) {
          event.preventDefault();
          remove();
        }
      }}
    >
      <header className="toolbar">
        <div className="brand">
          <span className="brand-mark">S↗</span>
          <span>
            SpatialDeck <small>STUDIO / 0.2</small>
          </span>
        </div>
        <nav aria-label="Strumenti documento">
          <button
            tabIndex={0}
            onClick={() =>
              confirmReplace(() => {
                autosave.cancelPending();
                report(store.replace(emptyProject()));
                setWarning("");
              })
            }
          >
            Nuovo
          </button>
          <button
            tabIndex={0}
            ref={openButton}
            onClick={() => file.current?.click()}
          >
            Apri JSON
          </button>
          <button tabIndex={0} onClick={save}>
            Salva JSON
          </button>
          <span className="toolbar-divider" />
          <button
            tabIndex={0}
            ref={undoButton}
            disabled={!session.canUndo}
            onClick={() => {
              store.undo();
              if (!store.getSnapshot().canUndo) redoButton.current?.focus();
            }}
            aria-label="Annulla"
          >
            ↶ Annulla
          </button>
          <button
            tabIndex={0}
            ref={redoButton}
            disabled={!session.canRedo}
            onClick={() => {
              store.redo();
              if (!store.getSnapshot().canRedo) undoButton.current?.focus();
            }}
            aria-label="Ripristina"
          >
            ↷ Ripristina
          </button>
          <button tabIndex={0} onClick={() => void recoverList()}>
            Recupero
          </button>
          <button
            tabIndex={0}
            aria-pressed={preview}
            onClick={() => setPreview(!preview)}
          >
            Anteprima
          </button>
          <button
            tabIndex={0}
            ref={presentButton}
            className="primary"
            onClick={() => {
              store.endDrag();
              setPresent(true);
            }}
            disabled={!session.document.scenes.length}
          >
            Presenta ↗
          </button>
        </nav>
        <input
          ref={file}
          type="file"
          accept=".json,application/json"
          aria-label="File progetto JSON"
          className="file-input"
          onChange={(e) => {
            const input = e.target.files?.[0];
            e.target.value = "";
            if (input)
              void openFile(input).finally(() =>
                openButton.current?.focus({ preventScroll: true }),
              );
          }}
        />
      </header>
      {warning && (
        <div className="warning" role="status">
          {warning}
        </div>
      )}
      {error && (
        <div className="error-banner" role="alert">
          {error}
          <button
            tabIndex={0}
            aria-label="Chiudi errore"
            onClick={() => setError("")}
          >
            ×
          </button>
        </div>
      )}
      <div className="workspace">
        <details open className="scene-panel">
          <summary>
            Scene <span>{session.document.scenes.length}</span>
          </summary>
          <label className="project-title">
            Titolo progetto
            <input
              aria-label="Titolo progetto"
              value={session.document.metadata.title}
              onChange={(e) =>
                report(
                  store.execute((document) => {
                    document.metadata.title = e.target.value;
                    return { ok: true, value: document, diagnostics: [] };
                  }),
                )
              }
            />
          </label>
          <ol aria-label="Elenco scene">
            {session.document.scenes.map((scene, index) => (
              <li key={scene.id}>
                <button
                  tabIndex={0}
                  aria-pressed={scene.id === session.selection}
                  onClick={() => store.select(scene.id)}
                >
                  <span className="scene-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>
                    {scene.title || "Senza titolo"}
                    <small>{scene.position.map(Math.round).join(" / ")}</small>
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <div className="scene-actions">
            <button
              tabIndex={0}
              className="primary"
              onClick={() =>
                report(
                  store.execute(
                    createScene(session.selection ?? undefined),
                    true,
                  ),
                )
              }
            >
              + Nuova scena
            </button>
            <button
              tabIndex={0}
              disabled={!selected}
              onClick={() =>
                report(
                  store.execute(
                    createScene(session.selection ?? undefined, true),
                    true,
                  ),
                )
              }
            >
              Duplica scena
            </button>
            <button tabIndex={0} disabled={!selected} onClick={remove}>
              Elimina scena
            </button>
          </div>
          <p className="local-note">
            Locale, sul tuo dispositivo.
            <br />
            Salva un JSON per conservare il lavoro.
          </p>
        </details>
        <div className="center-column">
          <MapView store={store} session={session} />
          {preview && (
            <section className="preview-panel" aria-label="Anteprima">
              <div className="panel-heading">
                <h2>
                  Anteprima <span>PLAYER CONDIVISO</span>
                </h2>
                <span>{selected?.title ?? "Nessuna scena"}</span>
              </div>
              <PlayerSurface
                document={session.document}
                selection={session.selection}
                {...(onPlayer ? { onPlayer } : {})}
              />
            </section>
          )}
        </div>
        <details open className="inspector-panel">
          <summary>
            Inspector <span>{selected ? "SCENA" : "VUOTO"}</span>
          </summary>
          <Inspector store={store} scene={selected} />
        </details>
      </div>
      <footer className="statusbar">
        <span>
          {session.dirty
            ? "● Modifiche da salvare in JSON"
            : "○ Documento salvato"}
        </span>
        <span>
          schema 1.0.0 · {session.document.scenes.length} scene ·{" "}
          {session.historyLength} comandi
        </span>
      </footer>
      {present && (
        <div
          className="presentation"
          ref={presentation}
          tabIndex={-1}
          role="region"
          aria-label="Modalità presentazione"
        >
          <div className="present-controls">
            <button tabIndex={0} onClick={() => setPresent(false)}>
              Torna all’editor
            </button>
            <span>Frecce per navigare · Escape per tornare</span>
          </div>
          <PlayerSurface
            document={session.document}
            selection={null}
            present
            {...(onPlayer ? { onPlayer } : {})}
          />
        </div>
      )}
      {dialog && (
        <Dialog
          title={dialog.title}
          {...(dialog.confirm ? { confirm: dialog.confirm } : {})}
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            dialog.action();
            setDialog(null);
          }}
        >
          <p>{dialog.body}</p>
        </Dialog>
      )}
      {!!revisions.length && !dialog && (
        <Dialog
          title="Recupero locale disponibile"
          confirm="Recupera revisione"
          onCancel={() => {
            setRevisions([]);
            setRecoveryIndex(0);
          }}
          onConfirm={recover}
        >
          <p>
            Scegli una revisione dell’autosave. Il file originale resta intatto.
            Il recupero non è un backup.
          </p>
          <label>
            Revisione
            <select
              aria-label="Revisione da recuperare"
              value={recoveryIndex}
              onChange={(e) => setRecoveryIndex(Number(e.target.value))}
            >
              {revisions.map((r, index) => (
                <option key={`${r.projectId}-${r.revision}`} value={index}>
                  {r.document.metadata.title} · rev. {r.revision} ·{" "}
                  {new Date(r.updatedAt).toLocaleString()} ·{" "}
                  {r.document.scenes.length} scene
                </option>
              ))}
            </select>
          </label>
          <p>
            Attivo: {session.document.metadata.title},{" "}
            {session.document.scenes.length} scene. Recupero:{" "}
            {revisions[recoveryIndex]?.document.scenes.length} scene.
          </p>
        </Dialog>
      )}
    </main>
  );
}
