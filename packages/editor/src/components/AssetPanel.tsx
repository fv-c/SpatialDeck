import { useState } from "react";
import type { ProjectDocument, Asset } from "@spatialdeck/core";
import { success } from "@spatialdeck/core";
import { sha256, verifyAsset } from "@spatialdeck/player";
import type { AssetBlobs } from "@spatialdeck/player";
import type { EditorStore } from "../store/index.js";
export function AssetPanel({
  store,
  document,
  blobs,
  onBlobs,
}: {
  store: EditorStore;
  document: ProjectDocument;
  blobs: AssetBlobs;
  onBlobs: (doc: ProjectDocument, blobs: AssetBlobs) => void;
}) {
  const [error, setError] = useState("");
  async function add(file: File, existing?: Asset) {
    try {
      if (file.size > 50 * 1024 * 1024)
        throw new Error("Il file supera 50 MiB.");
      const id = existing?.id ?? crypto.randomUUID(),
        name =
          file.name
            .normalize("NFC")
            .replace(/[^a-zA-Z0-9._-]/g, "_")
            .slice(0, 160) || "asset";
      const mime =
        file.type ||
        (
          {
            svg: "image/svg+xml",
            wav: "audio/wav",
            mp4: "video/mp4",
            webm: "video/webm",
            vtt: "text/vtt",
            png: "image/png",
            jpg: "image/jpeg",
          } as Record<string, string>
        )[name.split(".").at(-1)!] ||
        "application/octet-stream";
      const asset: Asset = {
        id,
        path: `assets/${id}/${name}`,
        mime,
        byteLength: file.size,
        sha256: await sha256(file),
      };
      // Restore missing resources against their original metadata; explicit replacement permits new data.
      if (existing && !blobs.has(id)) await verifyAsset(existing, file);
      await verifyAsset(asset, file);
      const result = store.execute((doc) => {
        doc.assets = existing
          ? doc.assets.map((a) => (a.id === id ? asset : a))
          : [...doc.assets, asset];
        return success(doc);
      });
      if (!result.ok)
        throw new Error(result.diagnostics.map((d) => d.message).join("; "));
      onBlobs(store.getSnapshot().document, new Map([[id, file]]));
      setError("");
    } catch (e) {
      setError(String(e));
    }
  }
  return (
    <details open className="asset-panel">
      <summary>Risorse locali · {document.assets.length}</summary>
      <label>
        Aggiungi risorsa
        <input
          type="file"
          aria-label="Aggiungi risorsa locale"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void add(file);
          }}
        />
      </label>
      <p>
        JSON conserva i riferimenti. L’archivio .spatialdeck include i file.
      </p>
      <ul>
        {document.assets.map((a) => (
          <li key={a.id}>
            <strong>{a.path.split("/").at(-1)}</strong>
            <code>{a.id}</code>
            <small>
              {a.mime} · {a.byteLength} B ·{" "}
              {blobs.has(a.id) ? "disponibile" : "mancante"}
            </small>
            <label>
              {blobs.has(a.id) ? "Sostituisci" : "Associa file mancante"}
              <input
                type="file"
                aria-label={`Associa ${a.id}`}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void add(file, a);
                }}
              />
            </label>
          </li>
        ))}
      </ul>
      {error && <p role="alert">{error}</p>}
    </details>
  );
}
