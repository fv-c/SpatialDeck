# SpatialDeck 0.1 Core verification

Date: 21 October 2026. 0.1 code implemented; **local WebKit unblocked with the dedicated 1.61.1 runner for macOS 14**. The complete suite passes on all three engines without skips. The main runner and Linux CI keep Playwright 1.64.1; [remote CI passed](https://github.com/fv-c/SpatialDeck/actions/runs/39596586324) with 85 unit and 30 E2E tests, zero skipped. Real Safari was not run. No 0.2 phase started.

## Initial state and scope

Initial checkout: LICENSE, PROJECT_SPEC and ROADMAP tracked; `prompts/` already present and untracked. No application sources. No AGENTS file on disk in the applicable paths; the AGENTS instructions provided in the chat were applied. Specification and roadmap read before the sources; LICENSE and prompts preserved. Every path proposed for 0.1 is now real. Additive differences: the `player/src/browser.ts` entry point to collect CSS at build time without CSS imports in the public declarations; generators and checks in the `scripts` directory; reproducible tests and artefacts under `docs/verification`.

Implemented the core, player and playground application packages and only the private tooling workspace `tools/webkit-macos14`. No editor or React, parents, graphs or timeline, blocks beyond text, concrete media or plugins, CLI, import or export, or remote services. Private manifests: GPL-only/or-later SPDX not invented from the licence text alone. Commit and push later authorized and performed on commit `07916cc`; no tag, deploy or publish.

## Reproducible environment

Apple M3 Max, 16 logical CPUs, 64 GiB RAM, macOS 14.8.7 (Darwin 23.6.0), arm64. Local Node 24.22.0, pnpm 12.14.0. The machine initially exposed Node 25.8.1 and pnpm 11.25.0: the pins were installed in the ignored `.tools` directory, without changing global installations.

[environment.json](environment.json) records every pin, engines and peers from the npm registry (HTTP 200), the SHA256 hash of the lockfile and the actual browser versions. The main pin 1.64.1 is unchanged; only the authorized 1.61.1 exception for WebKit on macOS 14 is added, with a dedicated workspace and lockfile entry. No forced peers. The JSON also keeps the hash of the initial lockfile. pnpm recorded only the `vite@8.3.5` release-age exception. The frozen installation succeeded.

Actual browsers: Chromium 156.0.8078.4 and Firefox 157.0 with runner 1.64.1; WebKit reports 26.5 with runner 1.61.1. The earlier WebKit value 27.2 came from the metadata of runner 1.64.1, which never reached newPage: it was not a runtime test. The `compatibility` field of [environment.json](environment.json) records the runner, the reported version, the user agent, the hash of the shared suite and 10 passed/0 failed/0 skipped.

The `Unknown setting: PushAPIEnabled` problem is documented in [Playwright issue #42964](https://github.com/microsoft/playwright/issues/42964). The approved configuration keeps 1.64.1 for the product and Linux CI, using 1.61.1 only for the frozen WebKit of macOS 14. The first installation needed CDN fallbacks because of DNS errors on the Microsoft mirror; the installation now selected by the launcher passes with the browsers present. The historical log and the resolution are in [webkit-blocker.txt](webkit-blocker.txt).

## Installation, startup and API

```sh
npm install --prefix .tools --no-package-lock --no-save node@24.22.0 pnpm@12.14.0
export PATH="$PWD/.tools/node_modules/.bin:$PATH"
pnpm install --frozen-lockfile
pnpm browsers:install
pnpm dev:playground
```

Open `/core`. Vanilla Vite startup verified; the first browser suite ran on the dev server. The final suites start `vite preview` on the production build. The base consumer needs no external network at runtime; also tested with a CSP without unsafe-eval.

The [README](../../README.md) and [DEVELOPMENT](../DEVELOPMENT.md) document vanilla usage, public CSS, Result/NavigationResult, options, events, clock, lifecycle and boundaries. `pnpm test:e2e` includes the build before the browsers. `pnpm browsers:install` installs the browsers from the runner suited to the system, without depending on the temporary test under `.tools`.

## Dedicated runner and Linux CI

- Root: `@playwright/test@1.64.1`, configuration `playwright.config.ts`.
- Compatibility: `tools/webkit-macos14/package.json` pins `@playwright/test@1.61.1`, with a dedicated WebKit configuration. The command refuses systems other than macOS 14.
- Single suite: `tests/e2e/core.spec.ts` loads test and expect through the adapter that checks the selected pin; no copied tests, no skips.
- `pnpm test:e2e` on this Mac runs Chromium and Firefox with 1.64.1 and WebKit with 1.61.1. `pnpm test:e2e:webkit:macos14` runs only the 10 WebKit tests; `--project=webkit` is also available on the general command.
- On Linux the launcher picks only 1.64.1 for Chromium, Firefox and WebKit. The workflow installs all three and starts `pnpm test:e2e`; 12 routing tests also verify this choice; the following remote run confirmed 30 E2E passed on Linux.
- JSON and traces isolated in `test-results/current/` and `test-results/webkit-macos14/`; the summary of each invocation in `test-results/e2e-summary.json`. The last dedicated command may overwrite the local summary, while the permanent evidence below keeps the previous complete suite.

The application baseline and the core/player bundle are unchanged; the local screenshots are kept. No production dependencies or global installations were changed.

## Final commands and outcomes

The commands were run with the local PATH shown above. The current outcomes do not count the skips of the historical attempt as passed tests.

| Command                                                               | Exit | Evidence                                                                                         |
| --------------------------------------------------------------------- | ---: | ------------------------------------------------------------------------------------------------ |
| `pnpm install`                                                        |    0 | 5 workspaces; new 1.61.1 runner pinned in the lockfile, strict peers                             |
| `pnpm install --frozen-lockfile`                                      |    0 | No lockfile change after installation                                                            |
| `pnpm typecheck`                                                      |    0 | Also includes the configurations and adapters of both runners                                    |
| `pnpm lint`                                                           |    0 | ESLint 10 + typescript-eslint                                                                    |
| `pnpm format:check`                                                   |    0 | New files formatted; prompts and historical normative documents excluded from automatic rewrites |
| `pnpm test`                                                           |    0 | **85 passed, 0 failed, 0 skipped**: 73 core + 12 runner routing, 4 Vitest files                  |
| `pnpm build`                                                          |    0 | ESM, declarations and production playground; also run by both E2E commands                       |
| `pnpm check:boundaries`                                               |    0 | 2 runtime packages; tooling excluded from the product                                            |
| `pnpm check:bundle`                                                   |    0 | JS and CSS identical to the previous measurement                                                 |
| `pnpm browsers:install`                                               |    0 | On macOS 14 selects Chromium/Firefox 1.64.1 and WebKit 1.61.1                                    |
| `pnpm exec playwright --version`                                      |    0 | Root runner 1.64.1                                                                               |
| `pnpm --filter @spatialdeck/webkit-macos14 exec playwright --version` |    0 | Isolated runner 1.61.1                                                                           |
| `pnpm test:e2e`                                                       |    0 | **30 passed, 0 failed, 0 skipped**: Chromium 10 + Firefox 10 (1.64.1), WebKit 10 (1.61.1)        |
| `pnpm test:e2e:webkit:macos14`                                        |    0 | **10 passed, 0 failed, 0 skipped**; a targeted repetition, not added to the total                |
| `git diff --check`                                                    |    0 | Whitespace of the modified tracked files                                                         |

Current total: **115 tests passed**, zero failed or skipped (85 unit + 30 E2E). [e2e-results.json](e2e-results.json) keeps the outcome, version and profile of every test of the complete suite. The earlier measurements of 93 passed/10 skipped and the first WebKit failure are historical; the dedicated runner now also demonstrates the 10 WebKit tests on the real product.

## Remote Linux verification after commit and push

Implementation published on `origin/main` with commit `07916ccaf27cf7e6d210ac5d1f4ef8cc8d1e2901`. The [Core workflow, run 39596586324](https://github.com/fv-c/SpatialDeck/actions/runs/39596586324) completed with **success** on Ubuntu 26.04.1, Node 24.22.0, pnpm 12.14.0 and Playwright **1.64.1**.

Every step passed: frozen install, typecheck, lint, format, 85 unit tests, build, boundaries and bundle, installation of the three browsers and the production E2E suite. Browser result: **Chromium 10/10, Firefox 10/10, WebKit 10/10; zero failed, skipped or flaky**. The summary downloaded from the artefact confirms `platform: linux`, a single `current` profile, version `1.64.1` and three projects. The 85 unit plus 30 E2E tests make **115 tests passed in CI**, distinct from the 115 local passes.

Permanent evidence: [ci-linux.json](ci-linux.json), with SHA, run, job and artefact IDs, the archive digest, the original summary and every E2E test. The `verification` artefact was downloaded through the GitHub connector and checked; it is not inferred from the green badge alone. The local reports in `e2e-results.json` stay separate. The Linux bundle matches the local one: 17 823 bytes of JS and 662 bytes of CSS gzip.

The local hook `.git/hooks/pre-commit` keeps `prompts/` out of commits and visible in the checkout: the six local prompts stayed intact and unpublished. `.tools`, dependencies and build output stay ignored. The following documentation commit records this verification of implementation `07916cc`; it does not change the code already tested.

Errors found and fixed before the final result: ES-only declarations of the standard APIs in the core; lint of the asset character check; CSS imports in the public declarations; CSS measurement of the minimal consumer; re-entrant cancellation from a handler; focus when moving between two titles and while editing an input. The first WebKit attempt had been interrupted (130) after three identical errors; the provisional skip is now removed. The type of the `args` parameter in the new JS helper was also fixed during the typecheck, before the final outcomes. The dedicated runner resolves the local block without modifying Playwright or the application tests.

## Demonstrated features

The normative 2020-12 schema is materialized, with schema and types derived from a single source. Malformed JSON, future versions, unsupported capabilities and fields, duplicate IDs, missing references, invisible targets, branching, cycles and disconnections, invalid scales and non-finite numbers are rejected without mutations. Byte and depth limits and safe assets verified, including repeated percent encoding, backslashes, traversal, the cumulative total, accessors and non-JSON input. Deterministic serializer and roundtrip of opaque extensions. Empty documents and paths and the absence of a default are valid.

Geometry: column-major columns, CSS pixels, X right, Y down, Z towards the viewer, central pivot, `M=T*Rz*Ry*Rx*S`; the camera is a reference plane `V=S(zoom)*inverse(C)`. Perspective applied once in the viewport; outer contain. Fit `0.9 * min(vw/w,vh/h)/scale`. Rotation through a normalized quaternion, short-arc slerp including q/-q, zoom in log space, smoothstep easing applied once. Identity, translation, three-axis, scale, order and inversion matrices have independent expectations. The browser projection of three landmarks per scene is verified within 1 CSS px on all three local engines, with both declared runners.

Latest-wins navigation, ten rapid requests, abort, invalid commands and non-destructive noops, valid, empty and missing setPath, path changes and prev on the actual history. Commit only on arrival, no phantom history, Promises and events exactly once, zero duration and event order. Hidden time frozen with a controlled clock; the prefers-reduced-motion change also verified in browsers. Throwing handlers do not interrupt the player; re-entrant callbacks leave no pending Promises.

Two independent instances, local keyboard, text fields and focus verified. Focus is not stolen by mount or while typing. Ordered, readable outline, immediate navigation, duplicated spatial content excluded from accessibility; working fallback without CSS 3D. Hostile text rendered literally, no HTML element executed. CSP without unsafe-eval and no mandatory remote request.

Instrumented teardown in each available browser: **50 mount/destroy cycles, 50 pending cancelled, 50 destroy events; 0 owned listeners, 0 rAF, 0 ResizeObserver left over**. Repeated destroy and later commands do not recreate resources; host nodes and pre-existing tabindex preserved. No Blob URL or media is created by this phase.

## Inspected screenshots

Real Chromium screenshots of the production build with the Desktop Chrome preset (1280×720 viewport), cropped to the first player. Visual inspection done: centred scenes, borders within the viewport, readable text and no clipping of the target content; outline without overlaps. Inactive scenes may stay visible at the edges of space (in the conclusion), consistently with spatial rendering; they stay inert and aria-hidden. Captures at the extremes do not replace the numeric and interruption tests.

- [Introduction](scene-intro.png)
- [Detail](scene-detail.png)
- [Conclusion](scene-end.png)
- [Outline](outline.png)

## Bundle

[Reproducible measurement](bundle.json), gzip level 9, a minimal `createPlayer` consumer and the public CSS from the dist artefacts: **17 823 bytes of JS (17.41 KiB)** and **662 bytes of CSS (0.65 KiB)**; gates 102 400 / 20 480 bytes. It includes the core reachable from the player, the standalone validator and the math helpers. It excludes demos, JSON, tests, editor and plugins and the Ajv compiler sources. Boundaries and output scan detect no React or editor, eval or new Function. The uncompressed JS weights of the individual libraries are not the consumer's gzip gate.

## Gates and open limits

| 0.1 criterion                                         | Status                                                                                |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Installation, strict, lint, format, build, initial CI | Verified locally and in the Linux run linked above                                    |
| Schema 1.0.0, semantics, diagnostics, roundtrip       | Verified                                                                              |
| Three vanilla scenes, API, keyboard and two instances | Demonstrated on Chromium/Firefox 1.64.1 and WebKit 1.61.1                             |
| History, cancel, clock, reduced motion, events        | Verified                                                                              |
| Destroy, outline, focus                               | Verified on the three local engines; 50 cycles and zero leftover resources per engine |
| Core+player budget and boundaries                     | Verified; bundle unchanged                                                            |
| WebKit macOS 14 runner                                | **10 passed, no skips**, isolated and reproducible 1.61.1 pin                         |
| Runner selection and CI pin                           | 12 unit tests passed; Linux picks only 1.64.1 for the three browsers                  |
| Linux E2E with 1.64.1                                 | **30 passed (10 per engine), zero skipped**, remote run verified                      |

Not run: installed Safari, Chrome or Edge, physical mobile devices or screen readers: no compatibility or certification claimed; extended checks planned before 1.0. Heap after GC and 100-scene/p95 benchmarks not measured; the teardown demonstrates resource counters, not a heap profile or guaranteed FPS. Space is numerically bounded by the specification.

The local macOS 14 verification and the Linux matrix of the current runner passed. Real Safari tests and the stabilization checks already listed remain. For 0.2, keep the 1.0.0 schema and fixtures, add an atomic updateDocument to the shared player and verify the regressions before the UI; no 0.2 work was done here.
