import type {
  Diagnostic,
  ProjectDocument,
  SceneAppearance,
  Theme,
} from "./index.js";
import { diagnostic } from "./index.js";

/** Theme written by the 1.2.0 -> 1.3.0 migration: it reproduces the 1.2.0 rendering. */
export function defaultTheme(): Theme {
  return {
    palette: [
      { id: "text", value: "#172035" },
      { id: "background", value: "#ffffff" },
      { id: "accent", value: "#215baf" },
      { id: "backdrop", value: "#e8edf4" },
    ],
    colors: {
      text: "text",
      background: "background",
      accent: "accent",
      backdrop: "backdrop",
    },
    fonts: { body: "system-sans", heading: "system-sans" },
    typeScale: { body: 28, title: 46 },
  };
}
export function defaultAppearance(): SceneAppearance {
  return { variant: "card", background: null, titleVisible: true };
}
/** Key order is not data: serialized documents have sorted keys. */
const sameJSON = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a),
    kb = Object.keys(b);
  return (
    ka.length === kb.length &&
    ka.every(
      (k) =>
        Object.hasOwn(b, k) &&
        sameJSON(
          (a as Record<string, unknown>)[k],
          (b as Record<string, unknown>)[k],
        ),
    )
  );
};
/**
 * Layout is required by canvas scenes, block styles, a non-default scene
 * appearance or a theme that differs from the migrated default.
 */
export function usesLayout(doc: ProjectDocument): boolean {
  return (
    !sameJSON(doc.theme, defaultTheme()) ||
    doc.scenes.some(
      (s) =>
        s.layout === "canvas" ||
        !sameJSON(s.appearance, defaultAppearance()) ||
        s.blocks.some((b) => b.style !== undefined),
    )
  );
}
export function validateLayout(doc: ProjectDocument): Diagnostic[] {
  const errors: Diagnostic[] = [];
  const add = (code: string, message: string, pointer: string) =>
    errors.push(diagnostic(code, message, pointer));
  const palette = new Set<string>();
  doc.theme.palette.forEach((entry, i) => {
    if (palette.has(entry.id))
      add(
        "DUPLICATE_ID",
        `Duplicate palette ID ${entry.id}`,
        `/theme/palette/${i}/id`,
      );
    palette.add(entry.id);
  });
  const color = (id: string | null | undefined, pointer: string) => {
    if (id !== null && id !== undefined && !palette.has(id))
      add("UNKNOWN_PALETTE_COLOR", `Unknown palette color ${id}`, pointer);
  };
  for (const role of ["text", "background", "accent", "backdrop"] as const)
    color(doc.theme.colors[role], `/theme/colors/${role}`);
  doc.scenes.forEach((scene, i) => {
    color(scene.appearance.background, `/scenes/${i}/appearance/background`);
    scene.blocks.forEach((block, j) => {
      const pointer = `/scenes/${i}/blocks/${j}`;
      color(block.style?.color, `${pointer}/style/color`);
      if (scene.layout === "flow" && block.frame)
        add(
          "FRAME_IN_FLOW",
          "Blocks of a flow scene cannot have a frame",
          `${pointer}/frame`,
        );
      if (scene.layout === "canvas" && !block.frame)
        add(
          "FRAME_REQUIRED",
          "Every block of a canvas scene needs a frame",
          pointer,
        );
      const f = block.frame;
      if (
        f &&
        (f.x + f.width > scene.size[0] || f.y + f.height > scene.size[1])
      )
        add(
          "FRAME_OUTSIDE",
          "Frame exceeds the scene content rectangle",
          `${pointer}/frame`,
        );
    });
  });
  if (usesLayout(doc) && !doc.requiredCapabilities.includes("layout"))
    add(
      "CAPABILITY_REQUIRED",
      "This document requires layout",
      "/requiredCapabilities",
    );
  return errors;
}
