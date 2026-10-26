import { readFile, writeFile } from "node:fs/promises";
import { format } from "prettier";
import Ajv from "ajv/dist/2020.js";
import standalone from "ajv/dist/standalone/index.js";
const schema = JSON.parse(
  await readFile(
    new URL(
      "../packages/core/schema/project-1.3.0.schema.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const ajv = new Ajv({
  strict: true,
  allErrors: true,
  code: { source: true, esm: true },
  // Referenced definitions stay functions: frame and style recur in every block type.
  inlineRefs: false,
});
const legacy = JSON.parse(
  await readFile(
    new URL(
      "../packages/core/schema/project-1.0.0.schema.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
ajv.addSchema(legacy, "legacy");
ajv.addSchema(
  JSON.parse(
    await readFile(
      new URL(
        "../packages/core/schema/project-1.1.0.schema.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ),
  "structure",
);
ajv.addSchema(
  JSON.parse(
    await readFile(
      new URL(
        "../packages/core/schema/project-1.2.0.schema.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ),
  "blocks",
);
ajv.addSchema(schema, "current");
// A standalone module, never the Ajv compiler, enters the browser graph.
let source = standalone(ajv, {
  validateLegacy: "legacy",
  validateStructureSchema: "structure",
  validateBlocksSchema: "blocks",
  validateCurrent: "current",
});
source = source.replace(
  /const (\w+) = require\("ajv\/dist\/runtime\/([^"/]+)"\)\.default;/g,
  'import $1Module from "ajv/dist/runtime/$2.js"; const $1 = $1Module.default ?? $1Module;',
);
await writeFile(
  new URL("../packages/core/src/document/validator.js", import.meta.url),
  source + "\n",
);
const names = {
  id: "Id",
  coord: "Coordinate",
  size: "Size",
  vec3: "Vec3",
  transition: "Transition",
  extensions: "Extensions",
  block: "Block",
  scene: "Scene",
  asset: "Asset",
  node: "PathNode",
  edge: "PathEdge",
  path: "ScenePath",
  cameraPose: "AuthoredCameraPose",
  keyframe: "CameraKeyframe",
  cameraTrack: "CameraTrack",
  condition: "EdgeCondition",
  cue: "Cue",
  paletteId: "PaletteId",
  color: "Color",
  fontId: "FontId",
  theme: "Theme",
  appearance: "SceneAppearance",
  frame: "Frame",
  blockStyle: "BlockStyle",
  ...Object.fromEntries(
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
    ].map((n) => [n + "Block", n[0].toUpperCase() + n.slice(1) + "Block"]),
  ),
};
const type = (s) => {
  if (s.$ref) return names[s.$ref.split("/").at(-1)];
  if ("const" in s) return JSON.stringify(s.const);
  if (s.enum) return s.enum.map((v) => JSON.stringify(v)).join(" | ");
  if (s.anyOf) return s.anyOf.map(type).join(" | ");
  if (s.oneOf) return s.oneOf.map(type).join(" | ");
  if (s.type === "array")
    return s.prefixItems
      ? "[" + s.prefixItems.map(type).join(", ") + "]"
      : `Array<${type(s.items)}>`;
  if (s.type === "object")
    return (
      "{" +
      Object.entries(s.properties ?? {})
        .map(
          ([k, v]) =>
            `${JSON.stringify(k)}${s.required?.includes(k) ? "" : "?"}: ${type(v)};`,
        )
        .join("") +
      (s.additionalProperties && typeof s.additionalProperties === "object"
        ? `[key: string]: ${type(s.additionalProperties)};`
        : "") +
      "}"
    );
  return (
    {
      string: "string",
      number: "number",
      integer: "number",
      boolean: "boolean",
      null: "null",
    }[s.type] ?? "JsonValue"
  );
};
await writeFile(
  new URL("../packages/core/src/document/types.ts", import.meta.url),
  await format(
    "// Generated from schema; edit the schema, then pnpm generate.\nexport type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };\n" +
      Object.entries(schema.$defs)
        .map(([k, v]) => `export type ${names[k]} = ${type(v)};`)
        .join("\n") +
      `\nexport type ProjectDocument = ${type(schema)};\n`,
    { parser: "typescript" },
  ),
);
// KaTeX stylesheet for the plugins package (0.6 packaging): woff2 sources only,
// read from the installed katex package; the build copies the files next to it.
const katexDir = new URL(
  "../packages/plugins/node_modules/katex/",
  import.meta.url,
);
const katexVersion = JSON.parse(
  await readFile(new URL("package.json", katexDir), "utf8"),
).version;
const katexCss = (
  await readFile(new URL("dist/katex.min.css", katexDir), "utf8")
).replace(
  /src:url\(fonts\/(KaTeX_[A-Za-z0-9_-]+)\.woff2\) format\("woff2"\),url\(fonts\/\1\.woff\) format\("woff"\),url\(fonts\/\1\.ttf\) format\("truetype"\)/g,
  'src:url(../node_modules/katex/dist/fonts/$1.woff2) format("woff2")',
);
if (/\.woff\)|\.ttf\)|url\(fonts\//.test(katexCss))
  throw new Error("Unexpected KaTeX @font-face sources");
await writeFile(
  new URL("../packages/plugins/src/katex.css", import.meta.url),
  `/* Generated by scripts/generate.mjs from katex ${katexVersion} (MIT, Khan Academy and contributors): woff2 font sources only. */\n${katexCss}\n`,
);
