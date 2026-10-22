import { expect, it } from "vitest";
import Ajv from "ajv/dist/2020.js";
import schema from "../schema/project-1.2.0.schema.json";
import gallery from "../../../examples/content-gallery/project.json";
import historical from "../../../examples/structure-branching/project.json";
import {
  validateDocument,
  serializeDocument,
  updateCapabilities,
} from "../src/index.js";
import type { Block, ProjectDocument } from "../src/index.js";
function document(): ProjectDocument {
  const r = validateDocument(gallery);
  if (!r.ok) throw new Error(JSON.stringify(r));
  return r.value;
}
it("schema/type union has precisely the eleven discriminants and validates every gallery block", () => {
  const validate = new Ajv({ strict: true }).compile(schema);
  const doc = document();
  expect(validate(doc)).toBe(true);
  expect(doc.scenes.map((s) => s.blocks[0]!.type).sort()).toEqual(
    [
      "text",
      "markdown",
      "html",
      "svg",
      "latex",
      "image",
      "audio",
      "video",
      "link",
      "embed",
      "plugin",
    ].sort(),
  );
});
it.each([
  "text",
  "markdown",
  "html",
  "svg",
  "latex",
  "image",
  "audio",
  "video",
  "link",
  "embed",
  "plugin",
] as const)(
  "rejects missing/extra data fields and non-union %s blocks",
  (type) => {
    const doc = document(),
      block = doc.scenes.find((s) => s.id === type)!.blocks[0]!;
    const bad = { ...block, data: { ...block.data, unexpected: true } };
    doc.scenes[0]!.blocks = [bad as Block];
    expect(validateDocument(doc).ok).toBe(false);
    doc.scenes[0]!.blocks = [{ ...block, data: {} } as Block];
    expect(validateDocument(doc).ok).toBe(false);
    doc.scenes[0]!.blocks = [{ ...block, type: "custom" } as unknown as Block];
    expect(validateDocument(doc).ok).toBe(false);
  },
);
it.each([
  (d: ProjectDocument) => {
    d.scenes.find((s) => s.id === "html")!.blocks[0] = {
      id: "bad",
      type: "html",
      data: { source: "x".repeat(100001) },
    };
  },
  (d: ProjectDocument) => {
    d.scenes.find((s) => s.id === "image")!.blocks[0] = {
      id: "bad",
      type: "image",
      data: { assetId: "missing", alt: "", fit: "contain" },
    };
  },
  (d: ProjectDocument) => {
    d.scenes.find((s) => s.id === "video")!.blocks[0] = {
      id: "bad",
      type: "video",
      data: {
        assetId: "motion",
        label: "",
        alt: "",
        autoplay: false,
        loop: false,
        onExit: "pause",
        captionsAssetId: "diagram",
      },
    };
  },
  (d: ProjectDocument) => {
    d.scenes.find((s) => s.id === "link")!.blocks[0] = {
      id: "bad",
      type: "link",
      data: { label: "", target: { pathId: "gallery", nodeId: "missing" } },
    };
  },
  (d: ProjectDocument) => {
    d.scenes.find((s) => s.id === "embed")!.blocks[0] = {
      id: "bad",
      type: "embed",
      data: { url: "https://user:password@example.org", title: "" },
    };
  },
  (d: ProjectDocument) => {
    d.requiredCapabilities = ["linear"];
  },
  (d: ProjectDocument) => {
    d.pluginSettings = {
      "bad-id": { apiVersion: "1.0.0", dataVersion: "1.0.0", data: {} },
    };
  },
  (d: ProjectDocument) => {
    const b = d.scenes.find((s) => s.id === "plugin")!.blocks[0]!;
    if (b.type === "plugin") b.data.apiVersion = "2.0.0" as "1.0.0";
  },
  (d: ProjectDocument) => {
    const b = d.scenes.find((s) => s.id === "plugin")!.blocks[0]!;
    if (b.type === "plugin") b.data.dataVersion = "future";
  },
])(
  "rejects invalid references/limits/versions without changing input",
  (mutate) => {
    const doc = document();
    mutate(doc);
    const copy = structuredClone(doc);
    expect(validateDocument(doc).ok).toBe(false);
    expect(doc).toEqual(copy);
  },
);
it("migrates 1.1 without losing source, text, notes or opaque extension data", () => {
  const original = structuredClone(historical);
  original.scenes[0]!.notes = "Notes </script>";
  original.extensions = {
    "example.data": {
      version: "1.0.0",
      data: { source: "<script>inert</script>" },
    },
  } as typeof original.extensions;
  const before = structuredClone(original),
    r = validateDocument(original);
  expect(r.ok).toBe(true);
  expect(original).toEqual(before);
  if (r.ok) {
    expect(r.value).toEqual({
      ...original,
      schemaVersion: "1.2.0",
      pluginSettings: {},
    });
    expect(validateDocument(r.value)).toEqual(r);
  }
});
it("preserves missing plugin data versions, prototype keys and exact sources in deterministic JSON", () => {
  const doc = document(),
    b = doc.scenes.find((s) => s.id === "plugin")!.blocks[0]!;
  if (b.type !== "plugin") throw new Error();
  b.data.dataVersion = "9.0.0";
  b.data.payload = JSON.parse(
    '{"__proto__":{"polluted":true},"source":"</script>"}',
  );
  const text = serializeDocument(doc);
  expect(text.ok).toBe(true);
  if (text.ok)
    expect(validateDocument(text.value)).toMatchObject({
      ok: true,
      value: doc,
    });
  expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
});
it("requires blocks only for rich content/settings and leaves historical text untouched", () => {
  const doc = document();
  doc.scenes.forEach(
    (s) => (s.blocks = s.blocks.filter((b) => b.type === "text")),
  );
  updateCapabilities(doc);
  expect(doc.requiredCapabilities).toEqual(["linear"]);
  doc.pluginSettings = {
    "org.example.plugin": {
      apiVersion: "1.0.0",
      dataVersion: "1.0.0",
      data: {},
    },
  };
  updateCapabilities(doc);
  expect(doc.requiredCapabilities).toEqual(["linear", "blocks"]);
});
