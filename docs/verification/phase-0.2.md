# SpatialDeck 0.2 Editor verification

21 October 2026. Studio 0.2 implemented, document **schema 1.0.0 unchanged**. Local verification on macOS 14; remote CI for phase 0.2 has not been run. No commit, push, deploy, tag or publish.

## Baseline and scope

Initial reading: the AGENTS instructions provided in the chat, README, PROJECT_SPEC, ROADMAP, DEVELOPMENT, the 0.1 report, manifests and the public core/player APIs before their sources. Initial Git state: only `?? prompts/`, preserved. The previous engine was genuinely usable: **85 unit and 30 E2E tests passed, zero failed or skipped**, before modifying the player. Local logs in `.tools/baseline-unit.log` and `.tools/baseline-e2e.log`.

Added `packages/editor` and `apps/studio`, the `examples/editor-roundtrip/project.json` fixture, store, storage and update unit tests, the editor browser suite and the author guide. Extended the APIs, events, core navigation and player for updateDocument; updated manifests, lockfile, TS and React lint, build, boundaries and E2E servers. README, DEVELOPMENT, PROJECT_SPEC and ROADMAP describe the actual decisions. LICENSE, schema, historical fixture, prompts and the vanilla implementation preserved.

Graphs, parents, timeline, plugins and media, CLI and export, cloud features and phase 0.3 were not implemented.

## Environment and startup

Same environment as phase 0.1: macOS 14.8.7 arm64, Apple M3 Max, Node **24.22.0** and pnpm **12.14.0** under `.tools`, without changing global tools. React/React DOM **19.3.1**, types **19.3.0**, plugin-react **6.1.2**, hooks lint **7.1.1** verified from the registry and installed with strict peers; the previous stack is kept. [Metadata of this phase](editor-environment.json).

```sh
export PATH="$PWD/.tools/node_modules/.bin:$PATH" # if needed on this machine
pnpm install --frozen-lockfile
pnpm dev:studio
# Another terminal, vanilla demo:
pnpm dev:playground
```

Studio: `http://127.0.0.1:5174`; playground: `/core` on the port printed by Vite. Both real startups were verified in a browser: a Studio preview and two vanilla players, zero page errors; inspector Z=125 reaches the camera. Vite resolves the core and player sources directly, without prior dists: [dev evidence](editor-dev-smoke.json). No backend, account or remote resource is required by the demo.

Workflow: create three scenes, select and drag or use coordinates, rotations, scale and size, edit text and notes, use Undo and Redo, download with Save JSON. Open the file in a separate session and present; Escape returns to the editor. [Author guide](../AUTHORING.md).

## Implemented decisions

- Store separate from the session, validated and frozen snapshots. Before/after commands; at most 100 commands or 20 MiB of UTF-8, evicting the oldest until both limits are met. A command that alone exceeds the budget is applied but not kept in the history. An edit after undo discards redo; no history in the JSON.
- Live drag with one command on pointerup; Escape and pointercancel restore. The SVG XY map uses the core `sceneMatrix`, while pan and zoom stay UI. The preview updates at most once per rAF; a burst of 30 edits is verified to produce a single documentchange. No React renderer for scenes.
- The player validates updateDocument before any change, cancels the pending transition without visiting the destination, keeps node and path when they exist, otherwise selects the start or empty, and rebuilds camera and history. DOM, listeners and observers belong to the same instance; update does not remount the player and does not steal focus. documentchange is emitted only after the update.
- Create and duplicate assign new IDs to the scene, its blocks and nodes; the main path follows the scene order. Delete stitches the neighbours with defaultTransition; undo restores the original IDs and transitions. Other referencing paths: deletion refused with names and counts. Imported main path with a different order or repeated visits: structural edits refused, while opening and content and transform edits are kept.
- File input and Blob download; the candidate is validated before replacing, a cancellable dirty dialog and focus restored. Save also includes the draft currently focused. Opaque extensions, notes and arrays preserved, no UI fields or migration.
- Real IndexedDB: `documents` and `recovery` in the same transaction; the expected revision compared before writing; the last ten revisions per projectId. Autosave at 750 ms, a serial queue and no writes of identical snapshots. Recovery is offered, with explicit selection of the revisions. Quota, denied storage and conflicts leave memory and download available. Best-effort flush on visibilitychange; no promise on unload and never described as a backup.
- Collapsible panels, labelled controls and associated errors, coordinates as an alternative to dragging, Tab/Shift+Tab and keyboard-activatable buttons. Focus is handled when undo or redo disables the active control. Presentation with a separate instance of the same player, the model intact on return and reduced motion respected. Layout verified at 1440×1000, 768×900, 390×900 and 320×900.

## Final commands

All run with the local PATH; outcomes refer to the last successful run, without adding diagnostic repetitions. [Commands, exit codes and file inventory](editor-checks.json).

| Command                                  |    Exit | Result                                                                         |
| ---------------------------------------- | ------: | ------------------------------------------------------------------------------ |
| `pnpm install --frozen-lockfile`         |       0 | 7 workspaces, strict lockfile and peers                                        |
| `pnpm typecheck`                         |       0 | Core, player, editor, app, tests and configurations                            |
| `pnpm lint`                              |       0 | ESLint and React hooks rules                                                   |
| `pnpm format:check`                      |       0 | Relevant files formatted, prompts preserved                                    |
| `pnpm test`                              |       0 | **119 passed, 0 failed, 0 skipped**, 7 files                                   |
| `pnpm build`                             |       0 | Core, player and editor ESM and declarations, production playground and Studio |
| `pnpm test:e2e`                          |       0 | **66 passed, 0 failed, 0 skipped**: 22 Chromium + 22 Firefox + 22 WebKit       |
| `pnpm check:boundaries`                  |       0 | Core and player without React or editor; React as editor peer                  |
| `pnpm check:bundle`                      |       0 | **18 180 B JS / 662 B CSS gzip**, limits 102 400 / 20 480 B                    |
| `pnpm dev:studio`, `pnpm dev:playground` | 0 start | Real browser smoke test linked above                                           |
| `git diff --check`                       |       0 | Whitespace of the tracked files                                                |

Total: **185 tests** (119 unit + 66 E2E), zero failed or skipped. The 119 unit tests include all 85 previous ones and 34 new ones. The 66 E2E tests include 30 core/player regressions and 36 editor tests, with no copies or skips between runners. Chromium and Firefox: Playwright 1.64.1. WebKit macOS 14: compatibility runner 1.61.1, already authorized in the previous phase. [Detailed outcomes per test](editor-e2e-results.json); local traces and reports under `test-results/` and logs `.tools/final-*.log`, `.tools/editor-e2e.log`.

## Roundtrip, storage and inspected artefacts

The test creates three scenes from the UI, drags a scene and checks for a single command, edits XYZ, three Euler angles, scale and size, tries undo and redo, adds literal text and notes. The file is actually downloaded, read and compared with the document, the original page is closed and the file is opened in a new browser context. The reopened model is identical. The camera matches the core resolveSceneCamera; three landmarks are measured in the DOM before and after and in the presentation player within 1 CSS px, normalized for contain. No comparison relies on images alone.

- [Actually downloaded JSON](editor-roundtrip-saved.json)
- [Measured poses and landmarks](editor-roundtrip-evidence.json)
- [Desktop](editor-desktop.png), [mobile](editor-mobile.png), [recovery offer](editor-recovery.png)
- [Real revisions and stale conflict](editor-storage-evidence.json)

The images were opened and inspected: toolbar, scenes and inspector readable, selection visible, map and preview consistent, the preview target entirely contained; at 390 px the panels stack and the scenes scroll. No horizontal page overflow in the three reduced viewports. The renderings do not replace the numeric checks.

Normal storage tested on the IndexedDB of every browser, including reload and the recovery choice. A quota error is injected into the recovery put during a real transaction: the previous head write is rolled back and a single revision remains. Denied access is injected separately. Two real pages share the same database: one writer overtakes the other's revision, which receives a warning while keeping content and download. The last ten revisions and the refusal of a stale writer verified.

Defects fixed during QA: revision incremented by recovery alone, field labels altered by the error message, preview clipping caused by an inherited min-height, text commit on the last Tab in Firefox, buttons not tabbable with macOS/WebKit settings, focus loss when redo became disabled and focus return after the file picker. The first failed attempts are diagnostic; the final result refers to the fixed code. Tab and Shift+Tab are both used in the keyboard workflow, with no pointer or programmatic focus calls in the test.

## Gates and limits

Every mandatory local 0.2 gate is verified. Outside the test: installed Safari, Chrome and Edge, physical touch devices, screen readers, heap after GC and controlled p95 benchmarks: these are stabilization checks, not claimed compatibility or performance. The earlier Linux CI remains evidence for 0.1 only; no remote 0.2 run is claimed.

Explicit debt: an orthographic XY map with depth through the inspector, no 3D gizmo; no advanced file system picker, collaborative sync or guaranteed browser persistence. The history has a real budget and may evict commands. For 0.3, keep the 1.0.0 fixtures and schema and these regressions, and only then introduce schema 1.1.0, migration and impact previews for structures and graphs. No later phase started.
