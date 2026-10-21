import { expect, it } from "vitest";
import fixture from "../../../examples/core-three-scenes/project.json";
import { NavigationMachine } from "../src/navigation/index.js";
import { validateDocument } from "../src/document/index.js";
const document = () => {
  const result = validateDocument(fixture);
  if (!result.ok) throw new Error("Invalid fixture");
  return result.value;
};
it("replacement cancels without committing a ghost visit and retains current node at recomputed pose", async () => {
  let time = 0;
  const events: string[] = [];
  const machine = new NavigationMachine(
    document(),
    "update",
    () => time,
    (event) => events.push(event),
    () => {},
  );
  events.length = 0;
  const pending = machine.next();
  time = 100;
  const next = document();
  next.scenes[0]!.position = [200, 300, 400];
  machine.replaceDocument(next);
  expect((await pending).status).toBe("cancelled");
  expect(events).toEqual(["navigationstart", "navigationcancel"]);
  expect(machine.getState().nodeId).toBe("n1");
  expect(machine.getState().camera!.position).toEqual([200, 300, 400]);
  expect(machine.getState().history).toHaveLength(1);
});
it("deleting active node falls back to start; empty replacement clears every reference", async () => {
  const machine = new NavigationMachine(
    document(),
    "update",
    () => 0,
    () => {},
    () => {},
  );
  await machine.goTo({ nodeId: "n2" }, { durationMs: 0 });
  const next = document();
  next.paths[0]!.nodes.splice(1, 1);
  next.paths[0]!.edges = [{ ...next.paths[0]!.edges[0]!, to: "n3" }];
  expect(validateDocument(next).ok).toBe(true);
  machine.replaceDocument(next);
  expect(machine.getState().nodeId).toBe("n1");
  next.scenes = [];
  next.paths = [];
  next.defaultPathId = null;
  machine.replaceDocument(next);
  expect(machine.getState().status).toBe("empty");
  expect(machine.getState().history).toEqual([]);
});
it("destroy from navigationcancel prevents replacement from resurrecting resources", async () => {
  const machine = new NavigationMachine(
    document(),
    "update",
    () => 0,
    (event) => {
      if (event === "navigationcancel") machine.destroy();
    },
    () => {},
  );
  const pending = machine.next();
  machine.replaceDocument(document());
  expect((await pending).status).toBe("cancelled");
  expect(machine.getState().status).toBe("destroyed");
});
