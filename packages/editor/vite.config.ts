import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  build: {
    target: ["chrome120", "firefox120", "safari17"],
    lib: {
      entry: "src/browser.ts",
      formats: ["es"],
      fileName: "index",
      cssFileName: "editor",
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "@spatialdeck/core",
        "@spatialdeck/player",
        /^@spatialdeck\/plugins(?:\/.*)?$/,
      ],
    },
  },
});
