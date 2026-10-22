import { defineConfig } from "vite";
export default defineConfig({
  build: {
    target: ["chrome120", "firefox120", "safari17"],
    lib: {
      entry: {
        archive: "src/archive.ts",
        sdk: "src/sdk/index.ts",
        rich: "src/rich.ts",
        media: "src/media.ts",
        navigation: "src/navigation.ts",
        sample: "src/sample.ts",
        builtins: "src/builtins.ts",
      },
      formats: ["es"],
      fileName: (_format, name) => name + ".js",
      cssFileName: "plugins",
    },
    rollupOptions: { external: ["@spatialdeck/core", "@spatialdeck/player"] },
  },
});
