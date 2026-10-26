import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
// KaTeX fonts ship as woff2 files next to the plugins build, never as data:
// URLs, with the KaTeX licence alongside. Run from packages/plugins after vite build.
const source = await readFile("src/katex.css", "utf8");
const prefix = "../node_modules/katex/dist/fonts/";
const files = [...source.matchAll(/url\(([^)]+)\)/g)].map((m) => m[1]);
await mkdir("dist/fonts", { recursive: true });
for (const file of files) {
  if (!file.startsWith(prefix) || !file.endsWith(".woff2"))
    throw new Error(`Unexpected font URL ${file}`);
  await copyFile(
    file.replace("../", ""),
    `dist/fonts/${file.split("/").pop()}`,
  );
}
await copyFile("node_modules/katex/LICENSE", "dist/fonts/KaTeX-LICENSE.txt");
await writeFile("dist/plugins.css", source.replaceAll(prefix, "./fonts/"));
console.log(
  `KaTeX fonts: ${files.length} woff2 files and licence in dist/fonts`,
);
