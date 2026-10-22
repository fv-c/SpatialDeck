import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import { zipSync, strToU8, unzipSync, strFromU8 } from "fflate";
import { readArchive, writeArchive } from "../src/archive.js";
import { validateDocument } from "@spatialdeck/core";
import { verifyAsset, sha256 } from "../../player/src/assets/index.js";
import fixture from "../../../examples/content-gallery/project.json";
async function gallery() {
  const r = validateDocument(fixture);
  if (!r.ok) throw new Error();
  const blobs = new Map<string, Blob>();
  for (const a of r.value.assets)
    blobs.set(
      a.id,
      new Blob(
        [
          await readFile(
            new URL(
              `../../../examples/content-gallery/assets/${a.path.split("/").at(-1)}`,
              import.meta.url,
            ),
          ),
        ],
        { type: a.mime },
      ),
    );
  return { document: r.value, blobs };
}
it("real archive roundtrips every source and verified local Blob", async () => {
  const { document, blobs } = await gallery(),
    archive = await writeArchive(document, blobs),
    reopened = await readArchive(archive);
  expect(reopened.document).toEqual(document);
  for (const [id, b] of blobs)
    expect(await sha256(reopened.blobs.get(id)!)).toBe(await sha256(b));
});
it.each([
  "../x",
  "/tmp/x",
  "a\\b",
  "%2e%2e/x",
  "assets/%2fx",
  "assets/a/./b",
  "assets/a//b",
  "C:/x",
  "assets/e\u0301",
])("refuses ZIP unsafe or noncanonical path %s", async (path) => {
  const zip = zipSync({ [path]: strToU8("inert") });
  await expect(readArchive(new Blob([zip]))).rejects.toThrow();
});
it("refuses symlinks, duplicates, bad local headers, encrypted entries and inflated limits", async () => {
  const original = zipSync({ "project.json": strToU8("a".repeat(100000)) });
  const central = original.findIndex(
    (_, i) =>
      original[i] === 80 &&
      original[i + 1] === 75 &&
      original[i + 2] === 1 &&
      original[i + 3] === 2,
  );
  for (const mutate of [
    (v: DataView) => v.setUint32(central + 38, 0xa1ff0000, true),
    (v: DataView) => {
      v.setUint16(central + 8, 1, true);
      v.setUint16(6, 1, true);
    },
    (v: DataView) => v.setUint32(central + 24, 52428801, true),
    (v: DataView) => {
      v.setUint32(central + 24, 32, true);
      v.setUint32(22, 32, true);
    },
    (v: DataView) => v.setUint8(30, 88),
  ]) {
    const bytes = original.slice();
    mutate(new DataView(bytes.buffer));
    await expect(readArchive(new Blob([bytes]))).rejects.toThrow();
  }
  const duplicate = zipSync({
    "assets/a.txt": strToU8("1"),
    "assets/b.txt": strToU8("2"),
  });
  const bytes = duplicate.slice();
  for (let i = 0; i < bytes.length - 12; i++) {
    if (String.fromCharCode(...bytes.slice(i, i + 12)) === "assets/b.txt")
      bytes[i + 7] = 97;
  }
  await expect(readArchive(new Blob([bytes]))).rejects.toThrow(/duplicat/);
});
it("refuses a dishonest digest, incompatible MIME, missing resources and oversized JSON", async () => {
  const { document, blobs } = await gallery(),
    a = document.assets[0]!;
  document.assets[0] = { ...a, sha256: "0".repeat(64) };
  await expect(writeArchive(document, blobs)).rejects.toThrow(/Digest/);
  document.assets[0] = a;
  await expect(
    verifyAsset({ ...a, mime: "image/png" }, blobs.get(a.id)!),
  ).rejects.toThrow(/MIME/);
  await expect(writeArchive(document, new Map())).rejects.toThrow(/mancante/);
  const zip = zipSync({ "project.json": new Uint8Array(10 * 1024 * 1024 + 1) });
  await expect(readArchive(new Blob([zip]))).rejects.toThrow(/Limite/);
});
it("enforces actual file/entry/total limits before allocating inflated bodies", async () => {
  const zip = zipSync({ asset: strToU8("x") }),
    v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength),
    central = zip.findIndex(
      (_, i) => i + 4 <= zip.length && v.getUint32(i, true) === 0x02014b50,
    );
  v.setUint32(central + 24, 50 * 1024 * 1024 + 1, true);
  await expect(readArchive(new Blob([zip]))).rejects.toThrow(/Limite/);
  const many = Object.fromEntries(
    Array.from({ length: 10001 }, (_, i) => ["x" + i, new Uint8Array()]),
  );
  await expect(readArchive(new Blob([zipSync(many)]))).rejects.toThrow();
});
it("checks manifest digests and cumulative size, rejects extra files and CRC corruption", async () => {
  const { document, blobs } = await gallery(),
    archive = await writeArchive(document, blobs),
    files = unzipSync(new Uint8Array(await archive.arrayBuffer()));
  const manifest = JSON.parse(strFromU8(files["manifest.json"]!));
  manifest.assets[0].sha256 = "0".repeat(64);
  files["manifest.json"] = strToU8(JSON.stringify(manifest));
  await expect(readArchive(new Blob([zipSync(files)]))).rejects.toThrow(
    /Digest/,
  );
  const many = zipSync(
      Object.fromEntries(
        Array.from({ length: 5 }, (_, i) => ["a" + i, strToU8("x")]),
      ),
    ),
    v = new DataView(many.buffer, many.byteOffset, many.byteLength);
  for (let i = 0; i < many.length - 46; i++)
    if (v.getUint32(i, true) === 0x02014b50) {
      v.setUint32(i + 24, 50 * 1024 * 1024, true);
      v.setUint32(v.getUint32(i + 42, true) + 22, 50 * 1024 * 1024, true);
    }
  await expect(readArchive(new Blob([many]))).rejects.toThrow(/Limite/);
  const corrupt = zipSync({ "project.json": strToU8("{}") }, { level: 0 });
  corrupt[30 + "project.json".length] = 32;
  await expect(readArchive(new Blob([corrupt]))).rejects.toThrow(/CRC/);
  const original = unzipSync(new Uint8Array(await archive.arrayBuffer()));
  original["extra.txt"] = strToU8("extra");
  await expect(readArchive(new Blob([zipSync(original)]))).rejects.toThrow(
    /extra/,
  );
});
it("packs arbitrary safe sidecar paths without rewriting the canonical JSON", async () => {
  const { document, blobs } = await gallery();
  document.assets[0]!.path = "pictures/safe%20diagram.svg";
  const result = await readArchive(await writeArchive(document, blobs));
  expect(result.document).toEqual(document);
});
