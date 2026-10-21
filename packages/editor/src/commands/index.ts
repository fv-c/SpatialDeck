import { failure, success } from "@spatialdeck/core";
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
    schemaVersion: "1.0.0",
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
    const ordered: string[] = [];
    let next = path.startNodeId;
    while (next) {
      const node = path.nodes.find((n) => n.id === next)!;
      ordered.push(node.sceneId);
      next = path.edges.find((e) => e.from === next)?.to ?? null;
    }
    if (
      JSON.stringify(ordered) !==
      JSON.stringify(document.scenes.filter((s) => s.visible).map((s) => s.id))
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
    if (!path.ok) return path;
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
    sync(document, path.value);
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
export function deleteScene(sceneId: string): DocumentEdit {
  return (document) => {
    const impact = deleteImpact(document, sceneId);
    if (impact.length)
      return failure(
        "REFERENCED_SCENE",
        `Eliminazione rifiutata: la scena è usata anche in ${impact.join(", ")}.`,
      );
    const path = mainPath(document);
    if (!path.ok) return path;
    if (!document.scenes.some((s) => s.id === sceneId))
      return failure("SELECTION", "Scena assente.");
    document.scenes = document.scenes.filter((s) => s.id !== sceneId);
    sync(document, path.value);
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
