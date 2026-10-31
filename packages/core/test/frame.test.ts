import { describe, expect, it } from "vitest";
import structure from "../../../examples/structure-branching/project.json";
import {
  adjustFrame,
  alignFrames,
  clampFrame,
  contrastDiagnostics,
  contrastIssues,
  contrastRatio,
  distributeFrames,
  frameBounds,
  frameCenter,
  frameCorners,
  frameMatrix,
  frameToScene,
  framesIntersect,
  getWorldMatrix,
  moveFrame,
  projectScenePoint,
  resizeFrame,
  resolveSceneCamera,
  rotateFrame,
  sceneQuaternion,
  sceneToFrame,
  sceneToWorld,
  stackFrames,
  unprojectScenePoint,
  validateDocument,
} from "../src/index.js";
import type {
  CameraPose,
  Frame,
  Point,
  ProjectDocument,
} from "../src/index.js";
const frame = (patch: Partial<Frame> = {}): Frame => ({
  x: 100,
  y: 50,
  width: 200,
  height: 80,
  rotation: 0,
  z: 0,
  ...patch,
});
const near = (a: number[], b: number[], tolerance = 1e-9) =>
  a.forEach((n, i) =>
    expect(Math.abs(n - b[i]!)).toBeLessThanOrEqual(tolerance),
  );
/** Deterministic LCG: the same pseudo-random cases on every run. */
function random(seed = 7) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}
const nested = (): ProjectDocument => {
  const r = validateDocument(structure);
  if (!r.ok) throw new Error(JSON.stringify(r.diagnostics));
  return r.value;
};
describe("frame <-> scene", () => {
  it("places an unrotated frame by translation only", () => {
    const f = frame();
    expect(frameMatrix(f)).toEqual([1, 0, -0, 1, 100, 50]);
    expect(frameCorners(f)).toEqual([
      [100, 50],
      [300, 50],
      [300, 130],
      [100, 130],
    ]);
    expect(frameBounds(f)).toEqual({ x: 100, y: 50, width: 200, height: 80 });
  });
  it("rotates around the frame centre, clockwise on screen", () => {
    const f = frame({ rotation: 90 });
    const [cx, cy] = frameCenter(f);
    expect([cx, cy]).toEqual([200, 90]);
    const [tl, tr, br, bl] = frameCorners(f);
    near(tl, [cx + 40, cy - 100]);
    near(tr, [cx + 40, cy + 100]);
    near(br, [cx - 40, cy + 100]);
    near(bl, [cx - 40, cy - 100]);
    near(frameToScene(f, [100, 40]), [cx, cy]);
  });
  it("bounds a rotated frame with its axis-aligned box", () => {
    const b = frameBounds(frame({ width: 100, height: 100, rotation: 45 }));
    near(
      [b.width, b.height, b.x + b.width / 2, b.y + b.height / 2],
      [100 * Math.SQRT2, 100 * Math.SQRT2, 150, 100],
    );
  });
  it("converts frame -> scene -> frame within 1e-9 on random frames", () => {
    const next = random();
    for (let i = 0; i < 500; i++) {
      const f = frame({
        x: next() * 2000,
        y: next() * 2000,
        width: 8 + next() * 1500,
        height: 8 + next() * 1500,
        rotation: next() * 720 - 360,
      });
      const p: Point = [next() * f.width, next() * f.height];
      near(sceneToFrame(f, frameToScene(f, p)), p);
      const q: Point = [next() * 3000 - 500, next() * 3000 - 500];
      near(frameToScene(f, sceneToFrame(f, q)), q);
    }
  });
  it("detects intersections of rotated frames, not touching edges", () => {
    const a = frame({ x: 0, y: 0, width: 100, height: 100 });
    expect(framesIntersect(a, frame({ x: 50, y: 50 }))).toBe(true);
    expect(framesIntersect(a, frame({ x: 100, y: 0 }))).toBe(false);
    expect(framesIntersect(a, frame({ x: 101, y: 0 }))).toBe(false);
    // Axis-aligned boxes overlap but the 45° diamond misses the corner.
    const diamond = frame({
      x: 110,
      y: 110,
      width: 60,
      height: 60,
      rotation: 45,
    });
    const box = frameBounds(diamond);
    expect(box.x).toBeLessThan(100);
    expect(box.y).toBeLessThan(100);
    expect(framesIntersect(a, diamond)).toBe(false);
    expect(framesIntersect(a, { ...diamond, x: 80, y: 80 })).toBe(true);
  });
});
describe("editing operations", () => {
  const size: [number, number] = [1000, 600];
  it("clamps the unrotated rectangle into the scene", () => {
    expect(clampFrame(frame({ x: -5, y: 590, width: 4 }), size)).toEqual(
      frame({ x: 0, y: 520, width: 8 }),
    );
    expect(
      clampFrame(frame({ width: 2000, height: 2000 }), size),
    ).toMatchObject({ x: 0, y: 0, width: 1000, height: 600 });
    expect(moveFrame(frame(), 1000, -1000, size)).toMatchObject({
      x: 800,
      y: 0,
    });
  });
  it.each(["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const)(
    "resizes from %s keeping the opposite side fixed on a rotated frame",
    (handle) => {
      const f = frame({ x: 300, y: 200, rotation: 30 });
      const fixed: Point = [
        handle.includes("w") ? f.width : handle.includes("e") ? 0 : f.width / 2,
        handle.includes("n")
          ? f.height
          : handle.includes("s")
            ? 0
            : f.height / 2,
      ];
      const anchor = frameToScene(f, fixed);
      const g = adjustFrame(f, handle, 30, 20, size);
      const grownFixed: Point = [
        handle.includes("w") ? g.width : handle.includes("e") ? 0 : g.width / 2,
        handle.includes("n")
          ? g.height
          : handle.includes("s")
            ? 0
            : g.height / 2,
      ];
      near(frameToScene(g, grownFixed), anchor, 1e-9);
      expect(g.rotation).toBe(30);
      expect(g.width).toBe(
        f.width + (/[ew]/.test(handle) ? (handle.includes("w") ? -30 : 30) : 0),
      );
      expect(g.height).toBe(
        f.height +
          (/[ns]/.test(handle) ? (handle.includes("n") ? -20 : 20) : 0),
      );
    },
  );
  it("stops an unrotated moving edge at the scene border, keeping the anchor", () => {
    const f = frame({ x: 900, y: 500, width: 80, height: 60 });
    expect(resizeFrame(f, "se", [1400, 900], size)).toEqual({
      ...f,
      width: 100,
      height: 100,
    });
    expect(resizeFrame(f, "nw", [-300, -300], size)).toEqual({
      ...f,
      x: 0,
      y: 0,
      width: 980,
      height: 560,
    });
    // A rotated frame is clamped as a whole instead.
    const r = adjustFrame({ ...f, rotation: 30 }, "e", 500, 0, size);
    expect(r.x + r.width).toBeLessThanOrEqual(1000);
    expect(r.width).toBe(580);
  });
  it("follows the pointer on resize and never goes below 8 px", () => {
    const f = frame({ rotation: 0 });
    expect(resizeFrame(f, "se", [400, 200], size)).toMatchObject({
      x: 100,
      y: 50,
      width: 300,
      height: 150,
    });
    expect(resizeFrame(f, "se", [0, 0], size)).toMatchObject({
      x: 100,
      y: 50,
      width: 8,
      height: 8,
    });
    expect(resizeFrame(f, "nw", [97, 41], size, 10)).toMatchObject({
      x: 100,
      y: 40,
      width: 200,
      height: 90,
    });
  });
  it("rotates relative to the grab point, normalized and snapped", () => {
    const f = frame({ x: 0, y: 0, width: 100, height: 100 });
    const top: Point = [50, -100],
      right: Point = [200, 50];
    expect(rotateFrame(f, top, right).rotation).toBeCloseTo(90, 9);
    expect(
      rotateFrame({ ...f, rotation: 170 }, top, right).rotation,
    ).toBeCloseTo(-100, 9);
    expect(rotateFrame(f, top, [200, 40], 15).rotation).toBe(90);
    expect(rotateFrame(f, top, top).rotation).toBe(0);
  });
  it("aligns visual bounds to the selection or, alone, to the scene", () => {
    const frames = [
      frame({ x: 10, y: 10 }),
      frame({ x: 300, y: 200, width: 100 }),
      frame({ x: 50, y: 400, width: 100, height: 100, rotation: 45 }),
    ];
    const left = alignFrames(frames, "left", size).map(
      (f) => Math.round(frameBounds(f).x * 1e9) / 1e9,
    );
    expect(left).toEqual([10, 10, 10]);
    const right = alignFrames(frames, "right", size).map(
      (f) => frameBounds(f).x + frameBounds(f).width,
    );
    right.forEach((r) => expect(r).toBeCloseTo(400, 9));
    expect(alignFrames([frame()], "center", size)[0]).toMatchObject({ x: 400 });
    expect(alignFrames([frame()], "bottom", size)[0]).toMatchObject({ y: 520 });
    const middle = alignFrames(frames, "middle", size).map(
      (f) => frameBounds(f).y + frameBounds(f).height / 2,
    );
    middle.forEach((m) => expect(m).toBeCloseTo(middle[0]!, 9));
  });
  it("distributes equal gaps between bounds and keeps the outer frames", () => {
    const frames = [
      frame({ x: 0, width: 100 }),
      frame({ x: 700, width: 100 }),
      frame({ x: 120, width: 50 }),
    ];
    const result = distributeFrames(frames, "horizontal", size);
    expect(result.map((f) => f.x)).toEqual([0, 700, 375]);
    expect(distributeFrames(frames.slice(0, 2), "vertical", size)).toEqual(
      frames.slice(0, 2),
    );
    const vertical = distributeFrames(
      [frame({ y: 0 }), frame({ y: 500 }), frame({ y: 10 })],
      "vertical",
      size,
    );
    expect(vertical.map((f) => f.y)).toEqual([0, 500, 250]);
  });
  it("changes z for bring forward/backward/front/back within limits", () => {
    const frames = [
      frame({ z: 0 }),
      frame({ z: 3 }),
      frame({ z: -2 }),
      frame({ z: 1000 }),
    ];
    expect(stackFrames(frames, new Set([0]), "forward")).toEqual([
      1, 3, -2, 1000,
    ]);
    expect(stackFrames(frames, new Set([0]), "backward")).toEqual([
      -1, 3, -2, 1000,
    ]);
    expect(stackFrames(frames, new Set([1]), "front")).toEqual([
      0, 1000, -2, 1000,
    ]);
    expect(stackFrames(frames, new Set([1]), "back")).toEqual([
      0, -3, -2, 1000,
    ]);
    expect(stackFrames(frames, new Set([3]), "forward")).toEqual([
      0, 3, -2, 1000,
    ]);
    expect(stackFrames([frame()], new Set([0]), "front")).toEqual([0]);
  });
});
describe("projection of scene points", () => {
  it("frames a scene frontally with resolveSceneCamera", () => {
    const doc = nested();
    for (const scene of doc.scenes) {
      const camera = resolveSceneCamera(doc, scene.id);
      if (!camera.ok) throw new Error();
      const v = doc.settings.viewport;
      const centre = projectScenePoint(doc, scene.id, camera.value, [
        scene.size[0] / 2,
        scene.size[1] / 2,
      ]);
      expect(centre.ok).toBe(true);
      if (centre.ok) near(centre.value, [v.width / 2, v.height / 2], 1e-6);
      const k =
        0.9 * Math.min(v.width / scene.size[0], v.height / scene.size[1]);
      const corner = projectScenePoint(doc, scene.id, camera.value, [0, 0]);
      if (corner.ok)
        near(
          corner.value,
          [
            v.width / 2 - (k * scene.size[0]) / 2,
            v.height / 2 - (k * scene.size[1]) / 2,
          ],
          1e-6,
        );
    }
  });
  it("unprojects what it projects on rotated and nested scenes, any camera", () => {
    const doc = nested(),
      next = random(11);
    for (const scene of doc.scenes) {
      for (let i = 0; i < 40; i++) {
        const camera: CameraPose = {
          position: [
            next() * 400 - 200,
            next() * 400 - 200,
            next() * 400 - 200,
          ],
          rotation: sceneQuaternion([
            next() * 40 - 20,
            next() * 40 - 20,
            next() * 360,
          ]),
          zoom: 0.2 + next(),
        };
        const fit = resolveSceneCamera(doc, scene.id);
        if (!fit.ok) throw new Error();
        for (const c of [camera, fit.value]) {
          const p: Point = [next() * scene.size[0], next() * scene.size[1]];
          const projected = projectScenePoint(doc, scene.id, c, p);
          if (!projected.ok) continue;
          const back = unprojectScenePoint(doc, scene.id, c, projected.value);
          expect(back.ok).toBe(true);
          if (back.ok) near(back.value, p, 1e-6);
        }
      }
    }
  });
  it("maps scene points to world through the parent chain", () => {
    const doc = nested();
    const child = doc.scenes.find((s) => s.parentId !== null)!;
    const m = getWorldMatrix(doc, child.id);
    if (!m.ok) throw new Error();
    const world = sceneToWorld(doc, child.id, [
      child.size[0] / 2,
      child.size[1] / 2,
    ]);
    expect(world.ok).toBe(true);
    if (world.ok) near(world.value, [m.value[12]!, m.value[13]!, m.value[14]!]);
    expect(sceneToWorld(doc, "missing", [0, 0]).ok).toBe(false);
    expect(
      projectScenePoint(
        doc,
        "missing",
        { position: [0, 0, 0], rotation: [0, 0, 0, 1], zoom: 1 },
        [0, 0],
      ).ok,
    ).toBe(false);
  });
  it("refuses points behind the eye plane and edge-on planes", () => {
    const doc = nested();
    const scene = doc.scenes[0]!;
    const camera: CameraPose = {
      position: [0, 0, 5000],
      rotation: [0, 0, 0, 1],
      zoom: 1,
    };
    // Scene plane far in front of the camera reference plane: z > perspective.
    expect(
      projectScenePoint(
        doc,
        scene.id,
        { ...camera, position: [0, 0, -5000] },
        [0, 0],
      ).ok,
    ).toBe(false);
    const edgeOn: CameraPose = {
      position: [0, 0, 0],
      rotation: sceneQuaternion([0, 90, 0]),
      zoom: 1,
    };
    const flat = {
      ...doc,
      scenes: [
        {
          ...scene,
          rotation: [0, 0, 0] as [number, number, number],
          parentId: null,
        },
      ],
    };
    expect(unprojectScenePoint(flat, scene.id, edgeOn, [640, 360]).ok).toBe(
      false,
    );
    expect(projectScenePoint(doc, scene.id, camera, [0, 0]).ok).toBe(true);
  });
});
describe("contrast", () => {
  it("computes WCAG ratios", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 9);
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 9);
    expect(contrastRatio("#215baf", "#215baf")).toBe(1);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
    expect(contrastRatio("#172035", "#ffffff")).toBeGreaterThan(4.5);
  });
  it("warns about low text and component contrast without correcting colours", () => {
    const doc = nested();
    expect(contrastIssues(doc)).toEqual([]);
    doc.theme.palette.push({ id: "pale", value: "#cccccc" });
    doc.theme.colors.text = "pale";
    doc.scenes[0]!.appearance.background = "accent";
    doc.scenes[1]!.appearance.variant = "plain";
    doc.scenes[2]!.blocks[0]!.style = { color: "backdrop" };
    doc.theme.colors.accent = "backdrop";
    const before = structuredClone(doc.theme);
    const issues = contrastIssues(doc);
    expect(issues.map((i) => [i.pointer, i.kind, i.minimum])).toEqual([
      ["/theme/colors/text", "text", 4.5],
      ["/theme/colors/accent", "component", 3],
      ["/scenes/0/appearance", "text", 4.5],
      ["/scenes/1/appearance", "text", 4.5],
      ["/scenes/2/blocks/0/style/color", "text", 4.5],
    ]);
    expect(doc.theme).toEqual(before);
    expect(contrastDiagnostics(doc)[0]).toMatchObject({
      code: "LOW_CONTRAST",
      severity: "warning",
      pointer: "/theme/colors/text",
    });
  });
});
