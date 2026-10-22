import { defineConfig } from "vitest/config";
export default defineConfig({
  resolve: {
    alias: {
      "@spatialdeck/core": new URL(
        "./packages/core/src/index.ts",
        import.meta.url,
      ).pathname,
      "@spatialdeck/player": new URL(
        "./packages/player/src/index.ts",
        import.meta.url,
      ).pathname,
      "@spatialdeck/plugins/archive": new URL(
        "./packages/plugins/src/archive.ts",
        import.meta.url,
      ).pathname,
    },
  },
  test: {
    include: ["packages/**/*.test.ts", "scripts/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["packages/core/src/**/*.ts"],
      exclude: [
        "packages/core/src/document/types.ts",
        "packages/core/src/document/validator.d.ts",
      ],
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "test-results/coverage",
      thresholds: { statements: 85, branches: 80 },
    },
  },
});
