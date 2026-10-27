import type { Block } from "@spatialdeck/core";
import type { IconName } from "./icons.js";

/** Visible names and icons of the block types; the document keeps the type ids. */
export const blockTypes: Record<
  Block["type"],
  { label: string; icon: IconName }
> = {
  text: { label: "Testo", icon: "type-text" },
  markdown: { label: "Markdown", icon: "type-markdown" },
  html: { label: "HTML", icon: "type-html" },
  svg: { label: "SVG", icon: "type-svg" },
  latex: { label: "Formula", icon: "type-latex" },
  image: { label: "Immagine", icon: "type-image" },
  audio: { label: "Audio", icon: "type-audio" },
  video: { label: "Video", icon: "type-video" },
  link: { label: "Collegamento", icon: "link" },
  embed: { label: "Incorporato", icon: "type-embed" },
  plugin: { label: "Plugin", icon: "type-plugin" },
};
