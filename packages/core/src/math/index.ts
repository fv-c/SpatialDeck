import { mat4, quat } from "gl-matrix";
import { failure, success, validateDocument } from "../document/index.js";
import type {
  AuthoredCameraPose,
  ProjectDocument,
  Result,
  Scene,
  Vec3,
} from "../document/index.js";
export interface CameraPose {
  position: Vec3;
  rotation: [number, number, number, number];
  zoom: number;
}
// Explicit number[] outputs retain double precision without changing gl-matrix globals.
const matrix = () => new Array<number>(16).fill(0);
const quaternion = (): CameraPose["rotation"] => [0, 0, 0, 1];
export function sceneQuaternion(rotation: Vec3): CameraPose["rotation"] {
  const q = quaternion();
  quat.rotateZ(q, q, (rotation[2] * Math.PI) / 180);
  quat.rotateY(q, q, (rotation[1] * Math.PI) / 180);
  quat.rotateX(q, q, (rotation[0] * Math.PI) / 180);
  quat.normalize(q, q);
  return q;
}
export function cameraPose(pose: AuthoredCameraPose): CameraPose {
  return {
    position: [...pose.position],
    rotation: sceneQuaternion(pose.rotation),
    zoom: pose.zoom,
  };
}
export function validCamera(pose: CameraPose): boolean {
  return (
    Array.isArray(pose?.position) &&
    pose.position.length === 3 &&
    Array.isArray(pose.rotation) &&
    pose.rotation.length === 4 &&
    [...pose.position, ...pose.rotation, pose.zoom].every(Number.isFinite) &&
    pose.zoom >= 0.0001 &&
    pose.zoom <= 10000 &&
    pose.position.every((n) => Math.abs(n) <= 1000000) &&
    Math.hypot(...pose.rotation) > 0
  );
}
export function sceneMatrix(
  scene: Pick<Scene, "position" | "rotation" | "scale">,
): number[] {
  return Array.from(
    mat4.fromRotationTranslationScale(
      matrix(),
      sceneQuaternion(scene.rotation),
      scene.position,
      [scene.scale, scene.scale, scene.scale],
    ),
  );
}
export function getWorldMatrix(
  document: ProjectDocument,
  sceneId: string,
): Result<number[]> {
  const scenes = new Map(document.scenes.map((s) => [s.id, s]));
  let s = scenes.get(sceneId);
  if (!s) return failure("UNKNOWN_SCENE", "Unknown scene");
  const chain: Scene[] = [],
    seen = new Set<string>();
  while (s) {
    if (seen.has(s.id)) return failure("PARENT_CYCLE", "Parent cycle");
    if (chain.length === 32)
      return failure("PARENT_DEPTH", "Hierarchy exceeds 32 levels");
    if (
      ![...s.position, ...s.rotation, s.scale].every(Number.isFinite) ||
      [...s.position, ...s.rotation].some((x) => Math.abs(x) > 1000000) ||
      s.scale < 0.0001 ||
      s.scale > 10000
    )
      return failure("INVALID_POSE", "Pose must be finite with positive scale");
    chain.push(s);
    seen.add(s.id);
    if (s.parentId === null) break;
    s = scenes.get(s.parentId);
    if (!s) return failure("MISSING_PARENT", "Unknown parent");
  }
  let world = Array.from(mat4.identity(matrix()));
  for (const node of chain.reverse())
    world = Array.from(mat4.multiply(matrix(), world, sceneMatrix(node)));
  return world.every(Number.isFinite) &&
    Math.hypot(world[0]!, world[1]!, world[2]!) > 0
    ? success(world)
    : failure("INVALID_POSE", "Nonfinite world matrix");
}
export function isSceneVisible(
  document: ProjectDocument,
  sceneId: string,
): boolean {
  const seen = new Set<string>();
  let scene = document.scenes.find((s) => s.id === sceneId);
  while (scene) {
    if (!scene.visible || seen.has(scene.id)) return false;
    seen.add(scene.id);
    if (scene.parentId === null) return true;
    const parent = scene.parentId;
    scene = document.scenes.find((s) => s.id === parent);
  }
  return false;
}
export function decomposeSceneMatrix(
  m: number[],
): Result<Pick<Scene, "position" | "rotation" | "scale">> {
  const scale = Math.hypot(m[0]!, m[1]!, m[2]!);
  if (!m.every(Number.isFinite) || scale < 0.0001 || scale > 10000)
    return failure("DECOMPOSITION_RANGE", "Scale outside document range");
  const y = Math.asin(Math.max(-1, Math.min(1, -m[2]! / scale)));
  const locked = Math.abs(Math.cos(y)) < 1e-10;
  const rotation: Vec3 = [
    locked ? 0 : Math.atan2(m[6]!, m[10]!),
    y,
    locked ? Math.atan2(-m[4]!, m[5]!) : Math.atan2(m[1]!, m[0]!),
  ];
  const value = {
    position: [m[12]!, m[13]!, m[14]!] as Vec3,
    rotation: rotation.map((x) => (x * 180) / Math.PI) as Vec3,
    scale,
  };
  if (
    value.position.some((x) => Math.abs(x) > 1000000) ||
    sceneMatrix(value).some((x, i) => Math.abs(x - m[i]!) > 1e-6)
  )
    return failure(
      "DECOMPOSITION_RANGE",
      "Matrix cannot be represented within document ranges",
    );
  return success(value);
}
export function reparentScene(
  document: ProjectDocument,
  sceneId: string,
  parentId: string | null,
  preserveWorld = true,
): Result<ProjectDocument> {
  const scene = document.scenes.find((s) => s.id === sceneId);
  if (!scene) return failure("UNKNOWN_SCENE", "Unknown scene");
  const candidate = structuredClone(document),
    changed = candidate.scenes.find((s) => s.id === sceneId)!;
  changed.parentId = parentId;
  if (parentId !== null && !document.scenes.some((s) => s.id === parentId))
    return failure("MISSING_PARENT", "Unknown parent");
  // Validate the proposed chain before attempting any inverse/decomposition.
  const chain = getWorldMatrix(candidate, sceneId);
  if (!chain.ok) return chain;
  if (preserveWorld) {
    const old = getWorldMatrix(document, sceneId);
    const parent =
      parentId === null
        ? success(Array.from(mat4.identity(matrix())))
        : getWorldMatrix(document, parentId);
    if (!old.ok) return old;
    if (!parent.ok) return parent;
    const inverse = mat4.invert(matrix(), parent.value);
    if (!inverse)
      return failure("DECOMPOSITION_RANGE", "Parent is not invertible");
    const pose = decomposeSceneMatrix(
      Array.from(mat4.multiply(matrix(), inverse, old.value)),
    );
    if (!pose.ok) return pose;
    Object.assign(changed, pose.value);
  }
  if (
    parentId !== null &&
    !candidate.requiredCapabilities.includes("structure")
  )
    candidate.requiredCapabilities.push("structure");
  return validateDocument(candidate);
}
export function resolveSceneCamera(
  document: ProjectDocument,
  sceneId: string,
): Result<CameraPose> {
  const world = getWorldMatrix(document, sceneId);
  if (!world.ok) return world;
  const s = document.scenes.find((s) => s.id === sceneId)!,
    v = document.settings.viewport;
  if (
    ![...s.size, v.width, v.height].every(
      (x) => Number.isFinite(x) && x >= 1 && x <= 100000,
    )
  )
    return failure("INVALID_POSE", "Invalid camera dimensions");
  const m = world.value,
    scale = Math.hypot(m[0]!, m[1]!, m[2]!);
  const normalized = m.map((x, i) => (i % 4 !== 3 && i < 12 ? x / scale : x));
  const q = quaternion();
  mat4.getRotation(q, normalized);
  quat.normalize(q, q);
  return success({
    position: [m[12]!, m[13]!, m[14]!],
    rotation: q,
    zoom: (0.9 * Math.min(v.width / s.size[0], v.height / s.size[1])) / scale,
  });
}
export function resolveOverviewCamera(
  document: ProjectDocument,
): Result<CameraPose> {
  const points: Vec3[] = [];
  for (const scene of document.scenes) {
    if (!isSceneVisible(document, scene.id)) continue;
    const result = getWorldMatrix(document, scene.id);
    if (!result.ok) return result;
    const m = result.value;
    for (const x of [-scene.size[0] / 2, scene.size[0] / 2])
      for (const y of [-scene.size[1] / 2, scene.size[1] / 2])
        points.push([
          m[0]! * x + m[4]! * y + m[12]!,
          m[1]! * x + m[5]! * y + m[13]!,
          m[2]! * x + m[6]! * y + m[14]!,
        ]);
  }
  if (!points.length) return failure("EMPTY_OVERVIEW", "No visible scenes");
  const min = [0, 1, 2].map((i) => Math.min(...points.map((p) => p[i]!))),
    max = [0, 1, 2].map((i) => Math.max(...points.map((p) => p[i]!)));
  const v = document.settings.viewport;
  const pose: CameraPose = {
    position: [(min[0]! + max[0]!) / 2, (min[1]! + max[1]!) / 2, max[2]!],
    rotation: [0, 0, 0, 1],
    zoom: Math.max(
      0.0001,
      Math.min(
        10000,
        (0.9 * v.width) / Math.max(1, max[0]! - min[0]!),
        (0.9 * v.height) / Math.max(1, max[1]! - min[1]!),
      ),
    ),
  };
  return validCamera(pose)
    ? success(pose)
    : failure("OVERVIEW_RANGE", "World bounds exceed inspection limits");
}
export function viewMatrix(camera: CameraPose): number[] {
  const c = mat4.fromRotationTranslation(
    matrix(),
    camera.rotation,
    camera.position,
  );
  mat4.invert(c, c);
  return Array.from(
    mat4.multiply(
      c,
      mat4.fromScaling(matrix(), [camera.zoom, camera.zoom, camera.zoom]),
      c,
    ),
  );
}
export function authoredCameraPose(pose: CameraPose): AuthoredCameraPose {
  const m = Array.from(
    mat4.fromRotationTranslation(matrix(), pose.rotation, pose.position),
  );
  const result = decomposeSceneMatrix(m);
  if (!result.ok) throw new RangeError(result.diagnostics[0]?.message);
  return {
    position: result.value.position,
    rotation: result.value.rotation,
    zoom: pose.zoom,
  };
}
export function worldPositionToLocal(
  document: ProjectDocument,
  sceneId: string,
  position: Vec3,
): Result<Vec3> {
  const scene = document.scenes.find((s) => s.id === sceneId);
  if (!scene) return failure("UNKNOWN_SCENE", "Unknown scene");
  if (!position.every(Number.isFinite))
    return failure("INVALID_POSE", "Position must be finite");
  if (scene.parentId === null) return success([...position]);
  const parent = getWorldMatrix(document, scene.parentId);
  if (!parent.ok) return parent;
  const inverse = mat4.invert(matrix(), parent.value);
  if (!inverse) return failure("INVALID_POSE", "Parent is not invertible");
  return success(
    [0, 1, 2].map(
      (i) =>
        inverse[i]! * position[0] +
        inverse[i + 4]! * position[1] +
        inverse[i + 8]! * position[2] +
        inverse[i + 12]!,
    ) as Vec3,
  );
}
/** Near/behind the perspective plane is inspectable through the textual outline. */
export function inspectCamera(
  document: ProjectDocument,
  camera: CameraPose,
): import("../document/index.js").Diagnostic[] {
  const view = viewMatrix(camera),
    warnings: import("../document/index.js").Diagnostic[] = [];
  for (const [i, scene] of document.scenes.entries()) {
    if (!isSceneVisible(document, scene.id)) continue;
    const world = getWorldMatrix(document, scene.id);
    if (!world.ok) continue;
    const m = Array.from(mat4.multiply(matrix(), view, world.value));
    if (
      [-scene.size[0] / 2, scene.size[0] / 2].some((x) =>
        [-scene.size[1] / 2, scene.size[1] / 2].some(
          (y) =>
            m[2]! * x + m[6]! * y + m[14]! >=
            document.settings.viewport.perspective * 0.99,
        ),
      )
    )
      warnings.push({
        code: "PERSPECTIVE_PLANE",
        severity: "warning",
        pointer: `/scenes/${i}`,
        message: `${scene.title}: punti sul piano prospettico o dietro di esso; usa la vista testuale per raggiungere la scena.`,
      });
  }
  return warnings;
}
