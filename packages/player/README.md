# @spatialdeck/player

Framework-free DOM/CSS 3D player of [SpatialDeck](https://github.com/fv-c/SpatialDeck) presentations: navigation through paths and choices, keyboard input on the focused container, text view, reduced motion, a renderer registry, a verified asset resolver and, since 0.6, a capture clock (`renderAt`). No React, no editor.

```ts
import { createPlayer } from "@spatialdeck/player";
import "@spatialdeck/player/style.css";
import "@spatialdeck/player/fonts.css"; // only if a theme uses Atkinson Hyperlegible

const player = createPlayer({ input: true });
const mounted = await player.mount(document.querySelector("#deck")!, project);
if (mounted.ok) await player.next();
player.destroy();
```

- Interface texts default to English since 0.6; `italianMessages` is exported as an alternative (`createPlayer({ messages: italianMessages })`).
- Rich content (Markdown, HTML, SVG, LaTeX) and media need renderers: `createBuiltinRegistry()` from `@spatialdeck/plugins/builtins`.
- Classic script without a bundler: `@spatialdeck/player/iife` (`dist/iife/spatialdeck-player.iife.js`, global `SpatialDeck`) with `dist/iife/player.css`. That build embeds core, gl-matrix and the Ajv runtime; their licences are in `dist/iife/THIRD_PARTY_NOTICES.txt`.
- Theme font: Atkinson Hyperlegible 5.3.0 (SIL OFL 1.1), woff2 files in `dist/fonts/` with `OFL.txt`, fetched by the browser only when used.

Not yet published to npm (scope verification pending). Licence: GPL-3.0-or-later. API: [DEVELOPMENT.md](https://github.com/fv-c/SpatialDeck/blob/main/docs/DEVELOPMENT.md).
