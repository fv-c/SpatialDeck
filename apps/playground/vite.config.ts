import { defineConfig } from "vite";
export default defineConfig({
  root: new URL(".", import.meta.url).pathname,
  resolve: {
    alias: {
      "@spatialdeck/plugins": new URL(
        "../../packages/plugins/src",
        import.meta.url,
      ).pathname,
      "@spatialdeck/core": new URL(
        "../../packages/core/src/index.ts",
        import.meta.url,
      ).pathname,
      "@spatialdeck/player": new URL(
        "../../packages/player/src/browser.ts",
        import.meta.url,
      ).pathname,
    },
  },
  build: {
    target: ["chrome120", "firefox120", "safari17"],
    assetsInlineLimit: 0,
  },
  server: { host: "127.0.0.1" },
});
