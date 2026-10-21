import js from "@eslint/js";
import ts from "typescript-eslint";
export default ts.config(
  {
    ignores: [
      "**/dist/**",
      ".tools/**",
      "**/validator.js",
      "test-results/**",
      "playwright-report/**",
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ["**/*.{js,mjs,ts}"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        URL: "readonly",
        TextEncoder: "readonly",
        structuredClone: "readonly",
        performance: "readonly",
        AbortController: "readonly",
        document: "readonly",
        window: "readonly",
        HTMLElement: "readonly",
        HTMLInputElement: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        ResizeObserver: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
      },
    },
    rules: { "no-undef": "off" },
  },
);
