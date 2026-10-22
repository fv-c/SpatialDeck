import { build } from "vite";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
// Measurements go to the ignored test-results tree; no tracked file is rewritten.
const out = "test-results/bundle";
await rm(out, { recursive: true, force: true });
await build({
  configFile: false,
  logLevel: "error",
  build: {
    target: ["chrome120", "firefox120", "safari17"],
    outDir: `${out}/consumer`,
    lib: {
      entry: "scripts/bundle-entry.ts",
      formats: ["es"],
      fileName: "consumer",
    },
    rollupOptions: {},
  },
});
let js = 0,
  css = 0;
const artifacts = [];
for (const name of await readdir(`${out}/consumer`)) {
  const data = await readFile(`${out}/consumer/${name}`);
  const size = gzipSync(data, { level: 9, mtime: 0 }).length;
  artifacts.push({ file: name, gzipBytes: size });
  if (name.endsWith(".js")) {
    js += size;
    if (
      /react-dom|react\/jsx|new Function|eval\(|@spatialdeck\/editor|DOMPurify|marked|KaTeX|fflate/.test(
        data.toString(),
      )
    )
      throw new Error("Forbidden dependency/dynamic compilation");
  }
  if (name.endsWith(".css")) css += size;
}
const result = {
  jsGzipBytes: js,
  cssGzipBytes: css,
  budgets: { js: 102400, css: 20480 },
  artifacts,
};
await mkdir(out, { recursive: true });
await writeFile(`${out}/report.json`, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result));
if (js > 102400 || css > 20480) throw new Error("Bundle budget exceeded");
