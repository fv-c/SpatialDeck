import { expect, it } from "vitest";
import { mat4, vec3 } from "gl-matrix";
import {
  getWorldMatrix,
  resolveSceneCamera,
  sampleTransition,
  sceneMatrix,
  sceneQuaternion,
  viewMatrix,
} from "../src/index.js";
import type { CameraPose, TransitionPlan } from "../src/index.js";
import fixture from "../../../examples/core-three-scenes/project.json";
import { validateDocument } from "../src/index.js";
function project() {
  const r = validateDocument(fixture);
  if (!r.ok) throw Error();
  return r.value;
}
const close = (actual: ArrayLike<number>, expected: number[], precision = 5) =>
  expected.forEach((v, i) => expect(actual[i]).toBeCloseTo(v, precision));
const apply = (
  rotation: [number, number, number],
  point: [number, number, number],
  scale = 1,
  position: [number, number, number] = [0, 0, 0],
) =>
  vec3.transformMat4(
    vec3.create(),
    point,
    sceneMatrix({ rotation, scale, position }),
  );
it("identity, translation and uniform scale have independent expected points", () => {
  close(
    sceneMatrix({ position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 }),
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  );
  close(apply([0, 0, 0], [1, 2, 3], 2, [10, 20, 30]), [12, 24, 36]);
});
it.each([
  [
    [90, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
  [
    [0, 90, 0],
    [0, 0, 1],
    [1, 0, 0],
  ],
  [
    [0, 0, 90],
    [1, 0, 0],
    [0, 1, 0],
  ],
] as const)("rotates around an individual CSS axis %s", (r, p, e) =>
  close(apply([...r], [...p]), [...e]),
);
it("applies X then Y then Z; order is noncommutative", () => {
  close(apply([90, 90, 0], [0, 1, 0]), [1, 0, 0]);
  close(apply([0, 90, 90], [0, 0, 1]), [0, 1, 0]);
});
it("inverts composed transforms", () => {
  const m = sceneMatrix({
    position: [20, -40, 15],
    rotation: [30, 90, 45],
    scale: 2,
  });
  const inv = mat4.invert(mat4.create(), m)!;
  close(
    mat4.multiply(mat4.create(), inv, m),
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    4,
  );
});
it("fits with margin and world scale and aligns the reference plane", () => {
  const d = project();
  const r = resolveSceneCamera(d, "detail");
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.value.zoom).toBeCloseTo((0.9 * 1.2) / 0.7);
  const m = getWorldMatrix(d, "detail");
  if (!m.ok) throw Error();
  const vm = mat4.multiply(mat4.create(), viewMatrix(r.value), m.value);
  close(vec3.transformMat4(vec3.create(), [0, 0, 0], vm), [0, 0, 0], 3);
  close(vec3.transformMat4(vec3.create(), [400, 300, 0], vm), [432, 324, 0], 3);
});
it("handles unknown and nonfinite API poses", () => {
  const d = project();
  expect(getWorldMatrix(d, "missing").ok).toBe(false);
  d.scenes[0]!.position[0] = NaN;
  expect(resolveSceneCamera(d, "intro").ok).toBe(false);
});
const from: CameraPose = {
  position: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  zoom: 1,
};
const plan: TransitionPlan = {
  from,
  to: {
    position: [100, 200, -100],
    rotation: sceneQuaternion([0, 0, 180]),
    zoom: 4,
  },
  durationMs: 100,
  easing: "linear",
};
it("clamps time, log-interpolates zoom and slerps rotations", () => {
  expect(sampleTransition(plan, -10).progress).toBe(0);
  expect(sampleTransition(plan, 200).progress).toBe(1);
  const mid = sampleTransition(plan, 50).camera;
  close(mid.position, [50, 100, -50]);
  expect(mid.zoom).toBeCloseTo(2);
  close(vec3.transformQuat(vec3.create(), [1, 0, 0], mid.rotation), [0, 1, 0]);
});
it("smoothstep easing applies once; zero duration completes", () => {
  expect(
    sampleTransition({ ...plan, easing: "ease-in-out" }, 25).camera.position[0],
  ).toBeCloseTo(15.625);
  expect(sampleTransition({ ...plan, durationMs: 0 }, 0).progress).toBe(1);
});
it("q/-q follows the shortest arc without vanishing", () => {
  const q = sceneQuaternion([30, 60, 90]);
  const sample = sampleTransition(
    {
      ...plan,
      from: { ...from, rotation: q },
      to: { ...from, rotation: q.map((x) => -x) as CameraPose["rotation"] },
    },
    50,
  );
  expect(
    Math.abs(sample.camera.rotation.reduce((s, x, i) => s + x * q[i]!, 0)),
  ).toBeCloseTo(1);
});
it("rejects NaN time, zero quaternion and nonpositive zoom", () => {
  expect(() => sampleTransition(plan, NaN)).toThrow();
  expect(() =>
    sampleTransition({ ...plan, from: { ...from, zoom: 0 } }, 0),
  ).toThrow();
  expect(() =>
    sampleTransition({ ...plan, from: { ...from, rotation: [0, 0, 0, 0] } }, 0),
  ).toThrow();
});
