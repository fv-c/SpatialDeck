import { Unzip, UnzipInflate, zipSync, strToU8 } from "fflate";
import {
  normalizedPath,
  serializeDocument,
  validateDocument,
} from "@spatialdeck/core";
import type { ProjectDocument } from "@spatialdeck/core";
import {
  FILE_LIMIT,
  TOTAL_LIMIT,
  sha256,
  verifyAsset,
} from "@spatialdeck/player";
import type { AssetBlobs } from "@spatialdeck/player";
const JSON_LIMIT = 10 * 1024 * 1024;
const ENTRY_LIMIT = 10000;
export interface ArchiveProject {
  document: ProjectDocument;
  blobs: Map<string, Blob>;
}
interface Entry {
  name: string;
  size: number;
  compressed: number;
  offset: number;
  method: number;
  flags: number;
  crc: number;
}
const crcTable = Array.from({ length: 256 }, (_, i) => {
  let c = i;
  for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(bytes: Uint8Array) {
  let c = 0xffffffff;
  for (const b of bytes) c = crcTable[(c ^ b) & 255]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
/** Inspect central AND local headers before allocating decompressed output. ZIP64/multidisk/encrypted archives are deliberately unsupported. */
function inventory(bytes: Uint8Array): Entry[] {
  if (bytes.length > TOTAL_LIMIT + JSON_LIMIT * 2)
    throw new Error("Archivio troppo grande.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (p: number) => view.getUint16(p, true),
    u32 = (p: number) => view.getUint32(p, true);
  let end = bytes.length - 22;
  while (
    end >= Math.max(0, bytes.length - 65557) &&
    (u32(end) !== 0x06054b50 || end + 22 + u16(end + 20) !== bytes.length)
  )
    end--;
  if (end < 0 || u32(end) !== 0x06054b50)
    throw new Error("Directory ZIP assente.");
  const count = u16(end + 10),
    start = u32(end + 16),
    length = u32(end + 12);
  if (
    u16(end + 4) ||
    u16(end + 6) ||
    u16(end + 8) !== count ||
    count > ENTRY_LIMIT ||
    start + length !== end
  )
    throw new Error("Directory ZIP non supportata.");
  const names = new Set<string>(),
    entries: Entry[] = [];
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let p = start,
    total = 0;
  for (let i = 0; i < count; i++) {
    if (p + 46 > end || u32(p) !== 0x02014b50)
      throw new Error("Header ZIP invalido.");
    const flags = u16(p + 8),
      method = u16(p + 10),
      compressed = u32(p + 20),
      size = u32(p + 24),
      n = u16(p + 28),
      extra = u16(p + 30),
      comment = u16(p + 32),
      offset = u32(p + 42);
    if (
      p + 46 + n + extra + comment > end ||
      flags & ~0x0808 ||
      ![0, 8].includes(method) ||
      u16(p + 34) ||
      ((u32(p + 38) >>> 16) & 0xf000) === 0xa000
    )
      throw new Error("Entry ZIP non supportata (link/cifratura/metodo).");
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + n));
    if (
      !name ||
      name.length > 512 ||
      normalizedPath(name) !== name ||
      name.includes("%") ||
      names.has(name)
    )
      throw new Error("Path ZIP pericoloso o duplicato.");
    names.add(name);
    const json = name === "project.json" || name === "manifest.json";
    if (
      size > (json ? JSON_LIMIT : FILE_LIMIT) ||
      (total += size) > TOTAL_LIMIT
    )
      throw new Error("Limite ZIP decompresso superato.");
    if (
      offset + 30 > start ||
      u32(offset) !== 0x04034b50 ||
      u16(offset + 6) !== flags ||
      u16(offset + 8) !== method
    )
      throw new Error("Header locale incoerente.");
    const ln = u16(offset + 26),
      le = u16(offset + 28);
    if (
      offset + 30 + ln + le + compressed > start ||
      decoder.decode(bytes.subarray(offset + 30, offset + 30 + ln)) !== name
    )
      throw new Error("Path/header locale incoerente.");
    if (
      !(flags & 8) &&
      (u32(offset + 18) !== compressed ||
        u32(offset + 22) !== size ||
        u32(offset + 14) !== u32(p + 16))
    )
      throw new Error("Dimensioni/header ZIP incoerenti.");
    entries.push({
      name,
      size,
      compressed,
      offset,
      method,
      flags,
      crc: u32(p + 16),
    });
    p += 46 + n + extra + comment;
  }
  if (p !== end) throw new Error("Entry ZIP extra.");
  let cursor = 0;
  for (const entry of [...entries].sort((a, b) => a.offset - b.offset)) {
    if (entry.offset !== cursor)
      throw new Error("Entry ZIP sovrapposte o nascoste.");
    cursor =
      entry.offset +
      30 +
      u16(entry.offset + 26) +
      u16(entry.offset + 28) +
      entry.compressed;
    if (entry.flags & 8) {
      if (u32(cursor) === 0x08074b50) cursor += 4;
      if (
        u32(cursor) !== entry.crc ||
        u32(cursor + 4) !== entry.compressed ||
        u32(cursor + 8) !== entry.size
      )
        throw new Error("Descriptor ZIP incoerente.");
      cursor += 12;
    }
  }
  if (cursor !== start) throw new Error("Dati ZIP non indicizzati.");
  return entries;
}
export async function readArchive(blob: Blob): Promise<ArchiveProject> {
  if (blob.size > TOTAL_LIMIT + JSON_LIMIT * 2)
    throw new Error("Archivio troppo grande.");
  const bytes = new Uint8Array(await blob.arrayBuffer()),
    entries = inventory(bytes),
    files = new Map<string, Uint8Array>();
  let total = 0,
    failure: Error | undefined;
  const unzip = new Unzip((file) => {
    const entry = entries.find((e) => e.name === file.name);
    if (!entry || files.has(file.name))
      throw new Error("Entry non indicizzata.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    file.ondata = (error, chunk, final) => {
      if (failure) return;
      if (
        error ||
        (size += chunk.length) > entry.size ||
        (total += chunk.length) > TOTAL_LIMIT
      ) {
        failure = error ?? new Error("Limite dopo inflate superato.");
        file.terminate();
        return;
      }
      chunks.push(chunk);
      if (final) {
        if (size !== entry.size) {
          failure = new Error("Dimensione decompresso incoerente.");
          return;
        }
        const output = new Uint8Array(size);
        let at = 0;
        for (const c of chunks) {
          output.set(c, at);
          at += c.length;
        }
        if (crc32(output) !== entry.crc) {
          failure = new Error("CRC ZIP errato.");
          return;
        }
        files.set(file.name, output);
      }
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  // Bound the output of an individual synchronous inflate step as well as the total.
  for (let i = 0; i < bytes.length; i += 4096) {
    unzip.push(bytes.subarray(i, i + 4096), i + 4096 >= bytes.length);
    if (failure) throw failure;
  }
  if (files.size !== entries.length) throw new Error("Archivio incompleto.");
  const decode = (name: string) => {
    const b = files.get(name);
    if (!b) throw new Error(`Manca ${name}`);
    return new TextDecoder("utf-8", { fatal: true }).decode(b);
  };
  const valid = validateDocument(decode("project.json"));
  if (!valid.ok)
    throw new Error(valid.diagnostics.map((d) => d.message).join("; "));
  const manifest: unknown = JSON.parse(decode("manifest.json"));
  if (
    !manifest ||
    typeof manifest !== "object" ||
    !("version" in manifest) ||
    manifest.version !== "1.0.0" ||
    !("assets" in manifest) ||
    !Array.isArray(manifest.assets) ||
    manifest.assets.length !== valid.value.assets.length
  )
    throw new Error("Manifest invalido.");
  const blobs = new Map<string, Blob>(),
    seen = new Set<string>();
  for (const item of manifest.assets as unknown[]) {
    if (!item || typeof item !== "object" || Array.isArray(item))
      throw new Error("Asset manifest invalido.");
    const m = item as Record<string, unknown>,
      a = valid.value.assets.find((a) => a.id === m.id);
    if (
      !a ||
      seen.has(a.id) ||
      m.path !== a.path ||
      typeof m.entry !== "string" ||
      !m.entry.startsWith(`assets/${a.id}/`) ||
      m.mime !== a.mime ||
      m.byteLength !== a.byteLength ||
      typeof m.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(m.sha256)
    )
      throw new Error("Asset manifest incoerente.");
    const data = files.get(m.entry);
    if (!data) throw new Error(`Risorsa assente: ${a.path}`);
    const assetBlob = new Blob([data as Uint8Array<ArrayBuffer>], {
      type: a.mime,
    });
    await verifyAsset(a, assetBlob);
    if ((await sha256(assetBlob)) !== m.sha256)
      throw new Error("Digest manifest errato.");
    blobs.set(a.id, assetBlob);
    seen.add(a.id);
  }
  if (files.size !== blobs.size + 2)
    throw new Error("File extra non dichiarati nel manifest.");
  return { document: valid.value, blobs };
}
export async function writeArchive(
  document: ProjectDocument,
  blobs: AssetBlobs,
): Promise<Blob> {
  const valid = serializeDocument(document);
  if (!valid.ok) throw new Error("Documento invalido.");
  const files: Record<string, Uint8Array> = Object.create(null);
  files["project.json"] = strToU8(valid.value);
  const manifest = {
    version: "1.0.0",
    assets: [] as Array<{
      id: string;
      path: string;
      entry: string;
      mime: string;
      byteLength: number;
      sha256: string;
    }>,
  };
  for (const a of document.assets) {
    const blob = blobs.get(a.id);
    if (!blob)
      throw new Error(
        `Risorsa mancante: ${a.id}. Associa il file prima di salvare l’archivio.`,
      );
    const name =
      a.path
        .split("/")
        .at(-1)!
        .normalize("NFC")
        .replace(/[^A-Za-z0-9._-]/g, "_") || "asset";
    const entry = `assets/${a.id}/${name}`;
    await verifyAsset(a, blob);
    files[entry] = new Uint8Array(await blob.arrayBuffer());
    manifest.assets.push({ ...a, entry, sha256: await sha256(blob) });
  }
  files["manifest.json"] = strToU8(JSON.stringify(manifest));
  if (
    Object.values(files).reduce((total, bytes) => total + bytes.length, 0) >
    TOTAL_LIMIT
  )
    throw new Error("Limite totale archivio decompresso superato.");
  const zipped = zipSync(files, { level: 6 });
  return new Blob([zipped as Uint8Array<ArrayBuffer>], {
    type: "application/zip",
  });
}
