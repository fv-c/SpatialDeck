import type { Diagnostic, ProjectDocument, ScenePath } from "./index.js";
import { diagnostic } from "./index.js";
import {
  getWorldMatrix,
  cameraPose,
  resolveSceneCamera,
  validCamera,
} from "../math/index.js";
import { resolveCameraTrack, trackWithinRange } from "../timing/index.js";
/** Iterative SCCs keep even a 5,000-node imported path off the call stack. */
export function graphComponents(path: ScenePath): Map<string, number> {
  const outgoing = new Map(path.nodes.map((n) => [n.id, [] as string[]]));
  const incoming = new Map(path.nodes.map((n) => [n.id, [] as string[]]));
  for (const e of path.edges) {
    outgoing.get(e.from)?.push(e.to);
    incoming.get(e.to)?.push(e.from);
  }
  const seen = new Set<string>(),
    order: string[] = [];
  for (const n of path.nodes) {
    const stack: Array<[string, boolean]> = [[n.id, false]];
    while (stack.length) {
      const [id, done] = stack.pop()!;
      if (done) {
        order.push(id);
        continue;
      }
      if (seen.has(id)) continue;
      seen.add(id);
      stack.push([id, true]);
      for (const next of outgoing.get(id) ?? [])
        if (!seen.has(next)) stack.push([next, false]);
    }
  }
  const components = new Map<string, number>();
  let index = 0;
  for (const id of order.reverse()) {
    if (components.has(id)) continue;
    const stack = [id];
    while (stack.length) {
      const next = stack.pop()!;
      if (components.has(next)) continue;
      components.set(next, index);
      stack.push(
        ...(incoming.get(next) ?? []).filter((x) => !components.has(x)),
      );
    }
    index++;
  }
  return components;
}
export function usesStructure(doc: ProjectDocument): boolean {
  if (
    doc.cameraTracks.length ||
    doc.cues.length ||
    doc.scenes.some((s) => s.parentId !== null)
  )
    return true;
  return doc.paths.some((path) => {
    if (
      path.loopPolicy ||
      path.nodes.some((n) => n.camera) ||
      path.edges.some((e) => e.condition || e.cameraTrackId)
    )
      return true;
    const outgoing = new Set<string>(),
      incoming = new Set<string>();
    for (const edge of path.edges) {
      if (outgoing.has(edge.from) || incoming.has(edge.to)) return true;
      outgoing.add(edge.from);
      incoming.add(edge.to);
    }
    return false;
  });
}
/** Commands call this after editing; opening an underdeclared document is an error. */
export function updateCapabilities(doc: ProjectDocument): void {
  doc.requiredCapabilities = [
    "linear",
    ...(usesStructure(doc) ? ["structure" as const] : []),
  ];
}
export function validateStructure(doc: ProjectDocument): Diagnostic[] {
  const errors: Diagnostic[] = [];
  const add = (code: string, message: string, pointer: string) =>
    errors.push(diagnostic(code, message, pointer));
  const scenes = new Map(doc.scenes.map((s) => [s.id, s]));
  doc.scenes.forEach((s, i) => {
    let current: typeof s | undefined = s;
    const seen = new Set<string>();
    while (current) {
      if (seen.has(current.id)) {
        add("PARENT_CYCLE", "Parent cycle", `/scenes/${i}/parentId`);
        break;
      }
      seen.add(current.id);
      if (seen.size > 32) {
        add(
          "PARENT_DEPTH",
          "Hierarchy exceeds 32 levels",
          `/scenes/${i}/parentId`,
        );
        break;
      }
      if (current.parentId === null) break;
      const parent = scenes.get(current.parentId);
      if (!parent) {
        add("MISSING_PARENT", "Unknown parent", `/scenes/${i}/parentId`);
        break;
      }
      current = parent;
    }
  });
  if (!errors.length)
    for (const [i, s] of doc.scenes.entries()) {
      const w = getWorldMatrix(doc, s.id);
      if (!w.ok)
        errors.push(
          ...w.diagnostics.map((d) => ({ ...d, pointer: `/scenes/${i}` })),
        );
    }
  const visible = (id: string) => {
    const seen = new Set<string>();
    let scene = scenes.get(id);
    while (scene) {
      if (!scene.visible || seen.has(scene.id)) return false;
      seen.add(scene.id);
      if (scene.parentId === null) return true;
      scene = scenes.get(scene.parentId);
    }
    return false;
  };
  const trackIds = new Set(doc.cameraTracks.map((t) => t.id));
  const edgeIds = new Set<string>(),
    cueEdgeIds = new Set(doc.cues.map((c) => c.edgeId));
  doc.paths.forEach((p, i) => {
    const base = `/paths/${i}`;
    const nodes = new Set(p.nodes.map((n) => n.id));
    const outgoing = new Map(p.nodes.map((n) => [n.id, [] as string[]]));
    p.nodes.forEach((n, j) => {
      if (
        scenes.has(n.sceneId) &&
        !errors.some(
          (d) =>
            d.code === "PARENT_CYCLE" ||
            d.code === "PARENT_DEPTH" ||
            d.code === "MISSING_PARENT",
        )
      ) {
        const pose = n.camera
          ? { ok: true as const, value: cameraPose(n.camera) }
          : resolveSceneCamera(doc, n.sceneId);
        if (!pose.ok || !validCamera(pose.value))
          add(
            "INVALID_WORLD_CAMERA",
            "Target world camera exceeds finite pose ranges",
            `${base}/nodes/${j}`,
          );
      }
      if (!visible(n.sceneId))
        add(
          "MISSING_REFERENCE",
          "Target scene is missing or effectively invisible",
          `${base}/nodes/${j}/sceneId`,
        );
    });
    p.edges.forEach((e, j) => {
      if (edgeIds.has(e.id) && cueEdgeIds.has(e.id))
        add(
          "AMBIGUOUS_CUE_EDGE",
          "Cue edge ID occurs in multiple paths",
          `${base}/edges/${j}/id`,
        );
      edgeIds.add(e.id);
      if (!nodes.has(e.from) || !nodes.has(e.to))
        add("MISSING_REFERENCE", "Unknown edge endpoint", `${base}/edges/${j}`);
      outgoing.get(e.from)?.push(e.to);
      if (e.cameraTrackId && !trackIds.has(e.cameraTrackId))
        add(
          "MISSING_REFERENCE",
          "Unknown camera track",
          `${base}/edges/${j}/cameraTrackId`,
        );
    });
    const seen = new Set<string>(),
      queue = p.startNodeId ? [p.startNodeId] : [];
    while (queue.length) {
      const id = queue.pop()!;
      if (seen.has(id) || !nodes.has(id)) continue;
      seen.add(id);
      queue.push(...(outgoing.get(id) ?? []));
    }
    if (
      (p.nodes.length === 0 && (p.startNodeId !== null || p.edges.length)) ||
      (p.nodes.length > 0 && (!p.startNodeId || seen.size !== p.nodes.length))
    )
      add(
        "INVALID_GRAPH",
        "Every node must be reachable from a valid start",
        base,
      );
    const components = graphComponents(p);
    p.edges.forEach((e, j) => {
      if (
        components.has(e.from) &&
        components.get(e.from) === components.get(e.to)
      ) {
        if (!p.loopPolicy)
          add(
            "LOOP_POLICY_REQUIRED",
            "Cyclic paths need a visit limit",
            `${base}/loopPolicy`,
          );
        if (!e.condition)
          add(
            "LOOP_CONDITION_REQUIRED",
            "Every cycle edge needs an explicit condition",
            `${base}/edges/${j}/condition`,
          );
      }
    });
  });
  doc.cameraTracks.forEach((t, i) => {
    if (
      !trackWithinRange(resolveCameraTrack(t, cameraPose(t.keyframes[0]!.pose)))
    )
      add(
        "TRACK_RANGE",
        "Cubic camera track exceeds coordinate limits",
        `/cameraTracks/${i}`,
      );
    if (
      t.keyframes[0]!.at !== 0 ||
      t.keyframes.at(-1)!.at !== 1 ||
      t.keyframes.some((k, j) => j > 0 && k.at <= t.keyframes[j - 1]!.at)
    )
      add(
        "INVALID_KEYFRAMES",
        "Keyframes must increase strictly from 0 to 1",
        `/cameraTracks/${i}/keyframes`,
      );
  });
  const edges = new Map(
    doc.paths.flatMap((p) => p.edges).map((e) => [e.id, e]),
  );
  doc.cues.forEach((cue, i) => {
    const edge = edges.get(cue.edgeId);
    if (!edge)
      add("MISSING_REFERENCE", "Unknown cue edge", `/cues/${i}/edgeId`);
    else if (cue.atMs > edge.transition.durationMs)
      add("CUE_RANGE", "Cue exceeds edge duration", `/cues/${i}/atMs`);
  });
  if (usesStructure(doc) && !doc.requiredCapabilities.includes("structure"))
    add(
      "CAPABILITY_REQUIRED",
      "This document requires structure",
      "/requiredCapabilities",
    );
  return errors;
}
