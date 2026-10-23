import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { Player } from "@spatialdeck/player";
import type { AssetBlobs } from "@spatialdeck/player";
import { serializeDocument, validateDocument } from "@spatialdeck/core";
import type { Result, ProjectDocument } from "@spatialdeck/core";
import {
  convertToFlow,
  createScene,
  editImpact,
  deleteScene,
  emptyProject,
} from "../commands/index.js";
import { EditorStore } from "../store/index.js";
import {
  Autosave,
  RecoveryRepository,
  openLimitError,
  pendingRecovery,
  readArchive,
  writeArchive,
  projectBlobs,
  mergeBlobs,
} from "../storage/index.js";
import type { Revision } from "../storage/index.js";
import { Dialog } from "./Dialog.js";
import { Inspector } from "./Inspector.js";
import { MapView } from "./MapView.js";
import { HierarchyTree } from "./HierarchyTree.js";
import { PathPanel } from "./PathPanel.js";
import type { NavigationSelection } from "./PathPanel.js";
import type { Capture } from "./CameraTimeline.js";
import { PlayerSurface } from "./PlayerSurface.js";
import { AssetPanel } from "./AssetPanel.js";
import { LayoutEditor } from "./LayoutEditor.js";
import { LayoutPanel } from "./LayoutPanel.js";
import { ThemePanel } from "./ThemePanel.js";
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
  const [library, setLibrary] = useState(new Map<string, Blob>());
  const libraryRef = useRef(library);
  libraryRef.current = library;
  const blobs = useMemo(
    () => projectBlobs(session.document, library),
    [session.document, library],
  );
  function loadBlobs(doc: ProjectDocument, incoming: AssetBlobs) {
    const next = mergeBlobs(libraryRef.current, doc, incoming);
    libraryRef.current = next;
    setLibrary(next);
  }
  const [warning, setWarning] = useState(""),
    [storageWarning, setStorageWarning] = useState<string | null>(null),
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
  const [navigation, setNavigation] = useState<NavigationSelection | null>(
      null,
    ),
    [capture, setCapture] = useState<Capture | null>(null);
  // Scene editor (Impagina): UI state only, never part of the document.
  const [layoutMode, setLayoutMode] = useState(false),
    [blockSelection, setBlockSelection] = useState<string[]>([]),
    [grid, setGrid] = useState(0),
    [announcement, setAnnouncement] = useState(""),
    [previewHost, setPreviewHost] = useState<HTMLDivElement | null>(null),
    [previewRevision, setPreviewRevision] = useState(0);
  const previewUnsubscribe = useRef<(() => void) | null>(null);
  const openButton = useRef<HTMLButtonElement>(null);
  const undoButton = useRef<HTMLButtonElement>(null),
    redoButton = useRef<HTMLButtonElement>(null);
  const file = useRef<HTMLInputElement>(null),
    presentButton = useRef<HTMLButtonElement>(null),
    presentation = useRef<HTMLDivElement>(null);
  const autosave = useMemo(
    () =>
      new Autosave(repository, new Map(), setWarning, (doc) =>
        projectBlobs(doc, libraryRef.current),
      ),
    [repository],
  );
  const selected = session.document.scenes.find(
    (s) => s.id === session.selection,
  );
  const layoutScene = layoutMode && preview ? selected : undefined;
  // Block selection belongs to one scene and drops blocks that no longer exist.
  useEffect(() => setBlockSelection([]), [session.selection, layoutMode]);
  useEffect(() => {
    setBlockSelection((ids) => {
      const kept = ids.filter((id) =>
        selected?.blocks.some((b) => b.id === id),
      );
      return kept.length === ids.length ? ids : kept;
    });
  }, [selected]);
  function previewPlayer(player: Player | null, present: boolean) {
    onPlayer?.(player, present);
    if (present) return;
    previewUnsubscribe.current?.();
    previewUnsubscribe.current = player
      ? player.on("documentchange", () => setPreviewRevision((n) => n + 1))
      : null;
  }
  function report(result: Result<unknown>) {
    setError(
      result.ok ? "" : result.diagnostics.map((d) => d.message).join("; "),
    );
  }
  useEffect(() => repository.onWarning(setStorageWarning), [repository]);
  useEffect(() => {
    autosave.resume();
    let active = true;
    void repository
      .heads()
      .then((heads) => {
        // Only revisions that differ from the last saved file are proposed.
        const pending = pendingRecovery(heads);
        if (active && pending.length) setRevisions(pending);
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
  }, [session.document, session.dirty, session.dragging, autosave, library]);
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
    const archive = input.name.endsWith(".spatialdeck");
    const limit = openLimitError(input);
    if (limit) {
      setError(limit);
      return;
    }
    try {
      const imported = archive ? await readArchive(input) : null;
      const valid = imported
        ? { ok: true as const, value: imported.document, diagnostics: [] }
        : validateDocument(await input.text());
      if (!valid.ok) {
        report(valid);
        return;
      }
      confirmReplace(() => {
        autosave.cancelPending();
        report(store.replace(valid.value));
        if (imported) loadBlobs(valid.value, imported.blobs);
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
    void autosave.flush(document, true);
  }
  async function savePortable() {
    const active = window.document.activeElement as HTMLElement | null;
    if (active?.matches("input,textarea,select")) active.blur();
    store.endDrag();
    const doc = store.getSnapshot().document;
    try {
      const blob = await writeArchive(
        doc,
        projectBlobs(doc, libraryRef.current),
      );
      const url = URL.createObjectURL(blob),
        link = window.document.createElement("a");
      link.href = url;
      link.download = `${doc.metadata.title.replace(/[^\p{L}\p{N}_-]/gu, "_") || "spatialdeck"}.spatialdeck`;
      window.document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      store.markSaved(doc);
      void autosave.flush(doc, true);
      setError("");
    } catch (e) {
      setError(`Salvataggio archivio non riuscito: ${String(e)}`);
    }
  }
  function remove() {
    if (!selected) return;
    const edit = deleteScene(selected.id, true);
    const impact = editImpact(session.document, edit);
    if (!impact.ok) {
      report(impact);
      return;
    }
    setDialog({
      title: "Eliminare la scena?",
      body: `“${selected.title}”: ${impact.value.description}`,
      confirm: "Elimina scena",
      action: () => report(store.execute(edit)),
    });
  }
  async function recoverList(reportEmpty = true) {
    try {
      setRecoveryIndex(0);
      const heads = await repository.heads();
      if (!heads.length) {
        setRevisions([]);
        if (reportEmpty) setError("Nessun recupero disponibile.");
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
  /** Local deletion always asks first; the open document and saved files are untouched. */
  function confirmDelete(project: boolean) {
    const target = revisions[recoveryIndex];
    if (!target) return;
    const title = target.document.metadata.title;
    setDialog({
      title: project
        ? "Eliminare il progetto locale?"
        : "Eliminare la revisione locale?",
      body: project
        ? `Tutte le revisioni locali di “${title}” e le risorse non più usate saranno rimosse da questo browser. Il documento aperto e i file salvati non cambiano.`
        : `La revisione ${target.revision} di “${title}” sarà rimossa da questo browser. Il documento aperto e i file salvati non cambiano.`,
      confirm: project ? "Elimina progetto" : "Elimina revisione",
      action: () =>
        void (async () => {
          try {
            const head = project
              ? (await repository.deleteProject(target.projectId), null)
              : await repository.deleteRevision(
                  target.projectId,
                  target.revision,
                );
            autosave.rebase(target.projectId, head?.revision ?? null);
            await recoverList(false);
          } catch (e) {
            setError(`Eliminazione non riuscita: ${String(e)}`);
          }
        })(),
    });
  }
  async function recover() {
    const revision = revisions[recoveryIndex];
    if (!revision) return;
    let recovered: Map<string, Blob>;
    try {
      recovered = await repository.blobs(revision);
    } catch (e) {
      setError(String(e));
      return;
    }
    setRevisions([]);
    confirmReplace(() => {
      autosave.cancelPending();
      const result = store.replace(revision.document, false);
      if (result.ok) loadBlobs(revision.document, recovered);
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
            SpatialDeck <small>STUDIO / 0.5</small>
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
          <button tabIndex={0} onClick={() => file.current?.click()}>
            Apri archivio
          </button>
          <button tabIndex={0} onClick={save}>
            Salva JSON
          </button>
          <button tabIndex={0} onClick={() => void savePortable()}>
            Salva archivio
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
          accept=".json,.spatialdeck,application/json,application/zip"
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
      {(storageWarning || warning) && (
        <div className="warning" role="status">
          {[storageWarning, warning].filter(Boolean).join(" ")}
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
                  store.coalesce("metadata.title", (document) => {
                    document.metadata.title = e.target.value;
                    return { ok: true, value: document, diagnostics: [] };
                  }),
                )
              }
              onBlur={() => store.endCoalesce()}
            />
          </label>
          <ol aria-label="Elenco scene">
            {session.document.scenes.map((scene, index) => (
              <li key={scene.id}>
                <button
                  tabIndex={0}
                  aria-pressed={scene.id === session.selection}
                  onClick={() => {
                    store.select(scene.id);
                    setNavigation(null);
                    setCapture(null);
                  }}
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
              onClick={() => {
                setNavigation(null);
                setCapture(null);
                report(
                  store.execute(
                    createScene(session.selection ?? undefined),
                    true,
                  ),
                );
              }}
            >
              + Nuova scena
            </button>
            <button
              tabIndex={0}
              disabled={!selected}
              onClick={() => {
                setNavigation(null);
                setCapture(null);
                report(
                  store.execute(
                    createScene(session.selection ?? undefined, true),
                    true,
                  ),
                );
              }}
            >
              Duplica scena
            </button>
            <button tabIndex={0} disabled={!selected} onClick={remove}>
              Elimina scena
            </button>
          </div>
          <HierarchyTree store={store} session={session} />
          <AssetPanel
            store={store}
            document={session.document}
            blobs={blobs}
            onBlobs={loadBlobs}
          />
          <p className="local-note">
            Locale, sul tuo dispositivo.
            <br />
            Salva un JSON per conservare il lavoro.
          </p>
        </details>
        <div className={`center-column ${layoutScene ? "is-layout" : ""}`}>
          <MapView store={store} session={session} />
          {preview && (
            <section
              className={`preview-panel ${layoutScene ? "is-layout" : ""}`}
              aria-label="Anteprima"
            >
              <div className="panel-heading">
                <h2>
                  Anteprima <span>PLAYER CONDIVISO</span>
                </h2>
                <span>{selected?.title ?? "Nessuna scena"}</span>
                <button
                  type="button"
                  tabIndex={0}
                  className="layout-toggle"
                  aria-pressed={layoutMode}
                  disabled={!selected}
                  onClick={() => {
                    store.endDrag();
                    setNavigation(null);
                    setCapture(null);
                    setLayoutMode(!layoutMode);
                    setAnnouncement(
                      layoutMode
                        ? "Impaginazione chiusa."
                        : "Impaginazione: scena inquadrata frontalmente.",
                    );
                  }}
                >
                  Impagina
                </button>
              </div>
              <div className="preview-stage">
                <PlayerSurface
                  document={session.document}
                  selection={session.selection}
                  navigation={layoutScene ? null : navigation}
                  capture={layoutScene ? null : capture}
                  blobs={blobs}
                  layout={!!layoutScene}
                  onHost={setPreviewHost}
                  onPlayer={previewPlayer}
                />
                {layoutScene && (
                  <LayoutEditor
                    store={store}
                    document={session.document}
                    scene={layoutScene}
                    host={previewHost}
                    revision={previewRevision}
                    selection={blockSelection}
                    onSelect={setBlockSelection}
                    grid={grid}
                    announce={setAnnouncement}
                  />
                )}
              </div>
            </section>
          )}
        </div>
        <details open className="inspector-panel">
          <summary>
            Inspector <span>{selected ? "SCENA" : "VUOTO"}</span>
          </summary>
          {layoutScene && (
            <LayoutPanel
              store={store}
              document={session.document}
              scene={layoutScene}
              host={previewHost}
              revision={previewRevision}
              selection={blockSelection}
              onSelect={setBlockSelection}
              grid={grid}
              onGrid={setGrid}
              announcement={announcement}
              announce={setAnnouncement}
              onFlow={() =>
                setDialog({
                  title: "Tornare a flow?",
                  body: `Le posizioni, le dimensioni, le rotazioni e i livelli di ${layoutScene.blocks.length} contenuti di “${layoutScene.title}” andranno persi; i contenuti tornano impilati nell’ordine di lettura. Annulla li ripristina.`,
                  confirm: "Torna a flow",
                  action: () => {
                    const result = store.execute(convertToFlow(layoutScene.id));
                    report(result);
                    if (result.ok)
                      setAnnouncement("Scena tornata a flow: frame rimossi.");
                  },
                })
              }
            />
          )}
          <Inspector store={store} scene={selected} />
          <PathPanel
            store={store}
            document={session.document}
            onNavigation={setNavigation}
            onCapture={setCapture}
          />
          <ThemePanel store={store} document={session.document} />
        </details>
      </div>
      <footer className="statusbar">
        <span>
          {session.dirty
            ? "● Modifiche da salvare in JSON"
            : "○ Documento salvato"}
        </span>
        <span>
          schema {session.document.schemaVersion} ·{" "}
          {session.document.scenes.length} scene · {session.historyLength}{" "}
          comandi
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
            blobs={blobs}
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
          <div className="recovery-actions">
            <button
              type="button"
              tabIndex={0}
              onClick={() => confirmDelete(false)}
            >
              Elimina revisione
            </button>
            <button
              type="button"
              tabIndex={0}
              onClick={() => confirmDelete(true)}
            >
              Elimina progetto locale
            </button>
          </div>
        </Dialog>
      )}
    </main>
  );
}
