import { describe, expect, it } from "vitest";
import Ajv from "ajv/dist/2020.js";
import schema from "../schema/project-1.0.0.schema.json";
import fixture from "../../../examples/core-three-scenes/project.json";
import {
  migrateDocument,
  serializeDocument,
  validateDocument,
} from "../src/index.js";
import type { ProjectDocument } from "../src/index.js";
export function project(): ProjectDocument {
  const r = validateDocument(fixture);
  if (!r.ok) throw new Error(JSON.stringify(r));
  return r.value;
}
describe("schema/document", () => {
  it("exports the normative strict Draft 2020 schema", () => {
    const ajv = new Ajv({ strict: true });
    expect(ajv.compile(schema)(fixture)).toBe(true);
  });
  it("validates a JSON string and returns an independent copy", () => {
    const r = validateDocument(JSON.stringify(fixture));
    expect(r.ok).toBe(true);
    if (r.ok) {
      r.value.scenes[0]!.title = "changed";
      expect(fixture.scenes[0]!.title).toBe("Introduction");
    }
  });
  it.each(["{", "null", "[]", "42", '"x"'])(
    "rejects malformed/non-document JSON %s",
    (s) => expect(validateDocument(s).ok).toBe(false),
  );
  it("refuses a future version without mutation", () => {
    const d = { ...project(), schemaVersion: "1.4.0" };
    expect(migrateDocument(d)).toMatchObject({
      ok: false,
      diagnostics: [{ code: "UNSUPPORTED_VERSION" }],
    });
    expect(d.schemaVersion).toBe("1.4.0");
  });
  it.each([
    ["scene ID", (d: ProjectDocument) => d.scenes.push(d.scenes[0]!)],
    [
      "block ID",
      (d: ProjectDocument) => d.scenes[0]!.blocks.push(d.scenes[0]!.blocks[0]!),
    ],
    ["path ID", (d: ProjectDocument) => d.paths.push(d.paths[0]!)],
    [
      "node ID",
      (d: ProjectDocument) => d.paths[0]!.nodes.push(d.paths[0]!.nodes[0]!),
    ],
    [
      "edge ID",
      (d: ProjectDocument) => d.paths[0]!.edges.push(d.paths[0]!.edges[0]!),
    ],
    [
      "missing scene",
      (d: ProjectDocument) => {
        d.paths[0]!.nodes[0]!.sceneId = "missing";
      },
    ],
    [
      "invisible target",
      (d: ProjectDocument) => {
        d.scenes[0]!.visible = false;
      },
    ],
    [
      "missing edge",
      (d: ProjectDocument) => {
        d.paths[0]!.edges[0]!.to = "missing";
      },
    ],
    [
      "zero scale",
      (d: ProjectDocument) => {
        d.scenes[0]!.scale = 0;
      },
    ],
    [
      "NaN",
      (d: ProjectDocument) => {
        d.scenes[0]!.position[0] = NaN;
      },
    ],
    [
      "infinity",
      (d: ProjectDocument) => {
        d.scenes[0]!.scale = Infinity;
      },
    ],
    [
      "missing default",
      (d: ProjectDocument) => {
        d.defaultPathId = "missing";
      },
    ],
    [
      "cycle",
      (d: ProjectDocument) => {
        d.paths[0]!.edges.push({
          id: "cycle",
          from: "n3",
          to: "n1",
          label: "",
          transition: { durationMs: 0, easing: "linear" },
        });
      },
    ],
    [
      "disconnected",
      (d: ProjectDocument) => {
        d.paths[0]!.edges.pop();
      },
    ],
    [
      "branch",
      (d: ProjectDocument) => {
        d.paths[0]!.edges[1]!.from = "n1";
      },
    ],
    [
      "empty path wrong start",
      (d: ProjectDocument) => {
        d.paths[0]!.nodes = [];
        d.paths[0]!.edges = [];
      },
    ],
  ] as const)("rejects %s", (_, mutate) => {
    const d = project();
    mutate(d);
    const before = structuredClone(d);
    expect(validateDocument(d).ok).toBe(false);
    expect(d).toEqual(before);
  });
  it.each([
    "../x",
    "/tmp/x",
    "a/../../x",
    "a\\b",
    "https://x",
    "file:///x",
    "%2e%2e/x",
    "%252e%252e/x",
    "a/%5cb",
    "a//b",
    "a/./b",
    "a\u0000b",
    "a?x",
    "%invalid",
  ])("rejects unsafe asset %s", (path) => {
    const d = project();
    d.assets = [{ id: "a", path, mime: "text/plain", byteLength: 1 }];
    expect(validateDocument(d).ok).toBe(false);
  });
  it("accepts safe local assets and applies cumulative limits", () => {
    const d = project();
    d.assets = Array.from({ length: 5 }, (_, i) => ({
      id: `a${i}`,
      path: `assets/${i}.txt`,
      mime: "text/plain",
      byteLength: 50 * 1024 * 1024,
    }));
    expect(validateDocument(d).ok).toBe(false);
    d.assets.pop();
    expect(validateDocument(d).ok).toBe(true);
  });
  it("accepts empty documents and paths and no default", () => {
    const d = project();
    d.scenes = [];
    d.paths = [];
    d.defaultPathId = null;
    expect(validateDocument(d).ok).toBe(true);
    d.paths = [
      { id: "empty", name: "", startNodeId: null, nodes: [], edges: [] },
    ];
    d.defaultPathId = "empty";
    expect(validateDocument(d).ok).toBe(true);
  });
  it("roundtrips opaque extension JSON deterministically, preserving array order", () => {
    const d = project();
    d.extensions["example.data"] = {
      version: "1.0.0",
      data: { z: [3, 2, 1], a: "<script>inert</script>" },
    };
    const a = serializeDocument(d);
    expect(a.ok).toBe(true);
    if (a.ok) {
      const b = migrateDocument(a.value);
      expect(b).toEqual({ ok: true, value: d, diagnostics: [] });
      if (b.ok) expect(serializeDocument(b.value)).toEqual(a);
    }
  });
  it("rejects serialization of invalid API values", () => {
    const d = project();
    d.scenes[0]!.scale = NaN;
    expect(serializeDocument(d).ok).toBe(false);
  });
  it("rejects accessors without invoking them, cyclic and non-JSON values", () => {
    let called = false;
    const d = {
      get schemaVersion() {
        called = true;
        return "1.0.0";
      },
    };
    expect(validateDocument(d).ok).toBe(false);
    expect(called).toBe(false);
    const cycle: unknown[] = [];
    cycle.push(cycle);
    for (const v of [cycle, new Date(), { x: () => {} }, { x: undefined }])
      expect(validateDocument(v).ok).toBe(false);
  });
  it("enforces byte and depth limits on extension data", () => {
    const d = project();
    let value: Record<string, unknown> = {};
    const root = value;
    for (let i = 0; i < 65; i++) {
      value.x = {};
      value = value.x as Record<string, unknown>;
    }
    expect(
      validateDocument({
        ...d,
        extensions: { "example.deep": { version: "1.0.0", data: root } },
      }).ok,
    ).toBe(false);
    expect(validateDocument(" ".repeat(10 * 1024 * 1024 + 1)).ok).toBe(false);
  });
});
it("rejects non-JSON array properties and sparse extension arrays", () => {
  for (const value of [Array(3), Object.assign([1], { extra: 2 })]) {
    const d = project();
    d.extensions["example.invalid"] = { version: "1.0.0", data: value };
    expect(validateDocument(d).ok).toBe(false);
  }
});
it("caps the actual escaped UTF-8 JSON size for object API input and rejects proxies safely", () => {
  const d = project();
  d.extensions["example.large"] = {
    version: "1.0.0",
    data: "\u0000".repeat(2 * 1024 * 1024),
  };
  expect(validateDocument(d)).toMatchObject({
    ok: false,
    diagnostics: [{ code: "JSON_LIMIT" }],
  });
  d.extensions["example.large"]!.data = "a".repeat(2 * 1024 * 1024);
  expect(validateDocument(d).ok).toBe(true);
  expect(validateDocument(new Proxy(project(), {})).ok).toBe(false);
});
it("rejects colliding asset paths after URL decoding and Unicode normalization", () => {
  for (const [a, b] of [
    ["assets/a%20b.txt", "assets/a b.txt"],
    ["assets/é.txt", "assets/e\u0301.txt"],
  ]) {
    const d = project();
    d.assets = [
      { id: "a", path: a!, mime: "text/plain", byteLength: 0 },
      { id: "b", path: b!, mime: "text/plain", byteLength: 0 },
    ];
    expect(validateDocument(d)).toMatchObject({
      ok: false,
      diagnostics: [{ code: "DUPLICATE_ASSET_PATH" }],
    });
  }
});
