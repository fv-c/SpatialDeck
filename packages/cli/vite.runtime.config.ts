import { defineConfig } from "vite";
import {
  installedPackage,
  licenseBanner,
  licenseNotices,
} from "../../scripts/library.mjs";
const { version } = (await import("./package.json", { with: { type: "json" } }))
  .default;
const player = new URL("../player", import.meta.url).pathname;
// The classic script of every CLI output: player, core and builtin renderers
// with their third-party code, from the published ESM builds. Theme and KaTeX
// fonts are embedded at export time; their licences are listed here too.
export default defineConfig({
  plugins: [
    licenseBanner(
      `/*! SpatialDeck export runtime ${version} | GPL-3.0-or-later | source: https://github.com/fv-c/SpatialDeck | bundled third-party code: THIRD_PARTY_NOTICES.txt */`,
    ),
    licenseNotices({
      fileName: "THIRD_PARTY_NOTICES.txt",
      title: `SpatialDeck CLI ${version}, export runtime (spatialdeck-runtime.js) and embedded fonts`,
      extra: [installedPackage("@fontsource/atkinson-hyperlegible", player)],
    }),
  ],
  build: {
    target: ["chrome120", "firefox120", "safari17"],
    outDir: "dist/runtime",
    emptyOutDir: true,
    minify: true,
    lib: {
      entry: "src/runtime/standalone.ts",
      formats: ["iife"],
      name: "SpatialDeckRuntime",
      fileName: () => "spatialdeck-runtime.js",
    },
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
});
