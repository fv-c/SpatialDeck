import {
  failure,
  success,
  reparentScene,
  updateCapabilities,
} from "@spatialdeck/core";
import type {
  ProjectDocument,
  Result,
  Scene,
  ScenePath,
} from "@spatialdeck/core";
export type DocumentEdit = (
  document: ProjectDocument,
) => Result<ProjectDocument>;
const id = () => globalThis.crypto.randomUUID();
export function emptyProject(): ProjectDocument {
  return {
    schemaVersion: "1.2.0",
    id: id(),
    metadata: { title: "Senza titolo", language: "it" },
    settings: {
      viewport: { width: 1280, height: 720, perspective: 1000 },
      presentation: {
        fit: "contain",
        motion: "system",
        defaultTransition: { durationMs: 600, easing: "ease-in-out" },
      },
    },
    requiredCapabilities: ["linear"],
    scenes: [],
    cameraTracks: [],
    cues: [],
    assets: [],
    paths: [],
    defaultPathId: null,
    extensions: {},
  };
}
function mainPath(document: ProjectDocument): Result<ScenePath> {
  let path = document.paths.find((p) => p.id === document.defaultPathId);
  if (!path) {
    path = {
      id: id(),
      name: "Principale",
      startNodeId: null,
      nodes: [],
      edges: [],
    };
    document.paths.push(path);
    document.defaultPathId = path.id;
  } else {
    if (
      path.loopPolicy ||
      path.edges.some(
        (e) =>
          e.condition ||
          e.cameraTrackId ||
          document.cues.some((c) => c.edgeId === e.id),
      )
    )
      return failure(
        "PATH_STRUCTURE",
        "Il percorso contiene dati strutturali: crea una scena indipendente e aggiungi la visita esplicitamente.",
      );
    const ordered: string[] = [];
    let next = path.startNodeId;
    const seen = new Set<string>();
    while (next && !seen.has(next)) {
      seen.add(next);
      const node = path.nodes.find((n) => n.id === next)!;
      ordered.push(node.sceneId);
      const exits = path.edges.filter((e) => e.from === next);
      if (exits.length > 1)
        return failure("PATH_ORDER", "Il percorso è ramificato.");
      next = exits[0]?.to ?? null;
    }
    if (
      next !== null ||
      JSON.stringify(ordered) !==
        JSON.stringify(
          document.scenes.filter((s) => s.visible).map((s) => s.id),
        )
    )
      return failure(
        "PATH_ORDER",
        "Il percorso principale non segue l’ordine delle scene o contiene visite ripetute. La modifica strutturale è rifiutata; contenuti e trasformazioni restano modificabili.",
      );
  }
  return success(path);
}
function sync(document: ProjectDocument, path: ScenePath) {
  const nodes = document.scenes
    .filter((s) => s.visible)
    .map(
      (s) =>
        path.nodes.find((n) => n.sceneId === s.id) ?? {
          id: id(),
          sceneId: s.id,
          holdMs: 0,
        },
    );
  path.edges = nodes.slice(1).map(
    (n, i) =>
      path.edges.find((e) => e.from === nodes[i]!.id && e.to === n.id) ?? {
        id: id(),
        from: nodes[i]!.id,
        to: n.id,
        label: "",
        transition: structuredClone(
          document.settings.presentation.defaultTransition,
        ),
      },
  );
  path.nodes = nodes;
  path.startNodeId = nodes[0]?.id ?? null;
}
export function createScene(afterId?: string, duplicate = false): DocumentEdit {
  return (document) => {
    const path = mainPath(document);
    const source = document.scenes.find((s) => s.id === afterId);
    if (duplicate && !source)
      return failure("SELECTION", "Selezionare una scena da duplicare.");
    const scene: Scene =
      source && duplicate
        ? {
            ...structuredClone(source),
            id: id(),
            title: `${source.title} — copia`,
            position: [
              source.position[0] + 120,
              source.position[1] + 120,
              source.position[2],
            ],
            blocks: source.blocks.map((b) => ({
              ...structuredClone(b),
              id: id(),
            })),
          }
        : {
            id: id(),
            parentId: null,
            title: `Scena ${document.scenes.length + 1}`,
            position: source
              ? [source.position[0] + 1000, source.position[1], 0]
              : [0, 0, 0],
            rotation: [0, 0, 0],
            scale: 1,
            size: [800, 450],
            visible: true,
            blocks: [
              { id: id(), type: "text", data: { text: "Scrivi la tua idea." } },
            ],
            notes: "",
            extensions: {},
          };
    const index = source
      ? document.scenes.indexOf(source) + 1
      : document.scenes.length;
    document.scenes.splice(index, 0, scene);
    if (path.ok) sync(document, path.value);
    return success(document);
  };
}
export function deleteImpact(
  document: ProjectDocument,
  sceneId: string,
): string[] {
  return document.paths
    .filter(
      (p) =>
        p.id !== document.defaultPathId &&
        p.nodes.some((n) => n.sceneId === sceneId),
    )
    .map(
      (p) =>
        `${p.name} (${p.nodes.filter((n) => n.sceneId === sceneId).length} riferimenti)`,
    );
}
export function deleteScene(sceneId: string, confirmed = false): DocumentEdit {
  return (document) => {
    const impact = deleteImpact(document, sceneId);
    if (impact.length && !confirmed)
      return failure(
        "REFERENCED_SCENE",
        `Eliminazione rifiutata: la scena è usata anche in ${impact.join(", ")}.`,
      );
    const path = mainPath(document);
    if (!document.scenes.some((s) => s.id === sceneId))
      return failure("SELECTION", "Scena assente.");
    for (const child of document.scenes.filter((s) => s.parentId === sceneId)) {
      const changed = reparentScene(
        document,
        child.id,
        document.scenes.find((s) => s.id === sceneId)!.parentId,
      );
      if (!changed.ok) return changed;
      document = changed.value;
    }
    document.scenes = document.scenes.filter((s) => s.id !== sceneId);
    if (path.ok && !impact.length)
      sync(
        document,
        document.paths.find((p) => p.id === path.value.id)!,
      );
    else
      for (const p of document.paths) {
        p.nodes = p.nodes.filter((n) => n.sceneId !== sceneId);
        prunePath(p);
      }
    const edges = new Set(
      document.paths.flatMap((p) => p.edges.map((e) => e.id)),
    );
    document.cues = document.cues.filter((c) => edges.has(c.edgeId));
    updateCapabilities(document);
    return success(document);
  };
}
export function editScene(
  sceneId: string,
  patch: Partial<Omit<Scene, "id">>,
): DocumentEdit {
  return (document) => {
    const scene = document.scenes.find((s) => s.id === sceneId);
    if (!scene) return failure("SELECTION", "Scena assente.");
    Object.assign(scene, structuredClone(patch));
    return success(document);
  };
}

/** Graph removals retain only visits reachable from the resulting start. UI previews this exact candidate. */
function prunePath(path: ScenePath): void {
  const ids = new Set(path.nodes.map((n) => n.id));
  path.edges = path.edges.filter((e) => ids.has(e.from) && ids.has(e.to));
  if (!path.startNodeId || !ids.has(path.startNodeId))
    path.startNodeId = path.nodes[0]?.id ?? null;
  const seen = new Set<string>(),
    stack = path.startNodeId ? [path.startNodeId] : [];
  while (stack.length) {
    const n = stack.pop()!;
    if (seen.has(n)) continue;
    seen.add(n);
    stack.push(...path.edges.filter((e) => e.from === n).map((e) => e.to));
  }
  path.nodes = path.nodes.filter((n) => seen.has(n.id));
  path.edges = path.edges.filter((e) => seen.has(e.from) && seen.has(e.to));
}
export function reparent(
  sceneId: string,
  parentId: string | null,
  preserveWorld = true,
): DocumentEdit {
  return (doc) => reparentScene(doc, sceneId, parentId, preserveWorld);
}
export function createPath(name = "Nuovo percorso"): DocumentEdit {
  return (doc) => {
    const path: ScenePath = {
      id: id(),
      name,
      startNodeId: null,
      nodes: [],
      edges: [],
    };
    doc.paths.push(path);
    doc.defaultPathId ??= path.id;
    return success(doc);
  };
}
export function editPath(
  pathId: string,
  patch: Partial<Omit<ScenePath, "id" | "nodes" | "edges">>,
): DocumentEdit {
  return (doc) => {
    const path = doc.paths.find((p) => p.id === pathId);
    if (!path) return failure("UNKNOWN_PATH", "Percorso assente.");
    Object.assign(path, structuredClone(patch));
    return success(doc);
  };
}
export function deletePath(pathId: string): DocumentEdit {
  return (doc) => {
    const path = doc.paths.find((p) => p.id === pathId);
    if (!path) return failure("UNKNOWN_PATH", "Percorso assente.");
    doc.paths = doc.paths.filter((p) => p.id !== pathId);
    if (doc.defaultPathId === pathId)
      doc.defaultPathId = doc.paths[0]?.id ?? null;
    const edges = new Set(doc.paths.flatMap((p) => p.edges.map((e) => e.id)));
    doc.cues = doc.cues.filter((c) => edges.has(c.edgeId));
    return success(doc);
  };
}
export function createNode(
  pathId: string,
  sceneId: string,
  fromId?: string,
): DocumentEdit {
  return (doc) => {
    const path = doc.paths.find((p) => p.id === pathId);
    if (!path) return failure("UNKNOWN_PATH", "Percorso assente.");
    const node = { id: id(), sceneId, holdMs: 0 };
    const from = fromId ?? path.nodes.at(-1)?.id;
    path.nodes.push(node);
    if (from)
      path.edges.push({
        id: id(),
        from,
        to: node.id,
        label: "",
        transition: structuredClone(
          doc.settings.presentation.defaultTransition,
        ),
      });
    path.startNodeId ??= node.id;
    return success(doc);
  };
}
export function editNode(
  pathId: string,
  nodeId: string,
  patch: Partial<Omit<ScenePath["nodes"][number], "id">>,
): DocumentEdit {
  return (doc) => {
    const node = doc.paths
      .find((p) => p.id === pathId)
      ?.nodes.find((n) => n.id === nodeId);
    if (!node) return failure("UNKNOWN_NODE", "Nodo assente.");
    Object.assign(node, structuredClone(patch));
    return success(doc);
  };
}
export function connectNodes(
  pathId: string,
  from: string,
  to: string,
): DocumentEdit {
  return (doc) => {
    const path = doc.paths.find((p) => p.id === pathId);
    if (!path) return failure("UNKNOWN_PATH", "Percorso assente.");
    path.edges.push({
      id: id(),
      from,
      to,
      label: "Nuova scelta",
      transition: structuredClone(doc.settings.presentation.defaultTransition),
      condition: { kind: "manual" },
    });
    return success(doc);
  };
}
export function editEdge(
  pathId: string,
  edgeId: string,
  patch: Partial<ScenePath["edges"][number]>,
): DocumentEdit {
  return (doc) => {
    const edge = doc.paths
      .find((p) => p.id === pathId)
      ?.edges.find((e) => e.id === edgeId);
    if (!edge) return failure("UNKNOWN_EDGE", "Connessione assente.");
    Object.assign(edge, structuredClone(patch));
    return success(doc);
  };
}
export function removeGraphItem(
  pathId: string,
  itemId: string,
  kind: "node" | "edge",
): DocumentEdit {
  return (doc) => {
    const path = doc.paths.find((p) => p.id === pathId);
    if (!path) return failure("UNKNOWN_PATH", "Percorso assente.");
    if (kind === "node") path.nodes = path.nodes.filter((n) => n.id !== itemId);
    else path.edges = path.edges.filter((e) => e.id !== itemId);
    prunePath(path);
    const edges = new Set(doc.paths.flatMap((p) => p.edges.map((e) => e.id)));
    doc.cues = doc.cues.filter((c) => edges.has(c.edgeId));
    return success(doc);
  };
}
export function editImpact(
  document: ProjectDocument,
  edit: DocumentEdit,
): Result<{ document: ProjectDocument; description: string }> {
  const result = edit(structuredClone(document));
  if (!result.ok) return result;
  const next = result.value;
  const nodes =
    document.paths.reduce((n, p) => n + p.nodes.length, 0) -
    next.paths.reduce((n, p) => n + p.nodes.length, 0);
  const edges =
    document.paths.reduce((n, p) => n + p.edges.length, 0) -
    next.paths.reduce((n, p) => n + p.edges.length, 0);
  const parents = document.scenes.filter(
    (s) =>
      s.parentId !== next.scenes.find((n) => n.id === s.id)?.parentId &&
      next.scenes.some((n) => n.id === s.id),
  ).length;
  return success({
    document: next,
    description: `${document.scenes.length - next.scenes.length} scene, ${document.paths.length - next.paths.length} percorsi, ${nodes} visite, ${edges} connessioni e ${document.cues.length - next.cues.length} cue rimossi; ${parents} figli ricollocati conservando la posa nel mondo. Le visite non più raggiungibili vengono rimosse. Annulla ripristina tutti i dati.`,
  });
}
