import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import Ajv from "ajv/dist/2020.js";
import current from "../schema/project-1.3.0.schema.json";
import previous from "../schema/project-1.2.0.schema.json";
import gallery from "../../../examples/content-gallery/project.json";
import structure from "../../../examples/structure-branching/project.json";
import legacy from "../../../examples/core-three-scenes/project.json";
import roundtrip from "../../../examples/editor-roundtrip/project.json";
import {
  defaultAppearance,
  defaultTheme,
  migrateDocument,
  serializeDocument,
  updateCapabilities,
  usesLayout,
  validateDocument,
} from "../src/index.js";
import type {
  BlockStyle,
  Frame,
  ProjectDocument,
  SceneAppearance,
  Theme,
} from "../src/index.js";
const value = <T>(r: { ok: boolean; value?: T; diagnostics: unknown }) => {
  if (!r.ok) throw new Error(JSON.stringify(r.diagnostics));
  return r.value!;
};
/** Migrated gallery with its first scene turned into a two-block canvas. */
function canvas(): ProjectDocument {
  const doc = value(validateDocument(gallery));
  const scene = doc.scenes[0]!;
  scene.layout = "canvas";
  scene.blocks = [
    {
      id: "title",
      type: "text",
      data: { text: "Affiancati" },
      frame: { x: 40, y: 40, width: 400, height: 120, rotation: 0, z: 0 },
      style: { align: "center", size: "xl", color: "accent" },
    },
    {
      id: "note",
      type: "markdown",
      data: { source: "**Ruotato**" },
      frame: { x: 500, y: 100, width: 300, height: 200, rotation: 15, z: 2 },
    },
  ];
  updateCapabilities(doc);
  return value(validateDocument(doc));
}
const rejected = (
  doc: unknown,
  code: string,
  pointer: string | RegExp = /./,
) => {
  const r = validateDocument(doc);
  expect(r.ok).toBe(false);
  expect(r.diagnostics).toContainEqual(
    expect.objectContaining({
      code,
      pointer:
        typeof pointer === "string" ? pointer : expect.stringMatching(pointer),
    }),
  );
};
describe("schema 1.3.0", () => {
  it("is a strict Draft 2020 schema that keeps 1.2.0 frozen", () => {
    const doc = canvas();
    expect(new Ajv({ strict: true }).compile(current)(doc)).toBe(true);
    expect(new Ajv({ strict: true }).compile(previous)(gallery)).toBe(true);
    expect(new Ajv({ strict: true }).compile(previous)(doc)).toBe(false);
    expect(doc.requiredCapabilities).toEqual(["linear", "blocks", "layout"]);
  });
  it("derives the token types from the schema", () => {
    const frame: Frame = {
      x: 0,
      y: 0,
      width: 8,
      height: 8,
      rotation: 0,
      z: 0,
    };
    const style: Required<BlockStyle> = {
      align: "justify",
      verticalAlign: "end",
      size: "xxl",
      color: "accent",
    };
    const appearance: SceneAppearance = {
      variant: "plain",
      background: null,
      titleVisible: false,
    };
    const theme: Theme = defaultTheme();
    // @ts-expect-error A style is a set of tokens, never CSS.
    const css: BlockStyle = { css: "color:red" };
    // @ts-expect-error FontId is a closed enum of verified local fonts.
    theme.fonts.body = "Comic Sans MS";
    const defs = current.$defs;
    expect(Object.keys(frame).sort()).toEqual([...defs.frame.required].sort());
    expect(Object.keys(style).sort()).toEqual(
      Object.keys(defs.blockStyle.properties).sort(),
    );
    expect(Object.keys(appearance).sort()).toEqual(
      [...defs.appearance.required].sort(),
    );
    expect(Object.keys(defaultTheme()).sort()).toEqual(
      [...defs.theme.required].sort(),
    );
    expect(defs.fontId.enum).toEqual([
      "system-sans",
      "system-serif",
      "system-mono",
      "atkinson-hyperlegible",
    ]);
    expect(css).toBeDefined();
  });
  it("roundtrips a canvas document deterministically", () => {
    const doc = canvas();
    const text = value(serializeDocument(doc));
    expect(value(validateDocument(text))).toEqual(doc);
    expect(value(serializeDocument(value(validateDocument(text))))).toBe(text);
  });
  it.each<[string, (d: ProjectDocument) => void, string, string | RegExp]>([
    [
      "frame missing in canvas",
      (d) => delete d.scenes[0]!.blocks[1]!.frame,
      "FRAME_REQUIRED",
      "/scenes/0/blocks/1",
    ],
    [
      "frame in flow",
      (d) => {
        d.scenes[1]!.blocks[0]!.frame = {
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          rotation: 0,
          z: 0,
        };
      },
      "FRAME_IN_FLOW",
      "/scenes/1/blocks/0/frame",
    ],
    [
      "frame beyond the width",
      (d) => {
        d.scenes[0]!.blocks[1]!.frame!.x = d.scenes[0]!.size[0] - 299;
      },
      "FRAME_OUTSIDE",
      "/scenes/0/blocks/1/frame",
    ],
    [
      "frame beyond the height",
      (d) => {
        d.scenes[0]!.blocks[1]!.frame!.height = d.scenes[0]!.size[1];
      },
      "FRAME_OUTSIDE",
      "/scenes/0/blocks/1/frame",
    ],
    [
      "negative origin",
      (d) => {
        d.scenes[0]!.blocks[0]!.frame!.y = -1;
      },
      "SCHEMA_INVALID",
      "/scenes/0/blocks/0/frame/y",
    ],
    [
      "non-finite frame",
      (d) => {
        d.scenes[0]!.blocks[0]!.frame!.x = NaN;
      },
      "NON_FINITE_NUMBER",
      "/scenes/0/blocks/0/frame/x",
    ],
    [
      "infinite rotation",
      (d) => {
        d.scenes[0]!.blocks[0]!.frame!.rotation = Infinity;
      },
      "NON_FINITE_NUMBER",
      "/scenes/0/blocks/0/frame/rotation",
    ],
    [
      "width below 8",
      (d) => {
        d.scenes[0]!.blocks[0]!.frame!.width = 7.99;
      },
      "SCHEMA_INVALID",
      "/scenes/0/blocks/0/frame/width",
    ],
    [
      "rotation out of range",
      (d) => {
        d.scenes[0]!.blocks[0]!.frame!.rotation = 360.5;
      },
      "SCHEMA_INVALID",
      "/scenes/0/blocks/0/frame/rotation",
    ],
    [
      "non-integer z",
      (d) => {
        d.scenes[0]!.blocks[0]!.frame!.z = 1.5;
      },
      "SCHEMA_INVALID",
      "/scenes/0/blocks/0/frame/z",
    ],
    [
      "z out of range",
      (d) => {
        d.scenes[0]!.blocks[0]!.frame!.z = 1001;
      },
      "SCHEMA_INVALID",
      "/scenes/0/blocks/0/frame/z",
    ],
    [
      "unknown block colour",
      (d) => {
        d.scenes[0]!.blocks[0]!.style!.color = "missing";
      },
      "UNKNOWN_PALETTE_COLOR",
      "/scenes/0/blocks/0/style/color",
    ],
    [
      "unknown scene background",
      (d) => {
        d.scenes[2]!.appearance.background = "missing";
      },
      "UNKNOWN_PALETTE_COLOR",
      "/scenes/2/appearance/background",
    ],
    [
      "unknown theme role",
      (d) => {
        d.theme.colors.backdrop = "missing";
      },
      "UNKNOWN_PALETTE_COLOR",
      "/theme/colors/backdrop",
    ],
    [
      "unknown font",
      (d) => {
        (d.theme.fonts as { body: string }).body = "Comic Sans MS";
      },
      "SCHEMA_INVALID",
      "/theme/fonts/body",
    ],
    [
      "duplicate palette ID",
      (d) => {
        d.theme.palette.push({ id: "accent", value: "#000000" });
      },
      "DUPLICATE_ID",
      "/theme/palette/4/id",
    ],
    [
      "empty palette",
      (d) => {
        d.theme.palette = [];
      },
      "SCHEMA_INVALID",
      "/theme/palette",
    ],
    [
      "palette above 32 colours",
      (d) => {
        d.theme.palette = Array.from({ length: 33 }, (_, i) => ({
          id: `c${i}`,
          value: "#000000",
        }));
      },
      "SCHEMA_INVALID",
      "/theme/palette",
    ],
    [
      "body size out of range",
      (d) => {
        d.theme.typeScale.body = 201;
      },
      "SCHEMA_INVALID",
      "/theme/typeScale/body",
    ],
    [
      "non-integer title size",
      (d) => {
        d.theme.typeScale.title = 40.5;
      },
      "SCHEMA_INVALID",
      "/theme/typeScale/title",
    ],
  ])("rejects %s with code and pointer", (_, mutate, code, pointer) => {
    const doc = canvas(),
      copy = structuredClone(doc);
    mutate(doc);
    const before = structuredClone(doc);
    rejected(doc, code, pointer);
    expect(doc).toEqual(before);
    expect(copy).not.toEqual(doc);
  });
  it.each([
    ["#FFFFFF"],
    ["#fff"],
    ["red"],
    ["rgb(0, 0, 0)"],
    ["#ffffff; background: url(x)"],
    ["var(--x)"],
    ["#12345g"],
  ])("rejects the palette colour %s, only #rrggbb is a colour", (color) => {
    const doc = canvas();
    doc.theme.palette[0]!.value = color;
    rejected(doc, "SCHEMA_INVALID", "/theme/palette/0/value");
  });
  it.each<[string, (d: ProjectDocument) => void, string]>([
    [
      "CSS as a block colour token",
      (d) => {
        d.scenes[0]!.blocks[0]!.style!.color = "red; background:url(x)";
      },
      "/scenes/0/blocks/0/style/color",
    ],
    [
      "a style string",
      (d) => {
        (d.scenes[0]!.blocks[0] as { style: unknown }).style = "color: red";
      },
      "/scenes/0/blocks/0",
    ],
    [
      "a free CSS field",
      (d) => {
        (d.scenes[0]!.blocks[0]!.style as Record<string, unknown>).css =
          "position:fixed";
      },
      "/scenes/0/blocks/0",
    ],
    [
      "a class field on a block",
      (d) => {
        (d.scenes[0]!.blocks[0] as Record<string, unknown>).className = "x";
      },
      "/scenes/0/blocks/0",
    ],
    [
      "a style field on a scene",
      (d) => {
        (d.scenes[0] as Record<string, unknown>).style = "transform:none";
      },
      "/scenes/0",
    ],
    [
      "CSS as a scene background",
      (d) => {
        d.scenes[0]!.appearance.background = "url(javascript:alert(1))";
      },
      "/scenes/0/appearance/background",
    ],
    [
      "an alignment outside the tokens",
      (d) => {
        (d.scenes[0]!.blocks[0]!.style as Record<string, unknown>).align =
          "left; color: red";
      },
      "/scenes/0/blocks/0/style/align",
    ],
    [
      "a free font stack",
      (d) => {
        (d.theme.fonts as Record<string, unknown>).heading =
          "serif; src: url(https://example.org/x.woff2)";
      },
      "/theme/fonts/heading",
    ],
    [
      "a pixel size string",
      (d) => {
        (d.scenes[0]!.blocks[0]!.style as Record<string, unknown>).size =
          "40px";
      },
      "/scenes/0/blocks/0/style/size",
    ],
    [
      "a unit in a frame",
      (d) => {
        (d.scenes[0]!.blocks[0]!.frame as Record<string, unknown>).x = "10px";
      },
      "/scenes/0/blocks/0/frame/x",
    ],
  ])("rejects %s", (_, mutate, pointer) => {
    const doc = canvas();
    mutate(doc);
    const r = validateDocument(doc);
    expect(r.ok).toBe(false);
    expect(
      r.diagnostics.some(
        (d) =>
          (d.code === "SCHEMA_INVALID" || d.code === "UNKNOWN_PALETTE_COLOR") &&
          d.pointer.startsWith(pointer),
      ),
    ).toBe(true);
  });
});
describe("layout capability", () => {
  const base = () => value(validateDocument(gallery));
  it.each<[string, (d: ProjectDocument) => void]>([
    [
      "a canvas scene",
      (d) => {
        d.scenes[0]!.layout = "canvas";
        d.scenes[0]!.blocks.forEach((b) => {
          b.frame = { x: 0, y: 0, width: 100, height: 100, rotation: 0, z: 0 };
        });
      },
    ],
    [
      "a block style",
      (d) => {
        d.scenes[0]!.blocks[0]!.style = {};
      },
    ],
    [
      "a hidden title",
      (d) => {
        d.scenes[0]!.appearance.titleVisible = false;
      },
    ],
    [
      "a plain scene",
      (d) => {
        d.scenes[0]!.appearance.variant = "plain";
      },
    ],
    [
      "a scene background",
      (d) => {
        d.scenes[0]!.appearance.background = "backdrop";
      },
    ],
    [
      "another body size",
      (d) => {
        d.theme.typeScale.body = 30;
      },
    ],
    [
      "another palette value",
      (d) => {
        d.theme.palette[0]!.value = "#000000";
      },
    ],
    [
      "an extra palette colour",
      (d) => {
        d.theme.palette.push({ id: "extra", value: "#000000" });
      },
    ],
    [
      "an embedded font",
      (d) => {
        d.theme.fonts.heading = "atkinson-hyperlegible";
      },
    ],
  ])("is required by %s and added by updateCapabilities", (_, mutate) => {
    const doc = base();
    expect(usesLayout(doc)).toBe(false);
    mutate(doc);
    expect(usesLayout(doc)).toBe(true);
    rejected(doc, "CAPABILITY_REQUIRED", "/requiredCapabilities");
    updateCapabilities(doc);
    expect(doc.requiredCapabilities).toContain("layout");
    expect(validateDocument(doc).ok).toBe(true);
  });
  it("is not required by default values in any key order", () => {
    const doc = base();
    doc.theme = JSON.parse(
      value(serializeDocument(doc)).replace(/\s/g, ""),
    ).theme;
    expect(Object.keys(doc.theme)).toEqual([
      "colors",
      "fonts",
      "palette",
      "typeScale",
    ]);
    expect(usesLayout(doc)).toBe(false);
    updateCapabilities(doc);
    expect(doc.requiredCapabilities).toEqual(["linear", "blocks"]);
  });
});
describe("migration to 1.3.0", () => {
  const fixtures = [
    ["examples/core-three-scenes/project.json", legacy, "1.0.0"],
    ["examples/editor-roundtrip/project.json", roundtrip, "1.0.0"],
    ["examples/structure-branching/project.json", structure, "1.1.0"],
    ["examples/content-gallery/project.json", gallery, "1.2.0"],
  ] as const;
  it.each(fixtures)(
    "migrates %s in copy without activating layout or losing data",
    async (file, fixture, version) => {
      const disk = await readFile(new URL(`../../../${file}`, import.meta.url));
      const original = structuredClone(fixture);
      const migrated = value(migrateDocument(fixture));
      expect(fixture).toEqual(original);
      expect(fixture.schemaVersion).toBe(version);
      expect(migrated.schemaVersion).toBe("1.3.0");
      expect(migrated.theme).toEqual(defaultTheme());
      expect(migrated.requiredCapabilities).toEqual(
        fixture.requiredCapabilities,
      );
      expect(migrated.requiredCapabilities).not.toContain("layout");
      expect(usesLayout(migrated)).toBe(false);
      expect(migrated.extensions).toEqual(fixture.extensions);
      expect(migrated.paths).toEqual(fixture.paths);
      expect(migrated.assets).toEqual(fixture.assets);
      migrated.scenes.forEach((scene, i) => {
        const old = fixture.scenes[i]!;
        expect(scene.layout).toBe("flow");
        expect(scene.appearance).toEqual(defaultAppearance());
        expect(scene.blocks).toEqual(old.blocks);
        expect(scene.notes).toBe(old.notes);
        expect(scene.title).toBe(old.title);
        expect(scene.extensions).toEqual(old.extensions);
        expect(scene.blocks.every((b) => !b.frame && !b.style)).toBe(true);
      });
      if ("pluginSettings" in fixture)
        expect(migrated.pluginSettings).toEqual(fixture.pluginSettings);
      // Idempotent on the current version, and the file on disk is untouched.
      expect(value(migrateDocument(migrated))).toEqual(migrated);
      expect(
        await readFile(new URL(`../../../${file}`, import.meta.url)),
      ).toEqual(disk);
    },
  );
  it("keeps plugin payloads, notes and opaque extensions through 1.0.0 -> 1.3.0", () => {
    const old = structuredClone(legacy) as unknown as Record<string, unknown> &
      typeof legacy;
    old.scenes[0]!.notes = "Note </script> ✓";
    old.extensions = {
      "org.example.data": { version: "2.0.0", data: { keep: [3, 2, 1] } },
    } as typeof old.extensions;
    old.scenes[1]!.extensions = {
      "org.example.scene": { version: "1.0.0", data: { a: null } },
    } as (typeof old.scenes)[1]["extensions"];
    const migrated = value(migrateDocument(old));
    expect(migrated.scenes[0]!.notes).toBe("Note </script> ✓");
    expect(migrated.extensions).toEqual(old.extensions);
    expect(migrated.scenes[1]!.extensions).toEqual(old.scenes[1]!.extensions);
    const plugin = value(validateDocument(gallery)).scenes.find(
      (s) => s.id === "plugin",
    )!.blocks[0]!;
    expect(plugin).toEqual(
      gallery.scenes.find((s) => s.id === "plugin")!.blocks[0],
    );
  });
  it("refuses an unknown version and a 1.3.0 field in 1.2.0", () => {
    const future = { ...canvas(), schemaVersion: "1.4.0" };
    rejected(future, "UNSUPPORTED_VERSION", "/schemaVersion");
    const early = structuredClone(gallery) as Record<string, unknown>;
    early.theme = defaultTheme();
    rejected(early, "SCHEMA_INVALID", "");
  });
});
