import { defineConfig } from "vite";
export default defineConfig({
  root: new URL(".", import.meta.url).pathname,
  resolve: {
    alias: {
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
  build: { target: ["chrome120", "firefox120", "safari17"] },
  server: { host: "127.0.0.1" },
});
