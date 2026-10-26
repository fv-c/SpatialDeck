# @spatialdeck/cli

Command line of [SpatialDeck](https://github.com/fv-c/SpatialDeck): validate projects, build static bundles and export a standalone offline HTML, a PDF and a minimal WebM video from an explicit itinerary. It reuses core for validation and the published player for every rendering and capture; no editor or React.

```sh
spatialdeck validate project.json --json
spatialdeck build project.json --out site
spatialdeck export html deck.spatialdeck --out deck.html
spatialdeck export pdf project.json --itinerary itinerary.json --out deck.pdf
spatialdeck export video project.json --itinerary itinerary.json --fps 30 --out deck.webm
```

- Inputs: a project JSON (assets resolved inside its directory, no traversal or symbolic links) or a `.spatialdeck` archive.
- Strict by default: embeds, plugins, remote resources and media outside a format profile fail with exit 1; `--allow-partial` writes placeholders and a manifest with status `partial`.
- Every output has an `ExportManifest` (`<out>.manifest.json`, or `export-manifest.json` in a build) with resources, digests, licences, warnings, environment and the checks actually run. Private notes are never exported.
- Outputs are written through a temporary file and an atomic rename; an existing output needs `--overwrite`.
- PDF and video need Chromium for Playwright 1.64.1 (`npx playwright@1.64.1 install chromium`); video also needs `ffmpeg` and `ffprobe` with a WebM encoder (VP9 preferred). Nothing is installed automatically; a missing tool exits with 2.
- Exit codes: 0 success, 1 invalid project/itinerary/capability, 2 missing environment, 3 write or export failure.

The export runtime (`dist/runtime/spatialdeck-runtime.js`) embeds the player and its third-party code; licences in `dist/runtime/THIRD_PARTY_NOTICES.txt`, also embedded in every HTML export. Not yet published to npm (scope verification pending). Licence: GPL-3.0-or-later. Formats and limits: [DISTRIBUTION.md](https://github.com/fv-c/SpatialDeck/blob/main/docs/DISTRIBUTION.md).
