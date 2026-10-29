/**
 * Animated images (GIF with several frames, APNG, animated WebP) play on the
 * wall clock, so a capture would show whatever frame the browser reached.
 * Shared by the CLI, which reports them, and the capture runtime, which
 * replaces them with their first frame.
 */
export function isAnimatedImage(bytes: Uint8Array, mime: string): boolean {
  const ascii = (at: number, length: number) =>
    String.fromCharCode(...bytes.subarray(at, at + length));
  if (mime === "image/gif") return gifFrames(bytes) > 1;
  if (mime === "image/png") {
    // An APNG declares acTL before its first IDAT.
    for (let at = 8; at + 8 <= bytes.length;) {
      const length =
        ((bytes[at]! << 24) |
          (bytes[at + 1]! << 16) |
          (bytes[at + 2]! << 8) |
          bytes[at + 3]!) >>>
        0;
      const type = ascii(at + 4, 4);
      if (type === "acTL") return true;
      if (type === "IDAT" || type === "IEND") return false;
      at += 12 + length;
    }
    return false;
  }
  if (mime === "image/webp")
    return ascii(12, 4) === "VP8X" && ((bytes[20] ?? 0) & 0x02) !== 0;
  return false;
}

function gifFrames(bytes: Uint8Array): number {
  const colorTable = (packed: number) =>
    packed & 0x80 ? 3 * 2 ** ((packed & 0x07) + 1) : 0;
  const subBlocks = (at: number) => {
    while (at < bytes.length && bytes[at] !== 0) at += bytes[at]! + 1;
    return at + 1;
  };
  let at = 13 + colorTable(bytes[10] ?? 0),
    frames = 0;
  while (at < bytes.length) {
    const marker = bytes[at];
    if (marker === 0x2c) {
      frames++;
      if (frames > 1) return frames;
      // Image descriptor, optional local table, LZW code size, image data.
      at = subBlocks(at + 10 + colorTable(bytes[at + 9] ?? 0) + 1);
    } else if (marker === 0x21) at = subBlocks(at + 2);
    else break;
  }
  return frames;
}
