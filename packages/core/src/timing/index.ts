import { quat } from "gl-matrix";
import type { Transition } from "../document/index.js";
import type { CameraPose } from "../math/index.js";
export interface TransitionPlan extends Transition {
  from: CameraPose;
  to: CameraPose;
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
  const t =
    plan.easing === "linear"
      ? progress
      : progress * progress * (3 - 2 * progress);
  const q = quat.slerp(
    quat.create(),
    quat.normalize(quat.create(), plan.from.rotation),
    quat.normalize(quat.create(), plan.to.rotation),
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
