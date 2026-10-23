import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
// Theme fonts ship as files next to the player build, never as data: URLs,
// with the font licence alongside. Run from packages/player after vite build.
const source = await readFile("src/fonts.css", "utf8");
const prefix = "../node_modules/@fontsource/atkinson-hyperlegible/";
const files = [...source.matchAll(/url\("([^"]+)"\)/g)].map((m) => m[1]);
await mkdir("dist/fonts", { recursive: true });
for (const file of files) {
  if (!file.startsWith(prefix)) throw new Error(`Unexpected font URL ${file}`);
  await copyFile(
    file.replace("../", ""),
    `dist/fonts/${file.split("/").pop()}`,
  );
}
await copyFile(`${prefix.replace("../", "")}LICENSE`, "dist/fonts/OFL.txt");
await writeFile(
  "dist/fonts.css",
  source.replaceAll(`${prefix}files/`, "./fonts/"),
);
console.log(`Theme fonts: ${files.length} files and OFL.txt in dist/fonts`);
