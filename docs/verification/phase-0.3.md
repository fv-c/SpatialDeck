# SpatialDeck 0.3 Structure verification

21–22 October 2026. Local implementation completed with schema **1.1.0**, copy migration from **1.0.0**, and the standalone player and Studio shared. **187 unit + 90 E2E = 277 tests passed, zero failed or skipped.** No commit, push, tag, deploy, publish or phase 0.4.

## Baseline and scope

Initial state: only `?? prompts/`, preserved. Read the chat's AGENTS instructions, README and indexes, PROJECT_SPEC and ROADMAP, DEVELOPMENT and the 0.1/0.2 reports before the relevant sources. Baseline measured before the extensions: **119 unit and 66 E2E tests passed** on the three engines; local logs `.tools/structure-baseline-unit.log` and `structure-baseline-e2e.log`.

Main files added: `packages/core/schema/project-1.1.0.schema.json`, `document/structure.ts`, core and editor structure tests, `HierarchyTree`, `PathPanel`, `CameraTimeline`, the `examples/structure-branching/project.json` fixture and `tests/e2e/structure.spec.ts`. Extended the generator, types and validators, math, state machine and events, player, commands and store, map, preview, inspector, Studio and the vanilla demo. Updated guides, specification, roadmap, 0.3.0 manifests and lockfile; only the V8 coverage provider 5.0.5, aligned with the Vitest already pinned, was added.

The original 1.0.0 schema and fixtures, LICENSE, prompts and the historical reports and evidence are kept. The earlier E2E tests now write to `structure-regressions/`; check:bundle writes to `structure-bundle.json`, without replacing the historical report. The current schema and the historical one are exported as explicit subpaths.

## Environment and reproducible startup

[Detected environment](structure-environment.json): macOS 14.8.7 / 23J520 arm64, Apple M3 Max, 64 GiB, Node **24.22.0**, pnpm **12.14.0**, TS **6.0.3**, Vite **8.3.5**, Vitest/V8 coverage **5.0.5**. Local tools in `.tools`, no global change. Chromium and Firefox with Playwright **1.64.1**, WebKit with the macOS 14 runner **1.61.1** already present.

```sh
export PATH="$PWD/.tools/node_modules/.bin:$PATH" # only if this host needs it
pnpm install --frozen-lockfile
pnpm dev:studio
pnpm dev:playground
```

Studio normally on port 5174; the playground on the port shown by Vite, route `/structure` for the new demo and `/core` for the historical one. During this verification 5174 was already taken: a second Studio was started with `pnpm dev:studio --port 5175 --strictPort`, without stopping the existing process. Both startups were tried in real Chromium: two vanilla players, a Studio preview, a manual choice, a 1.1.0 import and scrubbing to the endpoint, zero page errors and no overflow at 1440/768/390/320 px: [dev smoke](structure-dev-smoke.json).

Open the structure fixture with **Open** in Studio too. A offers B and C, both reach D; `prev` returns along the actual branch. The return D→A and the stay D→D are manual and limited to two visits per node. B is a child of A; the scene array orders A,C,B,D. The AB track holds three keyframes and ends at a pose different from B's fit. The second path C→D is independent.

## Verified model and decisions

- `validateDocument`/`migrateDocument` return current copies; the 1.0.0 schema and semantics are checked before migrating. Null parents and empty tracks and cues are added, without renaming IDs or altering paths and extensions. The current migration is idempotent and the roundtrip deterministic; future versions are rejected without replacement. The structure capability is added only when used. Edge IDs repeated across historical paths are kept; a cue with an ambiguous reference is instead rejected.
- Hierarchy `Mparent*Mlocal`, positive uniform scale and double-precision output without global gl-matrix state. Self-parents, cycles, missing parents and chains beyond 32 scenes rejected. Reparenting preserves the world pose through inversion and decomposition, or fails before the commit if out of range. Visibility inherits from the parents; the fit uses world rotation and scale. Dragging a child works on the world XY plane while keeping Z.
- Graphs with stable nodes, edges and start, and every node reachable. Iterative SCCs find the cyclic connections, which require explicit conditions and a loopPolicy. Several eligible exits or a single manual exit produce choice-required without mutations. Limits count only completed visits in the current history; prev does not consume entries. No automatic loops and no code executed from the JSON.
- History committed only on arrival, with a visit ID and the final pose; prev returns to the recorded pose. Noops, choices and invalid input do not cancel a valid plan. Ten interruptions, AbortSignal, an interrupted prev, a path change, updateDocument, hidden and reduced motion keep the earlier invariants. An explicit self-edge produces a new visit to the same node; goTo to the current node stays a noop.
- The document camera with Euler angles (`AuthoredCameraPose`) and the runtime quaternion camera (`CameraPose`) stay distinct. Tracks are resolved as a copy with the entry set to the visual pose; linear or Catmull-Rom position, slerp and log-linear zoom, track easing applied once. Cubic extremes verified analytically, also with a replaced runtime entry. The endpoint is kept without snapping to the fit; returning goes to the recorded pose without replaying the track forwards. Turns beyond 180° need intermediate points.
- Cues ordered by `(atMs,id)`, emitted once per transition, payloads never executed. A replacement duration scales the thresholds; zero duration or reduced motion emit every cue in order. Hidden freezes active time; cancel suppresses future cues. A cue listener that destroys the player or starts an inspection produces no recursion or phantom commit. Scrubbing uses only the sampler and setCamera, without cue events or new visits.
- setView and setCamera interrupt the transition and add no visits; the overview considers visible world bounds. Pan, zoom and view are temporary. The DFS outline exposes every reachable node once, alternatives included, avoiding infinite loops. Labelled public choices, focus on the title after a choice and keyboard navigation verified.
- Studio manages paths, start, visits, connections, labels and conditions, parents through a select and the tree, node camera, duration and easing, tracks and keyframes and JSON cues. The loop button sets max 3 and manual conditions in a single command. The selection preview uses the node camera or the fit, even for scenes outside any path; scrubbing instead inspects the edge plan. No second renderer, sampler or React clock.
- For a canonical main path without conditions, tracks or cues the automatic linear insertion remains; in graphs new scenes are standalone. Deletions show the concrete impact, including nodes that became unreachable and children reparented preserving the world pose. Confirmation and application as a single command; undo restores every reference. Unchanged snapshots do not notify subscribers. JSON, download and IndexedDB hold the new data without UI state; the history and autosave budgets stay as before.

## Final commands

[Outcomes and inventory](structure-checks.json), [individual browser tests and runner versions](structure-e2e-results.json), [core coverage](structure-coverage.json). Run logs under `.tools/structure-final-*.log`; browser reports and traces and the HTML coverage under `test-results/`.

| Command                                                                        |    Exit | Result                                                                   |
| ------------------------------------------------------------------------------ | ------: | ------------------------------------------------------------------------ |
| `pnpm install --frozen-lockfile`                                               |       0 | 7 workspaces, strict peers, lockfile unchanged on reinstall              |
| `pnpm typecheck`                                                               |       0 | ES-only core, player, editor, app and tests                              |
| `pnpm lint`                                                                    |       0 | ESLint and React hooks                                                   |
| `pnpm format:check`                                                            |       0 | Relevant application and documentation files; prompts preserved          |
| `pnpm test`                                                                    |       0 | **187 passed, 0 failed or skipped**, 9 files                             |
| `pnpm test:coverage`                                                           |       0 | **94.71% statements / 89.42% branches** core                             |
| `pnpm build`                                                                   |       0 | Core, player and editor ESM + declarations, two production apps          |
| `pnpm test:e2e`                                                                |       0 | **90 passed, 0 failed or skipped**: 30 Chromium + 30 Firefox + 30 WebKit |
| `pnpm check:boundaries`                                                        |       0 | Core and player isolated, React only in editor and app                   |
| `pnpm check:bundle`                                                            |       0 | **32 201 B JS / 815 B CSS gzip**; limits 102 400 / 20 480 B              |
| `pnpm dev:studio --port 5175 --strictPort`, `pnpm dev:playground --strictPort` | 0 start | Two real browser smoke tests, zero page errors                           |
| `git diff --check`                                                             |       0 | Whitespace of the tracked files                                          |

68 new unit tests plus 119 regressions; 24 new E2E tests plus 66 regressions. Coverage measures the executable TypeScript core sources, excluding types and declarations and the generated Ajv validator; the latter is verified by the behavioural schema tests. Automatic gates 85% statements / 80% branches. Build and browsers need no backend.

## Visual evidence and roundtrip

Real Chromium artefacts opened and inspected: [nested scene in the vanilla player](structure-nested.png), [Studio](structure-studio.png), [track endpoint in the preview](structure-track.png), [working timeline](structure-timeline.png). Map and preview stay visible on desktop while scrolling the long timeline. Readable texts and fields and distinct controls; a track may deliberately frame inactive scenes partially or use a scale different from the fit. No universal visibility during 3D motion is claimed. The inspector warns about points on or behind the perspective plane, and the text view remains.

[Camera and world landmarks](structure-landmarks.json): three points of the child scene B, the DOM projection compared with the core matrices and perspective within **1 CSS px** on the three engines. The unit tests separately verify non-commutative transforms on three levels and reparenting with an error **<=1e-6** on the matrices; gimbal lock and inversion too. The reparent E2E compares the actual landmarks before and after and uses undo.

[Actually downloaded JSON](structure-roundtrip.json): a new path built from the Studio controls, an alternative connection, saving, reading the download, opening it in a new browser context and a full comparison of the 1.1.0 model. Separate E2E tests create a node camera, a track and cues from the UI, enable and close a loop, check the impact preview, cancel, deletion and undo, import 1.0.0 and reject 1.2.0 leaving the work intact. Reload and IndexedDB recovery keep the full structure. The quota, conflict, teardown and keyboard regressions stay active; no skips to work around problems.

Defects found and fixed during QA: a preview that redid the fit after a track arrival pose during reparenting; numeric confirmations without changes that notified the store and reset the preview; the page centre stretched by the timeline; an inconsistency between the chosen node and the inspector; a ResizeObserver observing the stage modified by its own callback during resize; re-entrancy from a cue listener; perspective warnings and world camera ranges. The failed attempts are diagnostic; the counts refer to the last complete successful suite.

## Gates, limits and 0.4 handoff

Every mandatory local 0.3 gate is verified. No Linux CI was started for 0.3: the earlier remote evidence remains only for phase 0.1. Playwright WebKit 1.61.1 on macOS 14 is equivalent neither to real Safari nor to current WebKit on Linux. Installed Safari, Chrome and Edge, screen readers, touch hardware, heap after GC and controlled p95 benchmarks remain not run, as planned for the pre-1.0 checks.

The XY map, the Euler inspector and the list timeline are minimal working authoring tools; no gizmo, orbit or complex graph layout. The camera comparison is geometric, not an accessibility or performance certification. Browser cues do not guarantee audio sync. The outline and numeric selection stay alternatives to motion. Browser recovery is not a backup.

For 0.4, preserve the 1.0.0 and 1.1.0 schemas and fixtures, these regressions, the JSON and history limits and the core/player/editor separation. Introduce schema 1.2.0 and blocks, media and plugins, with their own migration and policy, only in the next phase. No dependency or implementation of later content, export or import has been anticipated.
