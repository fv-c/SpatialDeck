import { defineConfig } from "vite";
export default defineConfig({
  build: {
    target: ["chrome120", "firefox120", "safari17"],
    lib: {
      entry: "src/browser.ts",
      formats: ["es"],
      fileName: "index",
      cssFileName: "player",
    },
    rollupOptions: { external: ["@spatialdeck/core"] },
  },
});
