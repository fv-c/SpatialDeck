# @spatialdeck/plugins

Optional renderers and tools for [SpatialDeck](https://github.com/fv-c/SpatialDeck): Markdown, HTML and SVG through one DOMPurify pipeline, LaTeX with KaTeX (`trust: false`), images, audio and video with local assets, internal links, opt-in sandboxed embeds, the plugin SDK (API 1.0.0) and the `.spatialdeck` archive.

```ts
import { createPlayer } from "@spatialdeck/player";
import { createBuiltinRegistry } from "@spatialdeck/plugins/builtins";
import "@spatialdeck/player/style.css";
import "@spatialdeck/plugins/style.css"; // KaTeX styles, woff2 fonts as files

const { registry, plugins } = createBuiltinRegistry();
const player = createPlayer({ registry });
```

- `createBuiltinRegistry()` loads the rich and media renderers on demand: a bundler emits them as separate chunks fetched the first time a document uses them. The demo badge plugin is not a builtin; approve it explicitly with `createBuiltinRegistry({ plugins: [samplePlugin()] })`.
- Third-party code (DOMPurify, marked, KaTeX, fflate) stays a dependency: update them in your lockfile; nothing is copied into `dist`. `style.css` is the KaTeX stylesheet rewritten to woff2 sources; the fonts and the KaTeX licence are in `dist/fonts/`.
- `writeArchive` streams in chunks and yields to the event loop; already compressed media are stored, not deflated again.
- Plugins are trusted host code with page authority, not a sandbox: see [PLUGINS.md](https://github.com/fv-c/SpatialDeck/blob/main/docs/PLUGINS.md).

Not yet published to npm (scope verification pending). Licence: GPL-3.0-or-later.
