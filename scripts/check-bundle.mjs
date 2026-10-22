import { build } from "vite";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
await build({
  configFile: false,
  logLevel: "error",
  build: {
    target: ["chrome120", "firefox120", "safari17"],
    outDir: ".tools/bundle",
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
for (const name of await readdir(".tools/bundle")) {
  const data = await readFile(`.tools/bundle/${name}`);
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
await writeFile(
  "docs/verification/content-bundle.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify(result));
if (js > 102400 || css > 20480) throw new Error("Bundle budget exceeded");
