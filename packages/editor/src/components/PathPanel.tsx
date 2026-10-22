import { useEffect, useState } from "react";
import { success } from "@spatialdeck/core";
import type { ProjectDocument, Result } from "@spatialdeck/core";
import {
  createPath,
  deletePath,
  editImpact,
  editPath,
  createNode,
  editNode,
  connectNodes,
  editEdge,
  removeGraphItem,
} from "../commands/index.js";
import type { DocumentEdit } from "../commands/index.js";
import type { EditorStore } from "../store/index.js";
import { CameraTimeline } from "./CameraTimeline.js";
import type { Capture } from "./CameraTimeline.js";
import { Numeric, TextField } from "./Inspector.js";
import { Dialog } from "./Dialog.js";
export interface NavigationSelection {
  pathId: string;
  nodeId: string;
}
export function PathPanel({
  store,
  document,
  onNavigation,
  onCapture,
}: {
  store: EditorStore;
  document: ProjectDocument;
  onNavigation: (selection: NavigationSelection | null) => void;
  onCapture: (capture: Capture | null) => void;
}) {
  const [pathId, setPathId] = useState(document.defaultPathId),
    [nodeId, setNodeId] = useState<string | null>(null),
    [edgeId, setEdgeId] = useState<string | null>(null),
    [sceneId, setSceneId] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [error, setError] = useState("");
  const [deletion, setDeletion] = useState<{
    edit: DocumentEdit;
    description: string;
  } | null>(null);
  const path =
    document.paths.find((p) => p.id === pathId) ??
    document.paths.find((p) => p.id === document.defaultPathId) ??
    document.paths[0];
  const node = path?.nodes.find((n) => n.id === nodeId) ?? path?.nodes[0],
    edge =
      path?.edges.find((e) => e.id === edgeId) ??
      path?.edges.find((e) => e.from === node?.id);
  const activePathId = path?.id,
    activeNodeId = node?.id,
    activeSceneId = node?.sceneId;
  useEffect(() => {
    onNavigation(
      activePathId && activeNodeId
        ? { pathId: activePathId, nodeId: activeNodeId }
        : null,
    );
    onCapture(null);
    if (activeSceneId && store.getSnapshot().selection !== activeSceneId)
      store.select(activeSceneId);
  }, [
    activePathId,
    activeNodeId,
    activeSceneId,
    onNavigation,
    onCapture,
    store,
  ]);
  const run = (edit: DocumentEdit): Result<void> => {
    const result = store.execute(edit);
    setError(
      result.ok ? "" : result.diagnostics.map((d) => d.message).join("; "),
    );
    if (result.ok) onCapture(null);
    return result;
  };
  const remove = (edit: DocumentEdit) => {
    const impact = editImpact(document, edit);
    if (impact.ok) setDeletion({ edit, description: impact.value.description });
    else setError(impact.diagnostics.map((d) => d.message).join("; "));
  };
  return (
    <details className="path-panel">
      <summary>
        Percorsi e connessioni <span>{document.paths.length}</span>
      </summary>
      <div className="structure-content">
        <label>
          Percorso
          <select
            aria-label="Percorso da modificare"
            value={path?.id ?? ""}
            onChange={(e) => {
              setPathId(e.target.value);
              setNodeId(null);
              setEdgeId(null);
            }}
          >
            <option value="" disabled>
              Scegli percorso
            </option>
            {document.paths.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            if (run(createPath()).ok)
              setPathId(store.getSnapshot().document.paths.at(-1)!.id);
          }}
        >
          Nuovo percorso
        </button>
        {path && (
          <>
            <TextField
              key={path.id}
              label="Nome percorso"
              value={path.name}
              apply={(name) => run(editPath(path.id, { name }))}
            />
            <button
              type="button"
              disabled={document.defaultPathId === path.id}
              onClick={() =>
                run((doc) => {
                  doc.defaultPathId = path.id;
                  return success(doc);
                })
              }
            >
              Usa come percorso principale
            </button>
            <button type="button" onClick={() => remove(deletePath(path.id))}>
              Elimina percorso
            </button>
            <label>
              Nodo iniziale
              <select
                aria-label="Nodo iniziale"
                value={path.startNodeId ?? ""}
                onChange={(e) =>
                  run(
                    editPath(path.id, { startNodeId: e.target.value || null }),
                  )
                }
              >
                <option value="">Vuoto</option>
                {path.nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {document.scenes.find((s) => s.id === n.sceneId)?.title} ·{" "}
                    {n.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </label>
            {path.loopPolicy ? (
              <>
                <Numeric
                  label="Limite visite per nodo"
                  value={path.loopPolicy.maxVisitsPerNode}
                  apply={(maxVisitsPerNode) =>
                    run(editPath(path.id, { loopPolicy: { maxVisitsPerNode } }))
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    run((doc) => {
                      delete doc.paths.find((p) => p.id === path.id)!
                        .loopPolicy;
                      return success(doc);
                    })
                  }
                >
                  Rimuovi policy loop
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() =>
                  run((doc) => {
                    const p = doc.paths.find((p) => p.id === path.id)!;
                    p.loopPolicy = { maxVisitsPerNode: 3 };
                    for (const e of p.edges) e.condition = { kind: "manual" };
                    return success(doc);
                  })
                }
              >
                Abilita loop manuale (3 visite)
              </button>
            )}
            <label>
              Visita da modificare
              <select
                aria-label="Visita da modificare"
                value={node?.id ?? ""}
                onChange={(e) => {
                  setNodeId(e.target.value);
                  setEdgeId(null);
                  const n = path.nodes.find((n) => n.id === e.target.value);
                  if (n) store.select(n.sceneId);
                }}
              >
                <option value="" disabled>
                  Nessun nodo
                </option>
                {path.nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {document.scenes.find((s) => s.id === n.sceneId)?.title} ·{" "}
                    {n.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </label>
            {node && (
              <>
                <Numeric
                  label="Sosta nodo ms"
                  value={node.holdMs}
                  apply={(holdMs) =>
                    run(editNode(path.id, node.id, { holdMs }))
                  }
                />
                <label>
                  Scena della visita
                  <select
                    aria-label="Scena della visita"
                    value={node.sceneId}
                    onChange={(e) =>
                      run(
                        editNode(path.id, node.id, { sceneId: e.target.value }),
                      )
                    }
                  >
                    {document.scenes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    remove(removeGraphItem(path.id, node.id, "node"))
                  }
                >
                  Elimina visita
                </button>
              </>
            )}
            <div className="structure-row">
              <label>
                Scena da aggiungere
                <select
                  aria-label="Scena da aggiungere al percorso"
                  value={sceneId || document.scenes[0]?.id || ""}
                  onChange={(e) => setSceneId(e.target.value)}
                >
                  {document.scenes
                    .filter((s) => s.visible)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                </select>
              </label>
              <button
                type="button"
                disabled={!document.scenes.length}
                onClick={() => {
                  if (
                    run(
                      createNode(
                        path.id,
                        sceneId || document.scenes[0]!.id,
                        node?.id,
                      ),
                    ).ok
                  )
                    setNodeId(
                      store
                        .getSnapshot()
                        .document.paths.find((p) => p.id === path.id)!
                        .nodes.at(-1)!.id,
                    );
                }}
              >
                Aggiungi visita
              </button>
            </div>
            <fieldset>
              <legend>Nuova connessione</legend>
              <div className="structure-row">
                {(["from", "to"] as const).map((kind) => (
                  <label key={kind}>
                    {kind === "from" ? "Da" : "A"}
                    <select
                      aria-label={
                        kind === "from" ? "Connessione da" : "Connessione a"
                      }
                      value={(kind === "from" ? from : to) || node?.id || ""}
                      onChange={(e) =>
                        (kind === "from" ? setFrom : setTo)(e.target.value)
                      }
                    >
                      {path.nodes.map((n) => (
                        <option key={n.id} value={n.id}>
                          {
                            document.scenes.find((s) => s.id === n.sceneId)
                              ?.title
                          }{" "}
                          · {n.id.slice(0, 8)}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
                <button
                  type="button"
                  disabled={!node}
                  onClick={() => {
                    if (
                      run(
                        connectNodes(path.id, from || node!.id, to || node!.id),
                      ).ok
                    )
                      setEdgeId(
                        store
                          .getSnapshot()
                          .document.paths.find((p) => p.id === path.id)!
                          .edges.at(-1)!.id,
                      );
                  }}
                >
                  Collega nodi
                </button>
              </div>
            </fieldset>
            <label>
              Connessione
              <select
                aria-label="Connessione da modificare"
                value={edge?.id ?? ""}
                onChange={(e) => setEdgeId(e.target.value)}
              >
                <option value="" disabled>
                  Nessuna connessione
                </option>
                {path.edges.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label || `${e.from.slice(0, 8)} → ${e.to.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </label>
            {edge && (
              <>
                <TextField
                  key={edge.id}
                  label="Etichetta scelta"
                  value={edge.label}
                  apply={(label) => run(editEdge(path.id, edge.id, { label }))}
                />
                <label>
                  Condizione
                  <select
                    aria-label="Condizione connessione"
                    value={edge.condition?.kind ?? "always"}
                    onChange={(e) =>
                      run((doc) => {
                        const item = doc.paths
                          .find((p) => p.id === path.id)!
                          .edges.find((e) => e.id === edge.id)!;
                        if (e.target.value === "always") delete item.condition;
                        else
                          item.condition =
                            e.target.value === "manual"
                              ? { kind: "manual" }
                              : { kind: "visit-limit", maxVisits: 3 };
                        return success(doc);
                      })
                    }
                  >
                    <option value="always">Avanzamento diretto</option>
                    <option value="manual">Scelta manuale</option>
                    <option value="visit-limit">Limite visite</option>
                  </select>
                </label>
                {edge.condition?.kind === "visit-limit" && (
                  <Numeric
                    label="Limite visite connessione"
                    value={edge.condition.maxVisits}
                    apply={(maxVisits) =>
                      run(
                        editEdge(path.id, edge.id, {
                          condition: { kind: "visit-limit", maxVisits },
                        }),
                      )
                    }
                  />
                )}
                <button
                  type="button"
                  onClick={() =>
                    remove(removeGraphItem(path.id, edge.id, "edge"))
                  }
                >
                  Elimina connessione
                </button>
              </>
            )}
            <CameraTimeline
              store={store}
              document={document}
              pathId={path.id}
              nodeId={node?.id ?? null}
              edgeId={edge?.id ?? null}
              run={run}
              onCapture={onCapture}
            />
          </>
        )}
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
      </div>
      {deletion && (
        <Dialog
          title="Eliminare struttura e riferimenti?"
          confirm="Elimina struttura"
          onCancel={() => setDeletion(null)}
          onConfirm={() => {
            run(deletion.edit);
            setDeletion(null);
          }}
        >
          <p>{deletion.description}</p>
        </Dialog>
      )}
    </details>
  );
}
