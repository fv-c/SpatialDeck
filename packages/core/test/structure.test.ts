import { describe, expect, it } from "vitest";
import Ajv from "ajv/dist/2020.js";
import { mat4 } from "gl-matrix";
import legacy from "../../../examples/core-three-scenes/project.json";
import fixture from "../../../examples/structure-branching/project.json";
import schema from "../schema/project-1.1.0.schema.json";
import {
  authoredCameraPose,
  cameraPose,
  getWorldMatrix,
  inspectCamera,
  migrateDocument,
  NavigationMachine,
  reparentScene,
  resolveSceneCamera,
  resolveEdgePlan,
  resolveCameraTrack,
  sceneMatrix,
  serializeDocument,
  sampleTransition,
  trackWithinRange,
  updateCapabilities,
  validateDocument,
  worldPositionToLocal,
} from "../src/index.js";
import type {
  CameraPose,
  EventSink,
  PlayerEvents,
  ProjectDocument,
  Result,
} from "../src/index.js";
const value = <T>(r: Result<T>): T => {
  if (!r.ok) throw new Error(JSON.stringify(r));
  return r.value;
};
export const structure = () => value(validateDocument(fixture));
function setup(alter?: (doc: ProjectDocument) => void) {
  const doc = structure();
  alter?.(doc);
  let time = 0;
  const events: Array<{ name: keyof PlayerEvents; event: unknown }> = [];
  const sink: EventSink = (name, event) => {
    events.push({ name, event });
  };
  const m = new NavigationMachine(
    doc,
    "structure",
    () => time,
    sink,
    () => {},
  );
  return {
    m,
    doc,
    events,
    advance: (ms: number) => {
      time += ms;
      m.tick();
    },
    time: (ms: number) => {
      time += ms;
    },
  };
}
const close = (a: number[], b: number[], tolerance = 1e-6) =>
  a.forEach((n, i) =>
    expect(Math.abs(n - b[i]!)).toBeLessThanOrEqual(tolerance),
  );
describe("schema 1.1 and migration", () => {
  it("strict exported schema validates the real branching fixture", () => {
    expect(new Ajv({ strict: true }).compile(schema)(fixture)).toBe(true);
  });
  it("migrates in copy, preserves every old field and is idempotent", () => {
    const before = structuredClone(legacy),
      current = value(migrateDocument(legacy));
    expect(legacy).toEqual(before);
    expect(current.schemaVersion).toBe("1.3.0");
    expect(current.requiredCapabilities).toEqual(["linear"]);
    expect(current.paths).toEqual(legacy.paths);
    expect(
      current.scenes.map(({ parentId, layout, appearance, ...s }) => {
        expect(parentId).toBeNull();
        expect(layout).toBe("flow");
        expect(appearance).toEqual({
          variant: "card",
          background: null,
          titleVisible: true,
        });
        return s;
      }),
    ).toEqual(legacy.scenes);
    expect(value(migrateDocument(current))).toEqual(current);
    expect(value(validateDocument(value(serializeDocument(current))))).toEqual(
      current,
    );
  });
  it("old nonlinear documents stay invalid before migration", () => {
    const d = structuredClone(legacy);
    d.paths[0]!.edges[1]!.from = "n1";
    expect(migrateDocument(d).ok).toBe(false);
  });
  it.each([
    [
      "missing parent",
      (d: ProjectDocument) => {
        d.scenes[0]!.parentId = "absent";
      },
    ],
    [
      "self parent",
      (d: ProjectDocument) => {
        d.scenes[0]!.parentId = "A";
      },
    ],
    [
      "parent cycle",
      (d: ProjectDocument) => {
        d.scenes[0]!.parentId = "B";
      },
    ],
    [
      "invisible ancestor",
      (d: ProjectDocument) => {
        d.scenes[0]!.visible = false;
      },
    ],
    [
      "unknown track",
      (d: ProjectDocument) => {
        d.paths[0]!.edges[0]!.cameraTrackId = "missing";
      },
    ],
    [
      "duplicate track",
      (d: ProjectDocument) => {
        d.cameraTracks.push(d.cameraTracks[0]!);
      },
    ],
    [
      "duplicate cue",
      (d: ProjectDocument) => {
        d.cues.push(d.cues[0]!);
      },
    ],
    [
      "unknown cue edge",
      (d: ProjectDocument) => {
        d.cues[0]!.edgeId = "missing";
      },
    ],
    [
      "cue past endpoint",
      (d: ProjectDocument) => {
        d.cues[0]!.atMs = 1201;
      },
    ],
    [
      "cue executable name",
      (d: ProjectDocument) => {
        d.cues[0]!.event = "alert(1)";
      },
    ],
    [
      "missing capability",
      (d: ProjectDocument) => {
        d.requiredCapabilities = ["linear"];
      },
    ],
    [
      "null nonempty start",
      (d: ProjectDocument) => {
        d.paths[0]!.startNodeId = null;
      },
    ],
    [
      "unknown start",
      (d: ProjectDocument) => {
        d.paths[0]!.startNodeId = "missing";
      },
    ],
    [
      "no loop policy",
      (d: ProjectDocument) => {
        delete d.paths[0]!.loopPolicy;
      },
    ],
    [
      "unguarded cycle edge",
      (d: ProjectDocument) => {
        delete d.paths[0]!.edges[0]!.condition;
      },
    ],
    [
      "duplicate keyframe time",
      (d: ProjectDocument) => {
        d.cameraTracks[0]!.keyframes[1]!.at = 0;
      },
    ],
    [
      "out of order keyframe",
      (d: ProjectDocument) => {
        d.cameraTracks[0]!.keyframes[1]!.at = 1;
      },
    ],
    [
      "missing initial keyframe",
      (d: ProjectDocument) => {
        d.cameraTracks[0]!.keyframes[0]!.at = 0.1;
      },
    ],
    [
      "missing final keyframe",
      (d: ProjectDocument) => {
        d.cameraTracks[0]!.keyframes.at(-1)!.at = 0.9;
      },
    ],
    [
      "short track",
      (d: ProjectDocument) => {
        d.cameraTracks[0]!.keyframes.pop();
        d.cameraTracks[0]!.keyframes.pop();
      },
    ],
    [
      "track limit",
      (d: ProjectDocument) => {
        d.cameraTracks[0]!.keyframes = Array.from({ length: 201 }, (_, i) => ({
          at: i / 200,
          pose: d.cameraTracks[0]!.keyframes[0]!.pose,
        }));
      },
    ],
    [
      "ambiguous cue edge",
      (d: ProjectDocument) => {
        d.paths[1]!.edges[0]!.id = "AB";
      },
    ],
  ] as const)("rejects %s without changing input", (_, mutate) => {
    const d = structure();
    mutate(d);
    const before = structuredClone(d);
    expect(validateDocument(d).ok).toBe(false);
    expect(d).toEqual(before);
  });
  it("permits independent empty paths and repeated scene visits", () => {
    const d = structure();
    d.paths.push({
      id: "empty",
      name: "",
      nodes: [],
      edges: [],
      startNodeId: null,
    });
    d.paths[0]!.nodes.find((n) => n.id === "C")!.sceneId = "B";
    expect(validateDocument(d).ok).toBe(true);
  });
  it("rejects cubic extrema outside coordinates even when every keyframe is in range", () => {
    const d = structure();
    const t = d.cameraTracks[0]!;
    t.keyframes = [-1000000, 1000000, 1000000, -1000000].map((x, i) => ({
      at: i / 3,
      pose: { position: [x, 0, 0], rotation: [0, 0, 0], zoom: 1 },
    }));
    expect(validateDocument(d)).toMatchObject({
      ok: false,
      diagnostics: [{ code: "TRACK_RANGE" }],
    });
  });
});
describe("hierarchy geometry", () => {
  it("composes three noncommutative levels against independent 90 degree points", () => {
    const d = structure();
    d.scenes[0]!.position = [10, 20, 30];
    d.scenes[0]!.rotation = [90, 0, 0];
    d.scenes[0]!.scale = 2;
    const b = d.scenes.find((s) => s.id === "B")!;
    b.position = [4, 5, 6];
    b.rotation = [0, 90, 0];
    b.scale = 0.5;
    const c = d.scenes.find((s) => s.id === "C")!;
    c.parentId = "B";
    c.position = [1, 2, 3];
    c.rotation = [0, 0, 90];
    const m = value(getWorldMatrix(d, "C"));
    // local origin -> B: [7,7,5], then A: [24,10,44]. local X -> C Y -> B Y -> A Z.
    close(m.slice(12, 15), [21, 9, 42]);
    close([m[0]!, m[1]!, m[2]!], [0, 0, 1]);
  });
  it.each([
    [23, -35, 71],
    [0, 90, 30],
    [40, -90, 13],
  ] as const)(
    "reparents and unparents at gimbal %s with world error <=1e-6",
    (rx, ry, rz) => {
      const d = structure();
      d.scenes.find((s) => s.id === "B")!.rotation = [rx, ry, rz];
      const old = value(getWorldMatrix(d, "B"));
      const changed = value(reparentScene(d, "B", "C"));
      close(value(getWorldMatrix(changed, "B")), old);
      close(
        value(getWorldMatrix(value(reparentScene(changed, "B", null)), "B")),
        old,
      );
      expect(d.scenes.find((s) => s.id === "B")!.parentId).toBe("A");
    },
  );
  it("reparents preserving local only when explicitly requested", () => {
    const d = structure();
    const changed = value(reparentScene(d, "B", "C", false));
    expect(changed.scenes.find((s) => s.id === "B")!.position).toEqual(
      d.scenes.find((s) => s.id === "B")!.position,
    );
    expect(value(getWorldMatrix(changed, "B"))).not.toEqual(
      value(getWorldMatrix(d, "B")),
    );
  });
  it("rejects cycles, absent parents, unknown scene and out of range decomposition atomically", () => {
    const d = structure(),
      before = structuredClone(d);
    for (const [id, parent] of [
      ["A", "B"],
      ["B", "B"],
      ["B", "missing"],
      ["missing", "A"],
    ])
      expect(reparentScene(d, id!, parent!).ok).toBe(false);
    d.scenes.find((s) => s.id === "C")!.scale = 0.0001;
    d.scenes.find((s) => s.id === "B")!.scale = 10000;
    expect(reparentScene(d, "B", "C").ok).toBe(false);
    expect(before).toEqual(structure());
  });
  it("allows 32 levels and rejects level 33 without stack overflow", () => {
    const d = structure();
    d.paths = [];
    d.defaultPathId = null;
    d.cameraTracks = [];
    d.cues = [];
    d.scenes = Array.from({ length: 32 }, (_, i) => ({
      ...structuredClone(d.scenes[0]!),
      id: `s${i}`,
      parentId: i ? `s${i - 1}` : null,
    }));
    expect(validateDocument(d).ok).toBe(true);
    d.scenes.push({ ...d.scenes[0]!, id: "s32", parentId: "s31" });
    expect(validateDocument(d).ok).toBe(false);
    expect(getWorldMatrix(d, "s32").ok).toBe(false);
  });
  it("explains a deep scene that cannot be framed: nested scales exhaust the zoom range", () => {
    const d = structure();
    d.cameraTracks = [];
    d.cues = [];
    d.scenes = Array.from({ length: 16 }, (_, i) => ({
      ...structuredClone(d.scenes[0]!),
      id: `s${i}`,
      parentId: i ? `s${i - 1}` : null,
      scale: i ? 0.5 : 1,
    }));
    d.paths = [
      {
        id: "deep",
        name: "Deep",
        startNodeId: "n15",
        nodes: [{ id: "n15", sceneId: "s15", holdMs: 0 }],
        edges: [],
      },
    ];
    d.defaultPathId = "deep";
    const r = validateDocument(d);
    expect(r.ok).toBe(false);
    const camera = r.diagnostics.find(
      (x) => x.code === "INVALID_WORLD_CAMERA",
    )!;
    expect(camera.pointer).toBe("/paths/0/nodes/0");
    // 0.5^15 world scale: the fit zoom is far beyond 10000.
    expect(camera.message).toMatch(
      /needs zoom [\d.e+]+, outside 0\.0001–10000/,
    );
    expect(camera.message).toContain("world scale is 0.0000305");
  });
  it("fits world orientation and scale; inverse mapping keeps world drag on XY plane", () => {
    const d = structure();
    const m = value(getWorldMatrix(d, "B")),
      camera = value(resolveSceneCamera(d, "B"));
    close(camera.position, m.slice(12, 15));
    expect(camera.zoom).toBeCloseTo(
      (0.9 * Math.min(1280 / 700, 720 / 400)) / 0.7,
    );
    const local = value(worldPositionToLocal(d, "B", [1200, 200, -150]));
    const parent = value(getWorldMatrix(d, "A"));
    close(
      [0, 1, 2].map(
        (i) =>
          parent[i]! * local[0] +
          parent[i + 4]! * local[1] +
          parent[i + 8]! * local[2] +
          parent[i + 12]!,
      ),
      [1200, 200, -150],
    );
  });
  it("authored/runtime conversions preserve gimbal matrices", () => {
    for (const r of [
      [20, 90, 30],
      [20, -90, 50],
      [31, 21, -57],
    ] as const) {
      const a = {
        position: [1, 2, 3] as [number, number, number],
        rotation: [...r] as [number, number, number],
        zoom: 2,
      };
      const b = authoredCameraPose(cameraPose(a));
      close(sceneMatrix({ ...a, scale: 1 }), sceneMatrix({ ...b, scale: 1 }));
    }
  });
  it("matrix inversion retains precision on deeply composed arbitrary poses", () => {
    const d = structure();
    const m = value(getWorldMatrix(d, "B")),
      inverse = mat4.invert(new Array<number>(16).fill(0), m)!;
    close(
      Array.from(mat4.multiply(new Array<number>(16).fill(0), inverse, m)),
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    );
  });
});
describe("graph visits, tracks and cues", () => {
  it.each([
    ["AB", "BD", "B"],
    ["AC", "CD", "C"],
  ] as const)(
    "follows %s/%s and prev returns actual %s visit",
    async (first, last, previous) => {
      const { m, advance } = setup();
      expect((await m.next()).status).toBe("choice-required");
      const a = m.next({ edgeId: first });
      advance(1200);
      await a;
      const pose = m.getState().camera;
      const b = m.next({ edgeId: last });
      advance(1200);
      await b;
      const back = m.prev();
      advance(600);
      await back;
      expect(m.getState().nodeId).toBe(previous);
      expect(m.getState().camera).toEqual(pose);
      expect(m.getState().history.map((v) => v.nodeId)).toEqual([
        "A",
        previous,
      ]);
    },
  );
  it("manual sole exit requires explicit choice, while repeated scene visits have distinct IDs", async () => {
    const { m, advance } = setup((d) => {
      d.paths[0]!.nodes.find((n) => n.id === "B")!.sceneId = "A";
    });
    const initial = m.getState().history[0]!.visitId;
    const p = m.next({ edgeId: "AB" });
    advance(1200);
    await p;
    const before = m.getState();
    expect(before.sceneId).toBe("A");
    expect(before.history.at(-1)!.visitId).not.toBe(initial);
    expect((await m.next()).status).toBe("choice-required");
    expect(m.getState()).toEqual(before);
  });
  it("choice/noop/invalid selection never interrupts a pending track or mutates state", async () => {
    const { m, advance } = setup();
    const p = m.next({ edgeId: "AB" });
    advance(200);
    const before = m.getState();
    expect((await m.next()).status).toBe("choice-required");
    expect((await m.goTo({ nodeId: "A" })).status).toBe("noop");
    expect((await m.next({ edgeId: "missing" })).status).toBe("error");
    expect(m.getState()).toEqual(before);
    advance(1000);
    expect((await p).status).toBe("completed");
  });
  it("loop limits disable only exhausted destinations, permit self visits, prev and path reset", async () => {
    const { m } = setup();
    m.setReduced(true);
    for (const edgeId of ["AB", "BD", "DA", "AC", "CD"])
      expect((await m.next({ edgeId })).status).toBe("completed");
    expect(m.getState().history.map((v) => v.nodeId)).toEqual([
      "A",
      "B",
      "D",
      "A",
      "C",
      "D",
    ]);
    expect((await m.next({ edgeId: "DA" })).diagnostic?.code).toBe(
      "VISIT_LIMIT",
    );
    expect((await m.next()).status).toBe("noop");
    expect(m.getState().choices.every((c) => c.disabledReason)).toBe(true);
    await m.prev();
    expect(m.getState().nodeId).toBe("C");
    await m.setPath("alternate");
    expect(m.getState().history).toHaveLength(1);
    await m.setPath("branch");
    await m.goTo({ nodeId: "D" });
    const initial = m.getState().history.at(-1)!.visitId;
    await m.next({ edgeId: "DD" });
    expect(m.getState().history.at(-1)!.visitId).not.toBe(initial);
  });
  it("edge visit-limit counts completed target visits, not aborted destinations", async () => {
    const { m, advance } = setup((d) => {
      d.paths[0]!.edges[4]!.condition = { kind: "visit-limit", maxVisits: 1 };
    });
    await m.goTo({ nodeId: "D" }, { durationMs: 0 });
    expect((await m.next({ edgeId: "DA" })).diagnostic?.code).toBe(
      "VISIT_LIMIT",
    );
    const a = m.next({ edgeId: "DD" });
    advance(10);
    m.setView("scene");
    expect((await a).status).toBe("cancelled");
    expect(m.getState().history).toHaveLength(2);
  });
  it("keeps independent endpoint and never snaps to semantic target fit", async () => {
    const { m, advance, doc } = setup();
    const p = m.next({ edgeId: "AB" });
    advance(1200);
    await p;
    const expected = cameraPose(doc.cameraTracks[0]!.keyframes.at(-1)!.pose);
    expect(m.getState().camera).toEqual(expected);
    expect(m.getState().camera).not.toEqual(
      value(resolveSceneCamera(doc, "B")),
    );
  });
  it("applies track easing once and ignores edge easing, slerps rotations, logarithmic zoom", () => {
    const { doc } = setup((d) => {
      d.cameraTracks[0]!.interpolation = "linear";
      d.cameraTracks[0]!.easing = "ease-in-out";
    });
    const plan = value(resolveEdgePlan(doc, "branch", "AB"));
    const sample = sampleTransition(plan, 300);
    expect(sample.camera.position[0]).toBeCloseTo(450 * 0.3125);
    expect(sample.camera.zoom).toBeCloseTo(
      Math.exp(
        Math.log(plan.from.zoom) +
          (Math.log(0.75) - Math.log(plan.from.zoom)) * 0.3125,
      ),
    );
  });
  it("ten rapid track interruptions preserve camera, suppress future cues and commit one visit", async () => {
    const { m, advance, events, doc } = setup(),
      before = structuredClone(doc);
    const pending = [];
    for (let i = 0; i < 10; i++) {
      const pose = m.getState().camera;
      pending.push(m.next({ edgeId: "AB" }));
      expect(m.getState().camera).toEqual(pose);
      advance(30);
    }
    advance(1200);
    expect((await Promise.all(pending)).map((r) => r.status)).toEqual([
      ...Array(9).fill("cancelled"),
      "completed",
    ]);
    expect(m.getState().history.map((v) => v.nodeId)).toEqual(["A", "B"]);
    expect(doc).toEqual(before);
    expect(
      events.filter(
        (e) =>
          e.name === "cue" &&
          (e.event as PlayerEvents["cue"]).cue.id === "midpoint",
      ),
    ).toHaveLength(1);
    const ids = events
      .filter((e) => e.name === "cue")
      .map((e) => {
        const v = e.event as PlayerEvents["cue"];
        return `${v.transitionId}/${v.cue.id}`;
      });
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("Abort freezes a track, interrupted prev leaves history intact and inspection creates no visits", async () => {
    const { m, advance } = setup();
    const controller = new AbortController();
    const p = m.goTo({ nodeId: "B" }, { signal: controller.signal });
    advance(300);
    const pose = m.getState().camera;
    controller.abort();
    await p;
    advance(900);
    expect(m.getState().camera).toEqual(pose);
    expect(m.getState().history).toHaveLength(1);
    await m.goTo({ nodeId: "C" }, { durationMs: 0 });
    const history = m.getState().history;
    const back = m.prev();
    advance(100);
    expect(m.setView("overview").ok).toBe(true);
    expect((await back).status).toBe("cancelled");
    expect(m.getState().history).toEqual(history);
    expect(m.setView("scene").ok).toBe(true);
    close(m.getState().camera!.rotation, history.at(-1)!.camera.rotation);
    expect(m.getState().camera!.position).toEqual(
      history.at(-1)!.camera.position,
    );
  });
  it("capture sampling changes neither visits nor event counts; node camera is independent", async () => {
    const { m, doc, events } = setup((d) => {
      d.paths[0]!.nodes[2]!.camera = {
        position: [11, 22, 33],
        rotation: [0, 80, 0],
        zoom: 2,
      };
    });
    const before = m.getState(),
      count = events.length;
    const plan = value(resolveEdgePlan(doc, "branch", "AB"));
    for (let i = 0; i <= 20; i++) sampleTransition(plan, i * 60);
    expect(m.getState()).toEqual(before);
    expect(events).toHaveLength(count);
    await m.goTo({ nodeId: "C" }, { durationMs: 0 });
    expect(m.getState().camera!.position).toEqual([11, 22, 33]);
  });
  it("zero duration, hidden time and changing reduced motion emit each cue in threshold order once", async () => {
    const { m, events, advance } = setup();
    const p = m.next({ edgeId: "AB" });
    advance(400);
    m.setHidden(true);
    const pose = m.getState().camera;
    advance(30000);
    expect(m.getState().camera).toEqual(pose);
    expect(events.filter((e) => e.name === "cue")).toHaveLength(1);
    m.setHidden(false);
    advance(200);
    m.setReduced(true);
    await p;
    m.tick();
    expect(
      events
        .filter((e) => e.name === "cue")
        .map((e) => (e.event as PlayerEvents["cue"]).cue.id),
    ).toEqual(["entry", "midpoint", "arrival"]);
    expect(events.filter((e) => e.name === "navigationend")).toHaveLength(1);
    await m.setPath("branch");
    events.length = 0;
    await m.next({ edgeId: "AB" });
    expect(events.map((e) => e.name)).toEqual([
      "navigationstart",
      "cue",
      "cue",
      "cue",
      "scenechange",
      "navigationend",
    ]);
  });
  it("invalid path does not cancel, valid change resets history and suppresses pending cues", async () => {
    const { m, advance, events } = setup();
    const p = m.next({ edgeId: "AB" });
    advance(100);
    expect((await m.setPath("missing")).status).toBe("error");
    await m.setPath("alternate");
    expect((await p).status).toBe("cancelled");
    advance(2000);
    expect(m.getState().history.map((v) => v.nodeId)).toEqual(["alt-C"]);
    expect(events.filter((e) => e.name === "cue")).toHaveLength(1);
  });
  it("reentrant cue handler can cancel without phantom commit or future cues", async () => {
    const doc = structure();
    const cues: string[] = [];
    const machine = new NavigationMachine(
      doc,
      "cue-reentrant",
      () => 0,
      (name, payload) => {
        if (name === "cue") {
          cues.push((payload as PlayerEvents["cue"]).cue.id);
          machine.destroy();
        }
      },
      () => {},
    );
    const result = await machine.goTo({ nodeId: "B" }, { durationMs: 0 });
    expect(result.status).toBe("cancelled");
    expect(cues).toEqual(["entry"]);
    expect(machine.getState().history).toHaveLength(1);
  });
  it("inspection rejects malformed poses without cancelling movement and supports snapshot isolation", async () => {
    const { m, advance } = setup();
    const p = m.next({ edgeId: "AB" });
    const before = m.getState();
    for (const pose of [
      { position: [NaN, 0, 0], rotation: [0, 0, 0, 1], zoom: 1 },
      { position: [0, 0, 0], rotation: [0, 0, 0, 0], zoom: 1 },
      { position: [0, 0, 0], rotation: [0, 0, 0, 1], zoom: 0 },
    ])
      expect(m.setCamera(pose as CameraPose).ok).toBe(false);
    expect(m.getState()).toEqual(before);
    advance(1200);
    await p;
    const pose = m.getState().camera!;
    expect(m.setCamera(pose).ok).toBe(true);
    pose.position[0] = 1;
    expect(m.getState().camera!.position[0]).not.toBe(1);
    m.destroy();
    expect(m.setCamera(pose).ok).toBe(false);
    expect(m.setView("overview").ok).toBe(false);
  });
  it("checks runtime substituted cubic extrema before cancelling a valid plan", async () => {
    const { m, doc, advance } = setup((d) => {
      const t = d.cameraTracks[0]!;
      t.keyframes = [1000000, 1000000, 1000000, 1000000].map((x, i) => ({
        at: i / 3,
        pose: { position: [x, 0, 0], rotation: [0, 0, 0], zoom: 1 },
      }));
    });
    expect(
      trackWithinRange(
        resolveCameraTrack(
          doc.cameraTracks[0]!,
          cameraPose(doc.cameraTracks[0]!.keyframes[0]!.pose),
        ),
      ),
    ).toBe(true);
    expect(resolveEdgePlan(doc, "branch", "AB").ok).toBe(false);
    const p = m.goTo({ nodeId: "C" });
    expect((await m.next({ edgeId: "AB" })).diagnostic?.code).toBe(
      "TRACK_RANGE",
    );
    advance(1200);
    expect((await p).status).toBe("completed");
  });
  it("capability helper adds structure only when actually used", () => {
    const doc = value(migrateDocument(legacy));
    updateCapabilities(doc);
    expect(doc.requiredCapabilities).toEqual(["linear"]);
    doc.paths[0]!.nodes[0]!.camera = {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      zoom: 1,
    };
    updateCapabilities(doc);
    expect(doc.requiredCapabilities).toContain("structure");
  });
});
it("cue inspection cancels immediately without recursive cues or phantom completion", async () => {
  const cues: string[] = [];
  const doc = structure();
  const m = new NavigationMachine(
    doc,
    "cue-inspection",
    () => 0,
    (name, event) => {
      if (name === "cue") {
        cues.push((event as PlayerEvents["cue"]).cue.id);
        m.setView("scene");
      }
    },
    () => {},
  );
  expect((await m.goTo({ nodeId: "B" }, { durationMs: 0 })).status).toBe(
    "cancelled",
  );
  expect(cues).toEqual(["entry"]);
  expect(m.getState().history).toHaveLength(1);
});
it("reports scene points at or behind the perspective singularity as inspection warnings", () => {
  const d = structure();
  const warnings = inspectCamera(d, {
    position: [0, 0, -2000],
    rotation: [0, 0, 0, 1],
    zoom: 1,
  });
  expect(warnings.length).toBeGreaterThan(0);
  expect(warnings[0]!.severity).toBe("warning");
  expect(warnings[0]!.code).toBe("PERSPECTIVE_PLANE");
  expect(
    inspectCamera(d, {
      position: [0, 0, 2000],
      rotation: [0, 0, 0, 1],
      zoom: 1,
    }),
  ).toEqual([]);
});
