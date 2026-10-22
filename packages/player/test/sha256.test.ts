import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { Sha256 } from "../src/assets/sha256.js";
const hex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
const local = (...chunks: Uint8Array[]) => {
  const hash = new Sha256();
  for (const c of chunks) hash.update(c);
  return hash.digest();
};
const ascii = (s: string) => new TextEncoder().encode(s);
// FIPS 180-4 / NIST CAVP example vectors.
it.each([
  ["", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
  ["abc", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
  [
    "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
    "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
  ],
  [
    "abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu",
    "cf5b16a778af8380036ce59e7b0492370b249b11e8f07a51afac45037afee9d1",
  ],
])("local SHA-256 matches the standard vector for %j", (input, expected) => {
  expect(local(ascii(input))).toBe(expected);
});
it("local SHA-256 matches the one million 'a' vector with uneven chunks", () => {
  const block = ascii("a".repeat(997));
  const hash = new Sha256();
  let left = 1_000_000;
  while (left > 0) {
    const n = Math.min(left, block.length);
    hash.update(block.subarray(0, n));
    left -= n;
  }
  expect(hash.digest()).toBe(
    "cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0",
  );
});
it("local SHA-256 matches crypto.subtle and node:crypto across block boundaries and chunkings", async () => {
  const data = new Uint8Array(300);
  for (let i = 0; i < data.length; i++) data[i] = (i * 151 + 7) & 255;
  for (const length of [
    0, 1, 54, 55, 56, 57, 63, 64, 65, 119, 120, 127, 128, 129, 191, 192, 255,
    300,
  ]) {
    const input = data.subarray(0, length);
    const subtle = hex(
      await crypto.subtle.digest("SHA-256", input.slice().buffer),
    );
    expect(local(input)).toBe(subtle);
    expect(local(input)).toBe(createHash("sha256").update(input).digest("hex"));
    for (const step of [1, 3, 64, 65]) {
      const chunks = [];
      for (let i = 0; i < length; i += step)
        chunks.push(input.subarray(i, i + step));
      expect(local(...chunks)).toBe(subtle);
    }
  }
});
