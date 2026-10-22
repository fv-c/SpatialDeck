import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
const source = (path: string) => new URL(path, import.meta.url).pathname;
export default defineConfig({
  root: source("."),
  plugins: [
    react(),
    {
      // The dev server needs its HMR websocket; production keeps connect-src 'self'.
      name: "spatialdeck-dev-csp",
      apply: "serve",
      transformIndexHtml: (html) =>
        html.replace("connect-src 'self';", "connect-src 'self' ws:;"),
    },
  ],
  resolve: {
    alias: [
      {
        find: "@spatialdeck/plugins",
        replacement: source("../../packages/plugins/src"),
      },
      {
        find: /^@spatialdeck\/editor$/,
        replacement: source("../../packages/editor/src/browser.ts"),
      },
      {
        find: /^@spatialdeck\/core$/,
        replacement: source("../../packages/core/src/index.ts"),
      },
      {
        find: /^@spatialdeck\/player$/,
        replacement: source("../../packages/player/src/index.ts"),
      },
      {
        find: "@spatialdeck/player/style.css",
        replacement: source("../../packages/player/src/style.css"),
      },
    ],
  },
  build: {
    target: ["chrome120", "firefox120", "safari17"],
    assetsInlineLimit: 0,
  },
  server: { host: "127.0.0.1", port: 5174 },
});
