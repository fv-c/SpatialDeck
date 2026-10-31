# SpatialDeck 0.5 Layout verification

22–23 October 2026. Schema **1.3.0** with four standalone validators, derived types and copy migration from 1.0.0/1.1.0/1.2.0. **410 unit + 201 E2E = 611 tests passed**, zero failed, skipped or flaky in the last complete suite. Historical fixtures and schemas unchanged on disk. No commit, push, deploy, publish or tag; 0.6 Distribution has not started.

## Baseline, G0 decision and scope

Initial state: only `?? prompts/`, preserved and not added to the index. Read README, PROJECT_SPEC (sections 3, 4, 6, 7, 10, 12, 19, 21), ROADMAP, DEVELOPMENT, AUTHORING, PLUGINS and the 0.1–0.4.1 reports before the sources. No AGENTS file on disk: the phase prompt and the chat instructions apply.

0.4.1 baseline measured before changing code: `pnpm typecheck` exit 0, `pnpm test` **322 passed**, `pnpm test:e2e` **162 passed** (108 Chromium/Firefox with Playwright 1.64.1, 54 WebKit with the macOS 14 runner 1.61.1), zero failed or skipped. Logs in `.tools/layout-baseline/`.

**G0 item 4** is recorded in the specification, section 21: the 1.3.0 model confirmed without changes. It was applied as is; no G0 decision was taken by inference. The local decisions (colour format, embedded font, canvas border, diagnostics, editor) are in the [specification, section 22](../PROJECT_SPEC.md).

## Environment and startup

[Environment](layout-environment.json): macOS 14.8.7 / Darwin 23.6.0 arm64, Apple M3 Max, 64 GiB; Node **24.22.0** and pnpm **12.14.0** from `.tools` (global Node 25.8.1). Chromium **156.0.8078.4** and Firefox **157.0** with Playwright 1.64.1; WebKit **26.5** with runner 1.61.1. Local tests: CI was not run because nothing was sent to the remote.

```sh
export PATH="$PWD/.tools/node_modules/.bin:$PATH" # only if the global Node/pnpm do not match
pnpm install --frozen-lockfile
pnpm dev:studio      # http://127.0.0.1:5174, Open → examples/layout-canvas/layout-canvas.spatialdeck, then Layout
pnpm dev:playground  # http://127.0.0.1:5173/layout
```

Real startup verified in the browser: `/layout` of the development playground with two players, two canvas scenes, eight framed blocks and a resolved image; development Studio with an empty 1.3.0 project, **Layout** and the **document theme**.

## Changes and files

| Area                    | Files                                                                                                                                                                                          | Content                                                                                                                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema                  | `packages/core/schema/project-1.3.0.schema.json` (new), `scripts/generate.mjs`, `packages/core/src/document/{types.ts,validator.js,validator.d.ts}` (generated)                                | Theme, scene appearance, `layout`, `frame`/`style` on every block; four validators with `inlineRefs: false`; types from 1.3.0                                                            |
| Semantics and migration | `packages/core/src/document/{index.ts,layout.ts,structure.ts}`                                                                                                                                 | 1.0.0–1.3.0 dispatcher, 1.2.0→1.3.0 migration, `validateLayout`, `usesLayout`, `defaultTheme`, `defaultAppearance`, `NON_FINITE_NUMBER` with a pointer, `layout` in `updateCapabilities` |
| Geometry                | `packages/core/src/layout/index.ts` (new)                                                                                                                                                      | Frame↔scene, corners, bounds and intersections, move, resize and rotate, align, distribute and layers, projection and inverse projection of scene points, contrast                       |
| Player                  | `packages/player/src/{index.ts,style.css,fonts.css}`, `scripts/player-fonts.mjs`, `packages/player/package.json`                                                                               | Canvas, clipping, theme through custom properties, appearance, style tokens, hidden title as accessible name; separate theme fonts with their licence                                    |
| Studio                  | `packages/editor/src/components/{LayoutEditor,LayoutPanel,ThemePanel}.tsx` (new), `Studio.tsx`, `PlayerSurface.tsx`, `ContentPanel.tsx`, `commands/index.ts`, `store/index.ts`, `style.css`    | Layout mode, gestures, arrows, numeric fields, align and distribute, grid, layers, reading order, conversions, appearance, style, theme, diagnostics                                     |
| Example                 | `examples/layout-canvas/{project.json,layout-canvas.spatialdeck,assets/skyline.svg,LICENSE.md}`, `apps/playground/{layout.ts,main.ts,vite.config.ts}`, `apps/studio/{main.tsx,vite.config.ts}` | Phase example, `/layout` route that opens projects saved by Studio, font imports                                                                                                         |
| Tests                   | `packages/core/test/{layout,frame}.test.ts`, `packages/player/test/layout.test.ts`, `tests/e2e/layout.spec.ts` (new), `tests/e2e/a11y.spec.ts`, `scripts/{flow-identity.mjs,check-bundle.mjs}` | See below                                                                                                                                                                                |
| Documents               | README, AUTHORING, DEVELOPMENT, PLUGINS, PROJECT_SPEC (section 22 and the FontId row), ROADMAP (sections 12 and 15), this report and `layout-*.json`                                           | —                                                                                                                                                                                        |

Manifests moved to 0.5.0; the core exports `@spatialdeck/core/schema/1.3.0` and `schema` points to 1.3.0; the player exports `@spatialdeck/player/fonts.css`.

## Schema, migration and capability

- `validateDocument`/`migrateDocument` accept 1.0.0–1.3.0 and return a 1.3.0 copy. 1.2.0→1.3.0 adds the default theme (text `#172035`, background `#ffffff`, accent `#215baf`, backdrop `#e8edf4`, `system-sans`, body 28, title 46), `layout:"flow"` and `appearance:{variant:"card",background:null,titleVisible:true}`; blocks unchanged. A 1.4.0 version is rejected with `UNSUPPORTED_VERSION`.
- `layout` is computed by `updateCapabilities` and required only when used (canvas, `style`, an appearance or theme different from the default, compared independently of key order); migration never enables it: verified on the four historical fixtures.
- Rejected with code and pointer (`layout.test.ts`): a missing frame in canvas (`FRAME_REQUIRED`) or a frame in flow (`FRAME_IN_FLOW`), beyond width or height (`FRAME_OUTSIDE`), a negative origin, `NaN`/`Infinity` (`NON_FINITE_NUMBER`), width < 8, rotation beyond 360, a non-integer or out-of-range `z`, block, background or role colours not in the palette (`UNKNOWN_PALETTE_COLOR`), an unknown FontId, a duplicate (`DUPLICATE_ID`), empty or over-32 palette, a type scale out of range or not an integer, colours other than `#rrggbb` (uppercase, `#fff`, names, `rgb()`, `var()`, injections), any CSS string in place of a token, unexpected `style`/`className`/`css` fields, units in frames.
- The 1.0.0→1.3.0 chain without loss of texts, notes, opaque document and scene extensions, plugin data and settings; idempotent on 1.3.0; fixture bytes on disk identical before and after. Deterministic roundtrip of a canvas document.

## Shared geometry

The core functions are the only ones that compute positions: the player applies `frameMatrix` to the hosts, the editor projects handles and outlines with `projectScenePoint` and converts the pointer with `unprojectScenePoint`. Numeric tests (`frame.test.ts`): frame→scene→frame within 1e-9 on 500 deterministic random frames, corners and bounds of rotated frames, intersections with rotated near-contact, the opposite edge fixed for all eight handles on a rotated frame, stopping at the border for unrotated frames, relative and stepped rotation, align, distribute and layers, head-on projection with the 0.9 margin and a round trip within 1e-6 on rotated and nested scenes with arbitrary cameras, points on or behind the perspective plane and planes seen edge-on rejected.

## Flow rendering identity tests

[Detail](layout-identity.json). `scripts/flow-identity.mjs` compared the playground build of commit `b9ee503` (0.4.1, schema 1.2.0, a temporary worktree removed afterwards) with this tree: every node of the default path of `/core` (1.0.0), `/structure` (1.1.0) and `/content` (1.2.0) at 1440×1000, DPR 1, reduced motion.

| Engine       | Views | Identical | Different pixels (max) | Geometry  |
| ------------ | ----: | --------: | ---------------------: | --------- |
| Chromium 156 |    18 |        18 |                      0 | identical |
| Firefox 157  |    18 |        18 |                      0 | identical |
| WebKit 26.5  |    18 |        18 |                      0 | identical |

Justified threshold: zero different pixels outside `<video>`/`<audio>` elements, masked because the native spinner and the decoded frame vary between two loads of the same build (observed in the first run: differences only in the video spinner in Chromium and in the audio controls in Firefox); their boxes remain in the geometry comparison. The same guarantee is now in the suite, without a second build: the E2E test «migrated historical documents keep the 1.2.0 flow rendering tokens and markup» verifies on the three engines the 1.2.0 computed styles (padding 48, 3 px `#215baf` border, white background, `#172035` text, 28/46 px, `system-ui`, `#e8edf4` backdrop) and the absence of new classes or `style` attributes on the blocks; the player's jsdom test verifies the same DOM.

## Landmarks, clipping, layers, order and theme in the player

[Landmarks](layout-landmarks.json): corners and centre of every frame of the canvas scenes `cover` (root) and `details` (child rotated 10/−15/4, scale 0.8), with the fit camera and an oblique camera: 80 points per engine, maximum error 0.00012 px (Chromium), 0.012 px (Firefox), 0.00004 px (WebKit), threshold 1 px. The same test after saving and reopening: Studio presentation and vanilla player within 0.011 px.

On the three engines: clipping on the content wrapper (`overflow: hidden`), the spatial wrapper still `preserve-3d` without overflow, a rotated corner outside the scene not hittable and an inner one hittable; stacking by `z` (the stamp covers the image, and lowered to −1 it does not); DOM and Tab in array order with layers and positions inverted (WebKit with Option+Tab, as Safari does for buttons and links); the hidden title not visible (box ≤ 1 px), the accessible name of the `article` and the first text of the text view. With a CSP without `unsafe-inline` for styles and scripts (`style-src 'self'`) theme and tokens are applied (background `#fffaf0`, text `#1b1f3b`, title `#9a3412` at 57.2 px, backdrop `#1e293b`, accent in the border shadow) with **zero CSP violations**. Images and videos fill the frame (the image matches the host within 1 px with the block's `object-fit`; the video full width, over half the height, with the button inside the frame).

## Studio

`tests/e2e/layout.spec.ts`, on the three engines:

- **Gestures**: move, resize from the south-west corner with the north-east corner fixed, a 90° rotation with Shift: one command each; Undo restores the exact frame; Escape during the drag restores without commands or leftover drag state; arrows 1 px and Shift 10 px, one command per press; arrows on a handle and on rotation; numeric fields, an invalid value refused with an associated error; preview with the core frame matrix.
- **Align, distribute, layers, order**: align left on rotated bounds, distribution with equal gaps, Bring to front (z 5) verified with `elementsFromPoint` in the preview, a reading-order change that alters array and DOM without touching frames or z.
- **Conversions**: Convert to canvas on a flow scene, one command, block rectangles unchanged within 1.5 scene px; Switch to flow with a dialog naming the loss, Cancel in the dialog without effects, confirmation removing the frames, Undo of the commands restoring them.
- **Theme, appearance, style, diagnostics**: body font, colour role with a contrast warning in the panel and in the theme, plain variant and visible title, XS size on a block; clipped text diagnosed by reducing the height; a frame with a higher z over the link diagnosed as covering controls.
- **Saving and reopening**: numeric edits, Save JSON and Save archive, JSON identical to the model; recovery after reload with an unsaved edit; a new session reopening JSON and archive with an identical model; Studio presentation and vanilla player (**Open local project**) with identical model and landmarks.
- **Keyboard and viewports**: at 1440×900 and 768×1024 outlines aligned with the blocks within 1 px; Layout, selection, arrows, Tab to the handles with visible focus, resizing and rotating from the keyboard; Delete in the editor does not open scene deletion; Escape deselects; announcements in the live region.

The manual test in the built-in browser found a defect, fixed before the automated tests: in Layout the sticky central column exceeded the window height and the bottom of the preview could not be reached; now the map shrinks during layout. The E2E tests also led to fixing: resizing near the border that translated the frame (now the moving edge stops), a conversion measured before the preview framed the scene (now refused with a message), handles not reachable with Tab in WebKit (`tabIndex={0}` like the other Studio buttons), 18 px handles covered by later frames (axe `target-size`: now 24 px and above the frames).

## Accessibility

[axe results](layout-axe.json) (axe-core 4.14.0, WCAG 2.0/2.1/2.2 A–AA and best practices) on `/layout` with and without the text view and on Studio in Layout mode with a selection and with the Theme panel, in the three engines, in addition to the existing audits: **zero serious or critical violations**. The two moderate ones already recorded in 0.4.1 remain: `landmark-unique` (two players of the same document) and `page-has-heading-one` in Studio. A reading order independent of `z` tested with DOM, Tab and the text view; a numeric alternative to every drag; contrast diagnosed. axe is not equivalent to a screen reader test.

## Performance and bundle

[Measurements](layout-perf.json): a canvas scene with 30 blocks (5 rotated), 100 alternating move and resize gestures, 300 input→preview samples per engine, production Studio.

| Engine       | p50 ms | p95 ms | max ms | Commands per 100 gestures |
| ------------ | -----: | -----: | -----: | ------------------------: |
| Chromium 156 |    3.4 |    4.2 |    5.4 |                       100 |
| Firefox 157  |      4 |      5 |     10 |                       100 |
| WebKit 26.5  |     12 |     21 |     28 |                       100 |

The p95 budget of ≤ 100 ms is met locally in the three engines; Chromium trace in `test-results/evidence/layout/perf-trace-chromium.json` (untracked because of its size). Uncontrolled local runner: timings are informative, the test asserts the budget only without `CI`; the command count is the stable gate.

[Minimal bundle](layout-bundle.json): **64 510 B JS / 1 326 B CSS gzip** (0.4.1: 48 929 / 932), limits 102 400 / 20 480 B, React, editor, DOMPurify, marked, KaTeX and fflate absent. The JS increase comes almost entirely from the fourth standalone validator (1.3.0): with `inlineRefs: true` it would have been 68 189 B, so the generator no longer duplicates the code of references. Theme fonts measured separately: `fonts.css` 625 B gzip and four woff2 files for 53 488 B, downloaded only when used; `check:bundle` fails if an `@font-face` enters the minimal CSS.

## Font licences

Atkinson Hyperlegible, `@fontsource/atkinson-hyperlegible` **5.3.0** (released 2026-07-19, integrity in the lockfile), an exact dependency of the player: Copyright 2020 Braille Institute of America, Inc., **SIL Open Font License 1.1**, verified in the package's `LICENSE` file and in the `license: OFL-1.1` field. The font stays a separate file with its own licence alongside, not embedded in the player code; the OFL allows redistributing it together with software provided that licence and copyright are kept and it is not sold on its own. The player build copies the woff2 files and `OFL.txt` to `dist/fonts/`; no CDN and no `data:`. System fonts are not distributed. The example resources are original and dedicated under CC0 (`examples/layout-canvas/LICENSE.md`).

## Final commands

[Commands and exit codes](layout-checks.json); logs in `.tools/layout-final/`.

| Command                          | Exit | Result                                                                                                                       |
| -------------------------------- | ---: | ---------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile` |    0 | lockfile unchanged after adding the font dependency                                                                          |
| `pnpm typecheck`                 |    0 | strict TS, ES-only core, apps, tests and `@ts-expect-error` on the tokens                                                    |
| `pnpm lint`                      |    0 | ESLint and React hooks                                                                                                       |
| `pnpm format:check`              |    0 | Prettier; prompts excluded                                                                                                   |
| `pnpm test`                      |    0 | **410 passed**, 21 files, zero failed or skipped (322 from the baseline + 88 new)                                            |
| `pnpm test:coverage`             |    0 | 0.4.1 thresholds unchanged and met; core 95.54% / 90.81%, `core/src/layout` 98.26% / 91.66% ([detail](layout-coverage.json)) |
| `pnpm build`                     |    0 | core, player (with fonts), plugins, editor and two production apps                                                           |
| `pnpm check:boundaries`          |    0 | core and player isolated, optional plugins                                                                                   |
| `pnpm check:bundle`              |    0 | 64 510 / 1 326 B gzip; theme fonts separate                                                                                  |
| `pnpm test:e2e`                  |    0 | **201 passed**: 67 Chromium + 67 Firefox + 67 WebKit (162 regressions + 39 new), zero failed, skipped or flaky               |
| `git diff --check`               |    0 | whitespace                                                                                                                   |
| `git status` after the checks    |    — | no tracked file modified by the scripts                                                                                      |

The first final run found two errors, fixed and run again: a `let` to turn into `const` in the E2E spec and a historical 0.3 E2E test that used 1.3.0 as the «future version».

## Changes to existing tests

Only adjustments to the new contract, no test removed or made optional: the current-version assertions move from 1.2.0 to 1.3.0 (core and editor unit tests and the editor and structure E2E tests), the future-version tests from 1.3.0 to 1.4.0, the 1.2.0 schema test validates the original 1.2.0 fixture and the migrated copy against 1.3.0, and the expected 1.1.0 migration includes theme, `layout` and appearance. axe also covers `/layout` and Studio in Layout mode.

## Limits and debt

- Local tests on a single uncontrolled computer; the updated CI to be observed at the maintainer's first push. WebKit is the Playwright runner for macOS 14, not Safari; no tests on touch devices or with screen readers.
- The pixel test against 0.4.1 is not in the suite because it needs a second build; the suite holds the equivalent style and DOM check. Native media are excluded from the pixel comparison, not from the geometry.
- The clipped-text and covered-control diagnostics measure the Studio preview and refresh after each preview update and when fonts load; contrast depends only on the palette and does not consider images under the text.
- In canvas scenes the spatial view does not reflow at 320 px: reflow relies on the text view, as per the specification. Handles measure 24 px; on frames that are very small on screen they get close to each other, and the numeric fields remain the equivalent alternative.
- A dist consumer that does not import `@spatialdeck/player/fonts.css` shows the system stack instead of Atkinson Hyperlegible, without diagnostics.
- The minimal bundle grows by about 15.6 KB gzip for the fourth validator; it stays at 63% of the budget.
- Out of scope as per the prompt: groups, scene templates or masters, per-element animations, WYSIWYG editing, free CSS, remote fonts, 3D gizmo, advanced snapping guides.

## Handoff for 0.6

The 1.3.0 model to freeze: exports must reproduce canvas, theme and fonts with the same player, include `fonts.css` and the woff2 files with `OFL.txt` in the manifest and in the third-party notices, and test the CSP with the theme's custom properties too (CSSOM, without `unsafe-inline`). To reuse: `projectScenePoint`/`frameToScene` for landmarks and the PDF export, `scripts/flow-identity.mjs` for visual regressions, the performance test as a basis for the realistic consumer. G0 items 1–2 already decided; ownership of the npm scope must be verified in 0.6. No 0.5 item is deferred.

## Studio interface revision — 23 October 2026

After the 0.5 commit, at the maintainer's request («amateurish look, too many labelled buttons, too much space for few functions»), the Studio interface was redesigned without changing document, commands or behaviour. Before/after screenshots at 1440, 1280, 768 and 390 px in `test-results/evidence/ui/` (untracked).

- A single 48 px bar with the project title editable in place and commands as icons with descriptions (New, Open, Save, Save archive, Undo, Redo, Recovery, Preview) plus **Present**; «Open JSON» and «Open archive», which opened the same picker, are now a single **Open**.
- A scenes panel with actions as icons in the header, compact rows with the layout type, a **Create the first scene** prompt in an empty project, styled buttons instead of native file inputs and resources with a labelled status.
- A sectioned inspector with uniform headers, property grids and short visible labels contained in the full accessible name; a Layout panel with icon bars for align/distribute and layers/grid, segmented groups for text alignment, a switch for the title, a reading order with an excerpt of the content; a theme with a swatch palette.
- Single style tokens (13 px body, 28 px controls, one accent tint, field outlines at 3:1); element styles never reach the player DOM, so the preview stays identical to the presentation.

Accessible names unchanged, except for three renames updated in the tests (Italian labels at the time): «Presenta ↗» → «Presenta», «+ Nuova scena» → «Nuova scena», «Apri JSON» → «Apri» (today «Present», «New scene», «Open»). The tests found two defects, then fixed: reading-order rows and the inspector header widening the column at 1280 px, and resizing that brought the edge under the pointer instead of following its movement from the grab point (a jump of up to half a handle). Complete suite after the revision: every command exit 0, **410 unit + 201 E2E** passed (67 per engine), axe without serious or critical violations, minimal bundle unchanged (64 510 / 1 326 B gzip). Logs in `.tools/ui-final/`. Later the product name in the bar became the page's `h1`: the moderate `page-has-heading-one` violation recorded since 0.4.1 is closed and the Studio audits (empty, with content, dialog, presentation, Layout, theme) have no violations at all in the three engines; `a11y.spec.ts` and `editor.spec.ts` run again after the change: 54 passed. Only `landmark-unique` (moderate) remains in the playground with two players.
