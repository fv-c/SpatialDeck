import type { Diagnostic, ProjectDocument } from "./index.js";
import { diagnostic } from "./index.js";

export function usesBlocks(doc: ProjectDocument): boolean {
  return (
    doc.scenes.some((s) => s.blocks.some((b) => b.type !== "text")) ||
    Object.keys(doc.pluginSettings ?? {}).length > 0
  );
}
export function validateContents(doc: ProjectDocument): Diagnostic[] {
  const errors: Diagnostic[] = [];
  const add = (message: string, pointer: string) =>
    errors.push(diagnostic("CONTENT_REFERENCE", message, pointer));
  if (usesBlocks(doc) && !doc.requiredCapabilities.includes("blocks"))
    errors.push(
      diagnostic(
        "CAPABILITY_REQUIRED",
        "Content requires blocks capability",
        "/requiredCapabilities",
      ),
    );
  const assets = new Map(doc.assets.map((a) => [a.id, a]));
  doc.scenes.forEach((s, i) =>
    s.blocks.forEach((b, j) => {
      const p = `/scenes/${i}/blocks/${j}/data`;
      if (b.type === "image" || b.type === "audio" || b.type === "video") {
        const a = assets.get(b.data.assetId);
        if (!a) add("Unknown asset", p + "/assetId");
        else if (!a.mime.startsWith(b.type + "/"))
          add("Asset MIME does not match block type", p + "/assetId");
      }
      if (b.type === "video") {
        if (
          b.data.posterAssetId &&
          !assets.get(b.data.posterAssetId)?.mime.startsWith("image/")
        )
          add("Unknown image poster", p + "/posterAssetId");
        if (
          b.data.captionsAssetId &&
          assets.get(b.data.captionsAssetId)?.mime !== "text/vtt"
        )
          add("Unknown VTT captions", p + "/captionsAssetId");
      }
      if (
        b.type === "link" &&
        !doc.paths
          .find((path) => path.id === b.data.target.pathId)
          ?.nodes.some((n) => n.id === b.data.target.nodeId)
      )
        add("Unknown link path/node", p + "/target");
      if (b.type === "embed") {
        try {
          const url = new URL(b.data.url);
          if (url.protocol !== "https:" || url.username || url.password)
            add("Embed requires HTTPS without credentials", p + "/url");
        } catch {
          add("Invalid embed URL", p + "/url");
        }
      }
    }),
  );
  return errors;
}
