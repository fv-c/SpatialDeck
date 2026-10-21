import { expect, it } from "vitest";
import { NavigationMachine, validateDocument } from "../src/index.js";
import fixture from "../../../examples/core-three-scenes/project.json";
import type { EventSink, ProjectDocument } from "../src/index.js";
function setup(alter?: (d: ProjectDocument) => void) {
  const result = validateDocument(fixture);
  if (!result.ok) throw Error();
  alter?.(result.value);
  let time = 0;
  const events: string[] = [];
  const sink: EventSink = (name) => {
    events.push(name);
  };
  const machine = new NavigationMachine(
    result.value,
    "test",
    () => time,
    sink,
    () => {},
  );
  return {
    machine,
    events,
    advance: (ms: number) => {
      time += ms;
      machine.tick();
    },
    time: (ms: number) => {
      time += ms;
    },
  };
}
it("initial visit and next/prev endpoints", async () => {
  const { machine: m, advance, events } = setup();
  expect(m.getState().history.map((v) => v.nodeId)).toEqual(["n1"]);
  expect((await m.prev()).status).toBe("noop");
  const n = m.next();
  expect(m.getState().nodeId).toBe("n1");
  advance(600);
  expect(await n).toEqual({ status: "completed" });
  const p = m.prev();
  advance(600);
  expect((await p).status).toBe("completed");
  expect(m.getState().history.map((v) => v.nodeId)).toEqual(["n1"]);
  expect(events).toEqual([
    "navigationstart",
    "scenechange",
    "navigationend",
    "navigationstart",
    "scenechange",
    "navigationend",
  ]);
  await m.goTo({ nodeId: "n3" }, { durationMs: 0 });
  expect((await m.next()).status).toBe("noop");
});
it("invalid commands and noops do not interrupt a valid transition", async () => {
  const { machine: m, advance } = setup();
  const p = m.next();
  for (const q of [
    m.goTo({ nodeId: "unknown" }),
    m.goTo({ nodeId: "n3" }, { durationMs: NaN }),
    m.setPath("unknown"),
    m.next({ edgeId: "unknown" }),
  ])
    expect((await q).status).toBe("error");
  expect((await m.goTo({ nodeId: "n1" })).status).toBe("noop");
  expect((await m.prev()).status).toBe("noop");
  advance(600);
  expect((await p).status).toBe("completed");
});
it("latest-wins for ten rapid next commands without skipping nodes or phantom visits", async () => {
  const { machine: m, advance, events } = setup();
  const promises = Array.from({ length: 10 }, () => m.next());
  advance(600);
  expect((await Promise.all(promises)).map((r) => r.status)).toEqual([
    ...Array(9).fill("cancelled"),
    "completed",
  ]);
  expect(m.getState().history.map((v) => v.nodeId)).toEqual(["n1", "n2"]);
  expect(events.filter((e) => e === "navigationcancel")).toHaveLength(9);
  expect(events.filter((e) => e === "navigationend")).toHaveLength(1);
});
it("interruption samples the current pose and prev follows completed history", async () => {
  const { machine: m, advance } = setup();
  const a = m.goTo({ nodeId: "n2" });
  advance(300);
  const current = m.getState().camera;
  const b = m.goTo({ nodeId: "n3" });
  expect((await a).status).toBe("cancelled");
  expect(m.getState().camera).toEqual(current);
  advance(600);
  await b;
  expect(m.getState().history.map((v) => v.nodeId)).toEqual(["n1", "n3"]);
  const back = m.prev();
  advance(600);
  await back;
  expect(m.getState().nodeId).toBe("n1");
});
it("AbortSignal freezes current pose, removes handler and resolves once", async () => {
  const { machine: m, advance, events } = setup();
  const ac = new AbortController();
  const p = m.goTo({ nodeId: "n3" }, { signal: ac.signal });
  advance(200);
  const pose = m.getState().camera;
  ac.abort();
  expect((await p).status).toBe("cancelled");
  advance(2000);
  expect(m.getState().camera).toEqual(pose);
  expect(m.getState().history).toHaveLength(1);
  expect(events).toEqual(["navigationstart", "navigationcancel"]);
  expect((await m.goTo({ nodeId: "n2" }, { signal: ac.signal })).status).toBe(
    "cancelled",
  );
});
it("setPath validates first, resets history, starts immediately or empties", async () => {
  const { machine: m, advance } = setup((d) => {
    d.paths.push(
      { ...structuredClone(d.paths[0]!), id: "other" },
      { id: "empty", name: "Empty", startNodeId: null, nodes: [], edges: [] },
    );
  });
  const p = m.next();
  await m.setPath("other");
  expect((await p).status).toBe("cancelled");
  expect(m.getState().history).toHaveLength(1);
  expect(m.getState().pathId).toBe("other");
  const q = m.next();
  advance(600);
  await q;
  await m.setPath("empty");
  expect(m.getState()).toMatchObject({
    status: "empty",
    history: [],
    nodeId: null,
    camera: null,
  });
  await m.goTo({ pathId: "main", nodeId: "n2" }, { durationMs: 0 });
  expect(m.getState().history.map((v) => v.nodeId)).toEqual(["n2"]);
});
it("empty/no-default documents are valid runtime states", async () => {
  for (const alter of [
    (d: ProjectDocument) => {
      d.paths = [];
      d.defaultPathId = null;
    },
    (d: ProjectDocument) => {
      d.defaultPathId = null;
    },
    (d: ProjectDocument) => {
      d.paths = [
        { id: "empty", name: "", startNodeId: null, nodes: [], edges: [] },
      ];
      d.defaultPathId = "empty";
    },
  ]) {
    const { machine: m } = setup(alter);
    expect(m.getState().status).toBe("empty");
    expect((await m.next()).status).toBe("noop");
  }
});
it("hidden tab freezes active time and resumes without jumping", async () => {
  const { machine: m, advance } = setup();
  const p = m.next();
  advance(200);
  m.setHidden(true);
  const pose = m.getState().camera;
  advance(20000);
  expect(m.getState().camera).toEqual(pose);
  m.setHidden(false);
  advance(399);
  expect(m.getState().status).toBe("transitioning");
  advance(1);
  expect((await p).status).toBe("completed");
});
it("reduced motion before/during transition completes exactly once", async () => {
  const { machine: m, events } = setup();
  const p = m.next();
  m.setReduced(true);
  expect((await p).status).toBe("completed");
  expect((await m.next()).status).toBe("completed");
  expect(events).toEqual([
    "navigationstart",
    "scenechange",
    "navigationend",
    "navigationstart",
    "scenechange",
    "navigationend",
  ]);
});
it("zero duration emits ordered events before Promise completion", async () => {
  const { machine: m, events } = setup();
  const p = m.goTo({ nodeId: "n3" }, { durationMs: 0 }).then((r) => {
    events.push("promise");
    return r;
  });
  expect(events).toEqual(["navigationstart", "scenechange", "navigationend"]);
  await p;
  expect(events.at(-1)).toBe("promise");
});
it("state snapshots cannot mutate navigation state", () => {
  const { machine: m } = setup();
  const snapshot = m.getState();
  snapshot.history[0]!.camera.position[0] = 42;
  snapshot.history = [];
  expect(m.getState().history[0]!.camera.position[0]).toBe(0);
});
it("destroy is idempotent, cancels pending and all commands fail afterward", async () => {
  const { machine: m, events } = setup();
  const p = m.next();
  m.destroy();
  m.destroy();
  expect((await p).status).toBe("cancelled");
  expect(events.filter((e) => e === "navigationcancel")).toHaveLength(1);
  for (const command of [
    m.next(),
    m.prev(),
    m.goTo({ nodeId: "n2" }),
    m.setPath("main"),
  ])
    expect(await command).toMatchObject({
      status: "error",
      diagnostic: { code: "PLAYER_DESTROYED" },
    });
});
it("reentrant cancellation handlers cannot orphan a Promise", async () => {
  const result = validateDocument(fixture);
  if (!result.ok) throw Error();
  let at = 0;
  let replacement: Promise<unknown> | undefined;
  let once = true;
  const m = new NavigationMachine(
    result.value,
    "reentrant",
    () => at,
    (name) => {
      if (name === "navigationcancel" && once) {
        once = false;
        replacement = m.goTo({ nodeId: "n3" });
      }
    },
    () => {},
  );
  const a = m.next(),
    b = m.goTo({ nodeId: "n2" });
  expect((await a).status).toBe("cancelled");
  expect((await b).status).toBe("cancelled");
  at = 600;
  m.tick();
  await replacement;
  expect(m.getState().nodeId).toBe("n3");
});
it("destroy from navigationcancel never starts a replacement", async () => {
  const result = validateDocument(fixture);
  if (!result.ok) throw Error();
  const m = new NavigationMachine(
    result.value,
    "reentrant",
    () => 0,
    (name) => {
      if (name === "navigationcancel") m.destroy();
    },
    () => {},
  );
  const a = m.next(),
    b = m.goTo({ nodeId: "n3" });
  expect((await a).status).toBe("cancelled");
  expect((await b).status).toBe("cancelled");
  expect(m.getState().status).toBe("destroyed");
});
