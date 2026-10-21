import { mat4, quat } from "gl-matrix";
import { failure, success } from "../document/index.js";
import type {
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
export function sceneQuaternion(
  rotation: Vec3,
): [number, number, number, number] {
  const q = quat.create();
  quat.rotateZ(q, q, (rotation[2] * Math.PI) / 180);
  quat.rotateY(q, q, (rotation[1] * Math.PI) / 180);
  quat.rotateX(q, q, (rotation[0] * Math.PI) / 180);
  quat.normalize(q, q);
  return Array.from(q) as CameraPose["rotation"];
}
export function sceneMatrix(
  scene: Pick<Scene, "position" | "rotation" | "scale">,
): number[] {
  return Array.from(
    mat4.fromRotationTranslationScale(
      mat4.create(),
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
  const s = document.scenes.find((s) => s.id === sceneId);
  if (!s) return failure("UNKNOWN_SCENE", "Unknown scene");
  if (
    ![...s.position, ...s.rotation, s.scale].every(Number.isFinite) ||
    [...s.position, ...s.rotation].some((x) => Math.abs(x) > 1000000) ||
    s.scale < 0.0001 ||
    s.scale > 10000
  )
    return failure("INVALID_POSE", "Pose must be finite with positive scale");
  return success(sceneMatrix(s));
}
export function resolveSceneCamera(
  document: ProjectDocument,
  sceneId: string,
): Result<CameraPose> {
  const matrix = getWorldMatrix(document, sceneId);
  if (!matrix.ok) return matrix;
  const s = document.scenes.find((s) => s.id === sceneId)!;
  const v = document.settings.viewport;
  if (
    ![...s.size, v.width, v.height].every(
      (x) => Number.isFinite(x) && x >= 1 && x <= 100000,
    )
  )
    return failure("INVALID_POSE", "Invalid camera dimensions");
  return success({
    position: [...s.position],
    rotation: sceneQuaternion(s.rotation),
    zoom: (0.9 * Math.min(v.width / s.size[0], v.height / s.size[1])) / s.scale,
  });
}
export function viewMatrix(camera: CameraPose): number[] {
  const c = mat4.fromRotationTranslation(
    mat4.create(),
    camera.rotation,
    camera.position,
  );
  mat4.invert(c, c);
  return Array.from(
    mat4.multiply(
      c,
      mat4.fromScaling(mat4.create(), [camera.zoom, camera.zoom, camera.zoom]),
      c,
    ),
  );
}
