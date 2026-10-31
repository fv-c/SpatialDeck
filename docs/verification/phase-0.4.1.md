# SpatialDeck 0.4.1 Consolidation verification

22 October 2026. Schema **1.2.0** unchanged, fixtures and historical reports unchanged. **322 unit + 162 E2E = 484 tests passed**, zero failed or skipped in the last complete suite. No commit, push, deploy, publish or tag; 0.5 Layout has not started and no G0 decision has been taken.

## Baseline and scope

Initial state: only `?? prompts/`, preserved and not added to the index. Read README, PROJECT_SPEC (sections 5, 6, 7, 10, 12, 19), ROADMAP (4, 5, 12), DEVELOPMENT, AUTHORING, PLUGINS and the 0.1–0.4 reports before the sources. No AGENTS file on disk: the chat and phase prompt instructions apply.

0.4 baseline measured before changing code: `pnpm test` **233 passed**, `pnpm test:e2e` **120 passed** (80 Chromium/Firefox with Playwright 1.64.1, 40 WebKit with the macOS 14 runner 1.61.1). Logs `.tools/consolidation-baseline-unit.log` and `.tools/consolidation-baseline-e2e.log`. The same run rewrote 12 tracked files in `docs/verification/` (the «checks that modify tracked files» defect reproduced; diffstat in `.tools/consolidation-baseline-tracked-writes.txt`); those files, intact before the test, were restored to HEAD.

Red tests on the unchanged 0.4 code: 39 failed unit tests plus the SHA-256 suite that could not be imported (`.tools/consolidation-red-unit.log`) and 11 of 14 new E2E tests failing in Chromium (`.tools/consolidation-red-e2e.log`). The 3 playground axe E2E tests already passed; the Studio one failed because of insufficient contrast of the selected scene's number, now fixed.

## Environment and startup

[Environment](consolidation-environment.json): macOS 14.8.7 / Darwin 23.6.0 arm64, Apple M3 Max, 64 GiB; Node **24.22.0** and pnpm **12.14.0** from `.tools` (global Node 25.8.1). Chromium **156.0.8078.4** and Firefox **157.0** with Playwright 1.64.1; WebKit **26.5** with runner 1.61.1. Local tests: CI was not run because nothing was sent to the remote.

```sh
export PATH="$PWD/.tools/node_modules/.bin:$PATH" # only if the global Node/pnpm do not match
pnpm install --frozen-lockfile
pnpm dev:studio
pnpm dev:playground
```

Production Studio: `pnpm build` and then `pnpm --filter @spatialdeck/studio exec vite preview`; `window.studio` exists only with `?studio-debug` in the URL.

## ROADMAP section 12 defects reproduced and fixed

| 0.4.1 gap                                                                                                                         | Red test on 0.4                                                                                                                                                                    | Fix                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SVG with a prologue, comment or DOCTYPE rejected; UTF-8 text truncated at byte 4096                                               | `signatures.test.ts` (BOM, prologue, comments, PI, DOCTYPE with an internal subset; 2–4 byte characters straddling byte 4096 in VTT, SVG and text)                                 | Prologue skipped without interpreting DTD or entities; UTF-8 decoded entirely in streaming; non-SVG after a comment, invalid UTF-8, wrong MIME types and binary signatures still rejected          |
| Digest dependent on `crypto.subtle`                                                                                               | `signatures.test.ts` without `crypto.subtle`; E2E on `gallery/studio.spatialdeck.test` over HTTP (`isSecureContext=false`), gallery, archive and Studio                            | Local FIPS 180-4 SHA-256 (`sha256.test.ts`: NIST vectors, one million «a», comparison with `crypto.subtle` and `node:crypto` on every chunk boundary); `randomId()` instead of `crypto.randomUUID` |
| Preview rebuilding every renderer and recomputing digests; autosave recomputing and rewriting assets                              | `player.test.ts` (mount, resolve and release counters; equivalence with a full mount); E2E with a 50 MiB video; `recovery.test.ts` (no read, digest or `put` for unchanged assets) | Incremental `updateDocument`, verification and digests memoized per Blob, asset keys from the declared or memoized digest, only new bytes written                                                  |
| Hard-coded player texts, missing `lang`, outline with source                                                                      | `player.test.ts`, `renderers.test.ts`, E2E with English texts                                                                                                                      | `PlayerOptions.messages` for the player and builtin renderers, `lang` from `metadata.language`, outline with derived text                                                                          |
| Production CSP with `ws:`; `window.studio` in production                                                                          | E2E on the Studio dist                                                                                                                                                             | `connect-src 'self'`; `ws:` only in the dev server; `window.studio` only in dev or with `?studio-debug`                                                                                            |
| Store serializing and freezing everything on every publication; one undo per keystroke; render walking every block on every frame | `store.test.ts` (spies on `JSON.stringify`/`Object.freeze` for selection and pan, text sessions); `player.test.ts` (MutationObserver over 10 frames)                               | Shallow publication, dirty by identity, `coalesce`/`endCoalesce`; per-frame render of the camera only                                                                                              |
| IndexedDB: `versionchange`/`blocked`, projects not deletable, recovery at every start                                             | `recovery.test.ts` with fake-indexeddb; E2E with a second v40 tab, a 0.4 tab blocking the upgrade, deletion with confirmation, recovery after saving                               | DB v3 with the `assetKeys` index, persistent warnings and reopening, `deleteRevision`/`deleteProject`, `markSaved` and `pendingRecovery`                                                           |
| Single limit message; `playsinline` missing                                                                                       | E2E and `storage.test.ts`; `renderers.test.ts`                                                                                                                                     | Distinct messages for JSON 10 MiB / archive 220 MiB; `playsinline` on videos                                                                                                                       |
| `check:bundle` on a tracked file; Actions not pinned; no axe or extended coverage                                                 | Baseline diffstat                                                                                                                                                                  | Report in `test-results/`, E2E evidence in `test-results/evidence/`, Actions by SHA, `a11y.spec.ts`, coverage per area and `git diff --exit-code` in CI                                            |
| Outdated documentation                                                                                                            | —                                                                                                                                                                                  | README, DEVELOPMENT, AUTHORING, PLUGINS, ROADMAP sections 12–13 and PROJECT_SPEC section 20 updated                                                                                                |

During implementation the historical E2E test «missing assets recover manually» revealed a regression in the first incremental version: a file linked after opening was not resolved again because the Studio resolver did not expose `revision`. Fixed in two ways, both covered: the player retries the blocks whose asset had not resolved, and Studio and the playground forward `revision`.

## Measurements before and after

[Full data](consolidation-perf.json). Production Studio, three scenes, a 50 MiB MP4 video (gallery plus `free` padding boxes), a 1.6 MiB SVG and a small SVG; 100 X edits in the inspector (fill + Enter) and 100 drag steps on the map. Latency = `performance.now()` at delivery of the input event → the preview's `documentchange`. «Before» = the 0.4 commit `b0a2acd` built in a temporary worktree with the same test; «after» = this tree. Uncontrolled local runner: timings are **informative**; the counters are the stable gate.

| Browser      | Inspector p50 / p95 / max ms (before → after) | Drag p50 / p95 / max ms (before → after) | Digests and Blob URLs in 200 edits | Video preserved |
| ------------ | --------------------------------------------- | ---------------------------------------- | ---------------------------------- | --------------- |
| Chromium 156 | 5.6 / 16.1 / 20.8 → 7.9 / 15.3 / 15.6         | 2.8 / 3.1 / 19.8 → 2.1 / 2.5 / 19.0      | 418 / 392 → **0 / 0**              | no → **yes**    |
| Firefox 157  | 5 / 39 / 319 → 5 / 8 / 9                      | 3 / 4 / 9 → 2 / 3 / 21                   | 516 / 404 → **0 / 0**              | no → **yes**    |
| WebKit 26.5  | 10 / 66 / 523 → 10 / 20 / 23                  | 14 / **528** / 565 → 15 / 23 / 26        | 430 / 552 → **0 / 0**              | no → **yes**    |

The p95 input→preview budget of ≤100 ms with 50 MiB of media is met locally in all three engines; on the 0.4 code WebKit exceeded it while dragging. The preview commit happens before the asynchronous media work: on the 0.4 code every edit reread and recomputed the digest of up to 50 MiB and created new Blob URLs after `documentchange`, so the test took about 2 minutes per browser against a few seconds now. Chromium trace in `test-results/evidence/perf-trace-chromium.json` (untracked because of its size). A «before» measurement with a different timestamp was discarded: in WebKit the `event.timeStamp` of synthetic events uses another clock (`.tools/perf-before/`).

[Minimal bundle](consolidation-bundle.json): **48 929 B JS / 932 B CSS gzip** (0.4: 46 353 / 932; +2 576 B for the local SHA-256, messages and incremental update), limits 102 400 / 20 480 B, React, editor, DOMPurify, marked, KaTeX and fflate absent.

## Accessibility

[axe results](consolidation-axe.json) from axe-core 4.14.0 (WCAG 2.0/2.1/2.2 A–AA and best practices) on `/core`, `/structure`, `/content` with and without the text view, an empty Studio, with the gallery, with a dialog and while presenting, in all three engines: **zero serious or critical violations**, no justified exception needed. Two **moderate** rules remain, not blocking for the gate: `landmark-unique` in the playground (two players of the same document have the same accessible name) and `page-has-heading-one` in Studio. Moderate violations are recorded, not hidden. axe is not equivalent to a screen reader test.

## Coverage

[Per-file detail](consolidation-coverage.json). Per-area thresholds, set a few points below the 0.4.1 measurement to prevent regressions without making them brittle; the core keeps the 0.3 gate.

| Area                           | Statements | Branches | Threshold | Rationale                                                               |
| ------------------------------ | ---------: | -------: | --------- | ----------------------------------------------------------------------- |
| core                           |     94.63% |   90.05% | 85 / 80   | Historical gate unchanged                                               |
| player assets                  |     95.71% |   90.08% | 90 / 85   | Pure security and verification logic, fully testable in Node            |
| player index/content/messages  |     85.87% |   70.32% | 80 / 65   | Keyboard, focus, resize and CSS 3D are tested in real E2E, not in jsdom |
| plugins security/archive/media |     89.20% |   79.34% | 85 / 75   | Branches for real codecs and media events covered by the E2E tests      |
| editor store/storage           |     92.08% |   75.50% | 88 / 72   | Engine-specific IndexedDB error branches covered by the E2E tests       |

## Final commands

[Commands and exit codes](consolidation-checks.json); logs in `.tools/consolidation-final/`.

| Command                               | Exit | Result                                                                                                  |
| ------------------------------------- | ---: | ------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`      |    0 | 8 workspaces, lockfile unchanged after the justified addition of three development dependencies         |
| `pnpm typecheck`                      |    0 | Strict TS, ES-only core, apps and tests                                                                 |
| `pnpm lint`                           |    0 | ESLint and React hooks                                                                                  |
| `pnpm format:check`                   |    0 | Prettier; prompts excluded                                                                              |
| `pnpm test`                           |    0 | **322 passed**, 18 files, zero failed or skipped (233 from the baseline + 89 new)                       |
| `pnpm test:coverage`                  |    0 | Per-area thresholds met (table above)                                                                   |
| `pnpm build`                          |    0 | Core, player, plugins, editor and two production apps                                                   |
| `pnpm check:boundaries`               |    0 | Core and player isolated, optional plugins                                                              |
| `pnpm check:bundle`                   |    0 | 48 929 / 932 B gzip, report in `test-results/bundle/`                                                   |
| `pnpm test:e2e`                       |    0 | **162 passed**: 54 Chromium + 54 Firefox + 54 WebKit (120 regressions + 42 new), zero failed or skipped |
| `git diff --check`                    |    0 | Whitespace                                                                                              |
| `git status --short` after the checks |    — | No tracked file modified by the scripts                                                                 |

The first final run found two errors, fixed and run again: a type in a test (`exactOptionalPropertyTypes`) and the alignment of a table in DEVELOPMENT.

## Decisions, compatibility and test changes

- Additive APIs: `PlayerOptions.messages`, `PlayerMessages`/`defaultMessages`, `ContentContext.messages?`, `AssetError`, `AssetResolver.revision?`, `NavigationMachine.peek()`/`getChoices()`, `EditorStore.coalesce`/`endCoalesce`, methods of `RecoveryRepository` and `Autosave`, `ARCHIVE_LIMIT`/`JSON_LIMIT`, `randomId`. The only exported behaviour change: `blockText` returns accessible text (alt, label, title) and no longer the Markdown, HTML, SVG or LaTeX source, as required for the outline.
- Third-party renderers are not remounted when their block does not change: they receive the new document with `update()`, documented in PLUGINS.
- Exact development dependencies, released more than two weeks earlier and verified: axe-core 4.14.0 (MPL-2.0), jsdom 30.1.2 (MIT), fake-indexeddb 6.2.5 (Apache-2.0). No new runtime dependency. Manifests moved to 0.4.1.
- Existing E2E tests: Studio URL with `?studio-debug` and `window.studio!`; evidence to `test-results/evidence/`; the storage test opens the database without pinning the version (now v3) and injects the quota error on a new resource, because unchanged resources are no longer rewritten. No test removed or made optional.
- CI: Actions by SHA (checkout v4.4.0, pnpm/action-setup v4.3.0, setup-node v4.4.0, upload-artifact v4.6.2, i.e. the releases `@v4` pointed to), `permissions: contents: read`, `pnpm test:coverage`, `git diff --exit-code` and upload of `test-results/` only.

## Limits and deferrals

- No 0.4.1 ROADMAP item is deferred. The run of the updated CI remains to be observed at the maintainer's first push.
- Timings on a single uncontrolled computer; the pre-1.0 performance gate on a controlled runner stays open. The test asserts the budget locally and only records it when `CI` is set, as planned for noisy runners.
- WebKit is the Playwright runner for macOS 14, not an installed Safari; mobile devices, screen readers and heap after GC not tested.
- The two moderate axe violations stay open; they were not introduced by this phase.
- The non-localhost host is simulated by routing `*.spatialdeck.test` to the local servers inside the test browser: it proves the real insecure context, not an external network.
- A block with an unresolved asset is retried on every update; the cost is bounded by the memoized verification.

## Handoff for 0.5

Prerequisites: an incremental preview within budget (verified locally in all three engines) and confirmation of G0 item 4 (layout model) by the maintainer, still **open**. To reuse: the incremental `updateDocument` and its equivalence test, the counters of the performance test for dragging 30 canvas blocks, `messages` for the new player texts, evidence in `test-results/`.
