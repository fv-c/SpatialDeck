import { readFile, readdir } from "node:fs/promises";
const walk = async (p) =>
  (
    await Promise.all(
      (await readdir(p, { withFileTypes: true })).map((e) =>
        e.isDirectory() ? walk(`${p}/${e.name}`) : `${p}/${e.name}`,
      ),
    )
  ).flat();
const issues = [];
for (const name of ["core", "player"]) {
  const manifest = JSON.parse(
    await readFile(`packages/${name}/package.json`, "utf8"),
  );
  for (const dependency of Object.keys(manifest.dependencies ?? {}))
    if (
      /react|editor|plugins|cli|impress/.test(dependency) ||
      (name === "core" && dependency.includes("player"))
    )
      issues.push(`${name}: ${dependency}`);
  for (const file of await walk(`packages/${name}/src`)) {
    const source = await readFile(file, "utf8");
    if (
      /\b(?:eval|Function)\s*\(|\.innerHTML\s*=|https?:\/\//.test(source) &&
      !file.endsWith("validator.js")
    )
      issues.push(`${file}: unsafe runtime operation`);
    if (
      name === "core" &&
      /\b(?:window|HTMLElement|requestAnimationFrame|localStorage|fetch)\b|from ['"](?:node:|@spatialdeck\/(?:player|editor)|react)/.test(
        source,
      )
    )
      issues.push(`${file}: core boundary`);
    if (/from ['"](?:react|@spatialdeck\/(?:editor|plugins))/.test(source))
      issues.push(`${file}: forbidden import`);
  }
  const built = await readFile(`packages/${name}/dist/index.js`, "utf8");
  if (
    /new Function|eval\(|Ajv|react-dom|react\/jsx|@spatialdeck\/editor/.test(
      built,
    )
  )
    issues.push(`${name}: forbidden bundled code`);
}
if (issues.length) throw new Error(issues.join("\n"));
console.log(
  "Boundaries: 2 packages passed; no DOM in core, React/editor or dynamic compilation",
);
