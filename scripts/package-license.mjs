import { copyFile } from "node:fs/promises";
// prepack: every package tarball carries the repository GPL text as LICENSE.
// The copy is ignored by Git; the canonical file stays at the repository root.
await copyFile(new URL("../LICENSE", import.meta.url), "LICENSE");
