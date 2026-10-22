import { quat } from "gl-matrix";
import { failure, success } from "../document/index.js";
import type {
  ProjectDocument,
  Result,
  CameraTrack,
  Transition,
} from "../document/index.js";
import { cameraPose, resolveSceneCamera } from "../math/index.js";
import type { CameraPose } from "../math/index.js";
export interface TransitionPlan extends Transition {
  from: CameraPose;
  to: CameraPose;
  track?: ResolvedCameraTrack;
}
export function sampleTransition(
  plan: TransitionPlan,
  elapsedMs: number,
): { camera: CameraPose; progress: number } {
  if (
    !Number.isFinite(elapsedMs) ||
    !Number.isFinite(plan.durationMs) ||
    plan.durationMs < 0 ||
    ![plan.from, plan.to].every(
      (p) =>
        [...p.position, ...p.rotation, p.zoom].every(Number.isFinite) &&
        p.zoom > 0 &&
        Math.hypot(...p.rotation) > 0,
    )
  )
    throw new RangeError("Invalid transition");
  const progress =
    plan.durationMs === 0
      ? 1
      : Math.max(0, Math.min(1, elapsedMs / plan.durationMs));
  if (plan.track)
    return { progress, camera: sampleCameraTrack(plan.track, progress) };
  const t =
    plan.easing === "linear"
      ? progress
      : progress * progress * (3 - 2 * progress);
  const q = quat.slerp(
    [0, 0, 0, 1],
    quat.normalize([0, 0, 0, 1], plan.from.rotation),
    quat.normalize([0, 0, 0, 1], plan.to.rotation),
    t,
  );
  quat.normalize(q, q);
  return {
    progress,
    camera: {
      position: plan.from.position.map(
        (x, i) => x + (plan.to.position[i]! - x) * t,
      ) as CameraPose["position"],
      rotation: Array.from(q) as CameraPose["rotation"],
      zoom: Math.exp(
        Math.log(plan.from.zoom) +
          (Math.log(plan.to.zoom) - Math.log(plan.from.zoom)) * t,
      ),
    },
  };
}

export interface ResolvedCameraTrack {
  keyframes: Array<{ at: number; pose: CameraPose }>;
  interpolation: CameraTrack["interpolation"];
  easing: CameraTrack["easing"];
}
export function resolveCameraTrack(
  track: CameraTrack,
  from: CameraPose,
): ResolvedCameraTrack {
  return {
    ...track,
    keyframes: track.keyframes.map((k, i) => ({
      at: k.at,
      pose: i === 0 ? structuredClone(from) : cameraPose(k.pose),
    })),
  };
}
/** Pure capture sampler: never emits cues or changes a navigation visit. */
export function sampleCameraTrack(
  track: ResolvedCameraTrack,
  progress: number,
): CameraPose {
  if (!Number.isFinite(progress))
    throw new RangeError("Invalid track progress");
  const p = Math.max(0, Math.min(1, progress));
  const t = track.easing === "linear" ? p : p * p * (3 - 2 * p);
  const k = track.keyframes;
  if (t === 0) return structuredClone(k[0]!.pose);
  if (t === 1) return structuredClone(k.at(-1)!.pose);
  const i = Math.max(
    0,
    k.findIndex(
      (next, j) => j < k.length - 1 && t >= next.at && t < k[j + 1]!.at,
    ),
  );
  const a = k[i]!,
    b = k[i + 1]!,
    u = (t - a.at) / (b.at - a.at);
  const pose = sampleTransition(
    { from: a.pose, to: b.pose, durationMs: 1, easing: "linear" },
    u,
  ).camera;
  if (track.interpolation === "cubic") {
    const before = k[Math.max(0, i - 1)]!.pose.position,
      after = k[Math.min(k.length - 1, i + 2)]!.pose.position;
    pose.position = pose.position.map((_, axis) =>
      catmull(
        before[axis]!,
        a.pose.position[axis]!,
        b.pose.position[axis]!,
        after[axis]!,
        u,
      ),
    ) as CameraPose["position"];
  }
  if (pose.position.some((x) => !Number.isFinite(x) || Math.abs(x) > 1000000))
    throw new RangeError("Camera track exceeds coordinate range");
  return pose;
}
function catmull(
  a: number,
  b: number,
  c: number,
  d: number,
  t: number,
): number {
  return (
    0.5 *
    (2 * b +
      (-a + c) * t +
      (2 * a - 5 * b + 4 * c - d) * t * t +
      (-a + 3 * b - 3 * c + d) * t * t * t)
  );
}
/** Check all cubic extrema, including a substituted runtime entry pose. */
export function trackWithinRange(track: ResolvedCameraTrack): boolean {
  const k = track.keyframes;
  if (track.interpolation === "linear") return true;
  for (let i = 0; i < k.length - 1; i++)
    for (let axis = 0; axis < 3; axis++) {
      const a = k[Math.max(0, i - 1)]!.pose.position[axis]!,
        b = k[i]!.pose.position[axis]!,
        c = k[i + 1]!.pose.position[axis]!,
        d = k[Math.min(k.length - 1, i + 2)]!.pose.position[axis]!;
      const A = 1.5 * (-a + 3 * b - 3 * c + d),
        B = 2 * a - 5 * b + 4 * c - d,
        C = 0.5 * (-a + c);
      const discriminant = B * B - 4 * A * C;
      const roots =
        Math.abs(A) < 1e-12
          ? Math.abs(B) < 1e-12
            ? []
            : [-C / B]
          : discriminant < 0
            ? []
            : [
                (-B + Math.sqrt(discriminant)) / (2 * A),
                (-B - Math.sqrt(discriminant)) / (2 * A),
              ];
      if (
        roots.some(
          (t) => t > 0 && t < 1 && Math.abs(catmull(a, b, c, d, t)) > 1000000,
        )
      )
        return false;
    }
  return true;
}
/** Same resolved edge plan for navigation, editor inspection and future capture. */
export function resolveEdgePlan(
  document: ProjectDocument,
  pathId: string,
  edgeId: string,
  entry?: CameraPose,
): Result<TransitionPlan> {
  const path = document.paths.find((p) => p.id === pathId),
    edge = path?.edges.find((e) => e.id === edgeId);
  if (!path || !edge) return failure("UNKNOWN_EDGE", "Unknown path or edge");
  const source = path.nodes.find((n) => n.id === edge.from)!,
    target = path.nodes.find((n) => n.id === edge.to)!;
  const from = entry
    ? success(entry)
    : source.camera
      ? success(cameraPose(source.camera))
      : resolveSceneCamera(document, source.sceneId);
  const to = target.camera
    ? success(cameraPose(target.camera))
    : resolveSceneCamera(document, target.sceneId);
  if (!from.ok) return from;
  if (!to.ok) return to;
  const track = document.cameraTracks.find((t) => t.id === edge.cameraTrackId);
  const resolved = track ? resolveCameraTrack(track, from.value) : undefined;
  if (resolved && !trackWithinRange(resolved))
    return failure("TRACK_RANGE", "Camera track exceeds coordinate limits");
  return success({
    ...edge.transition,
    from: structuredClone(from.value),
    to: resolved ? structuredClone(resolved.keyframes.at(-1)!.pose) : to.value,
    ...(resolved ? { track: resolved } : {}),
  });
}
