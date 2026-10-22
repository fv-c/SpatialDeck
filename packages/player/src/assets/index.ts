import type { Asset } from "@spatialdeck/core";
export interface AssetLease {
  url: string;
  mime: string;
  blob?: Blob;
  release(): void;
}
export interface AssetResolver {
  resolve(assetId: string, signal?: AbortSignal): Promise<AssetLease>;
}
export type AssetBlobs = ReadonlyMap<string, Blob>;
export const FILE_LIMIT = 50 * 1024 * 1024;
export const TOTAL_LIMIT = 200 * 1024 * 1024;
export async function sha256(blob: Blob): Promise<string> {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
/** Read signatures, never run or render files to identify their type. */
export async function verifyAsset(asset: Asset, blob: Blob): Promise<void> {
  if (blob.size !== asset.byteLength || blob.size > FILE_LIMIT)
    throw new Error("Dimensione asset non valida.");
  const bytes = new Uint8Array(await blob.slice(0, 4096).arrayBuffer());
  const ascii = (offset: number, length: number) =>
    String.fromCharCode(...bytes.slice(offset, offset + length));
  const begins = (...signature: number[]) =>
    signature.every((v, i) => bytes[i] === v);
  const text = new TextDecoder("utf-8", { fatal: true });
  let matches = false;
  switch (asset.mime) {
    case "image/png":
      matches = begins(137, 80, 78, 71, 13, 10, 26, 10);
      break;
    case "image/jpeg":
      matches = begins(255, 216, 255);
      break;
    case "image/gif":
      matches = ["GIF87a", "GIF89a"].includes(ascii(0, 6));
      break;
    case "image/webp":
      matches = ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP";
      break;
    case "image/svg+xml":
      matches = /^\s*(?:<\?xml[^>]*>\s*)?<svg[\s>]/i.test(text.decode(bytes));
      break;
    case "audio/wav":
    case "audio/x-wav":
      matches = ascii(0, 4) === "RIFF" && ascii(8, 4) === "WAVE";
      break;
    case "audio/mpeg":
      matches =
        ascii(0, 3) === "ID3" ||
        (bytes[0] === 255 && ((bytes[1] ?? 0) & 224) === 224);
      break;
    case "audio/ogg":
    case "video/ogg":
      matches = ascii(0, 4) === "OggS";
      break;
    case "video/webm":
    case "audio/webm":
      matches = begins(26, 69, 223, 163);
      break;
    case "video/mp4":
    case "audio/mp4":
      matches = ascii(4, 4) === "ftyp";
      break;
    case "text/vtt":
      matches = /^\ufeff?WEBVTT(?:[\t \r\n]|$)/.test(text.decode(bytes));
      break;
    case "text/plain":
      text.decode(await blob.arrayBuffer());
      matches = true;
      break;
  }
  if (!matches) throw new Error(`MIME o firma asset incoerenti: ${asset.mime}`);
  if (asset.sha256 && (await sha256(blob)) !== asset.sha256)
    throw new Error("Digest asset errato.");
}
/** Each resolve owns one URL. Release is idempotent and scoped to its consumer. */
export function createAssetResolver(
  assets: readonly Asset[],
  blobs: AssetBlobs,
): AssetResolver {
  return {
    async resolve(id, signal) {
      const asset = assets.find((a) => a.id === id),
        blob = blobs.get(id);
      if (!asset || !blob)
        throw new Error(
          `Risorsa mancante: ${id}. Associa il file nel pannello Risorse.`,
        );
      await verifyAsset(asset, blob);
      if (signal?.aborted) throw new Error("Caricamento annullato.");
      const url = URL.createObjectURL(
        blob.type === asset.mime
          ? blob
          : new Blob([blob], { type: asset.mime }),
      );
      let released = false;
      const release = () => {
        if (!released) {
          released = true;
          URL.revokeObjectURL(url);
          signal?.removeEventListener("abort", release);
        }
      };
      signal?.addEventListener("abort", release, { once: true });
      return { url, mime: asset.mime, blob, release };
    },
  };
}
