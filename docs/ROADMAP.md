# SpatialDeck — phase roadmap

Documentation baseline: 21 October 2026. Normative contract: [PROJECT_SPEC.md](PROJECT_SPEC.md). Verified initial state: only the GPL v3 `LICENSE`, no application code; this delivery adds only two documents and six prompts. All the application, fixture and report paths below are proposals until the agent verifies they exist. No implementation box is ticked yet.

**Revision of 22 October 2026.** After the pre-distribution audit the sequence is `0.1 -> 0.2 -> 0.3 -> 0.4 -> 0.4.1 Consolidation -> 0.5 Layout -> 0.6 Distribution -> 1.0 Stabilization`, with the G0 decision gate before 0.5, closed on 22 October 2026 (decisions in the [specification, section 21](PROJECT_SPEC.md)). Rationale and open decisions in the [specification, section 19](PROJECT_SPEC.md); the map from gaps to phases is in section 12 of this document. The prompts are local and excluded from commits: links to the `prompts/` folder work only in the maintainer's checkout.

## 1. Phase matrix

| Phase / prompt | Real dependencies | Deliverables | Observable acceptance | Main risks |
| --- | --- | --- | --- | --- |
| **0.1 Core** — [01-core](../prompts/01-core.md) | `LICENSE`, specification and verified toolchain; no editor needed | pnpm, strict TS, Vite; core and player; schema `1.0.0`; vanilla demo; API, initial CI | Three scenes with different XYZ, rotations and scales visible; next/prev/goTo/setPath and two instances; schema, semantics and transitions tested; destroy without leftover resources; typecheck, lint, format, unit, build, boundaries, bundle and real smoke tests | CSS and matrix conventions; tooling peers; interruptions and focus |
| **0.2 Editor** — [02-editor](../prompts/02-editor.md) | Runnable 0.1 and its verification; schema unchanged | React Studio, XY map, XYZ/Euler/scale inspector, tree, shared preview, commands, JSON files and IndexedDB | Create, duplicate, delete, drag; one undo per drag; undo/redo and invalid opening preserve data; save -> reopen -> player keeps document and pose; reload offers recovery; denied quota handled | Preview/store divergence; non-atomic autosave; dependence on the browser picker |
| **0.3 Structure** — [03-struttura](../prompts/03-struttura.md) | Green 0.1/0.2 regressions | Schema `1.1.0`, migration; graph, parent and timeline UI; independent camera; history and overview | Fixtures A->B->D and A->C->D with consistent prev; loop with exit and limit; reparent with world pose unchanged; three-keyframe track and interruption without snaps or phantom visits; `1.0.0` fixture opens | History ambiguity; gimbal lock; duplicate cues; overgrown timeline and graph UI |
| **0.4 Content** — [04-contenuti](../prompts/04-contenuti.md) | 0.3 + plugin contract, trust profile | Schema `1.2.0`; blocks, assets and archive, plugin SDK; editing and rendering; security and media | Text, Markdown, HTML, SVG, LaTeX, image, audio and video demo; branch link; local plugin with dispose and missing-plugin roundtrip; hostile payloads inert; missing asset, codec or play denial with fallback; archive reopened offline | XSS, SVG, CSS; media permissions; ZIP and traversal; trusted JS plugins |
| **0.4.1 Consolidation** — [04b-consolidamento](../prompts/04b-consolidamento.md) | 0.4 with green regressions; audit of 22 October 2026; no G0 decision needed | Fixes to asset signatures and digests, incremental preview, store and autosave, replaceable player texts and `lang`, derived outline, Studio and IndexedDB hardening, CI with axe and plugins/editor coverage | SVG with a prologue and UTF-8 VTT >4 KiB accepted; assets with digests served over non-localhost HTTP; p95 input->preview <=100 ms with 50 MiB of media; no `ws:` or `window.studio` in production; local projects deletable; schema 1.2.0 unchanged | Incremental preview regressions; IndexedDB differences across browsers |
| **0.5 Layout** — [05-impaginazione](../prompts/05-impaginazione.md) | 0.4.1; G0 item 4 (layout model) confirmed | Schema `1.3.0` and migration; block frames in canvas scenes, theme, scene appearance, token styles; scene editor over the player preview | Canvas fixture with side-by-side, overlapping and rotated blocks; historical fixtures migrated with no rendering differences; one undo per gesture; reading order independent of `z` verified with keyboard and outline; no CSS string in the document | Editor/player divergence; reading order; drag performance; fonts and licences |
| **0.6 Distribution** — [06-distribuzione](../prompts/06-distribuzione.md) | 0.5; G0 items 1–2 for licence and scope; Chromium available; FFmpeg/ffprobe for video | Local CLI, correct packaging, embed bundle, standalone HTML, PDF, minimal video, presenter and a cacheable Studio shell | `file://` HTML with the network disabled and zero remote requests; PDF with one page per visit; WebM frames and duration within contract; notes absent from the audience; pop-up denial handled; negative CLI exit codes; exports faithful to canvas, theme and fonts; tarballs installed and tried in an external consumer; third-party notices; realistic consumer measured | File origin and CSP, also for KaTeX, codecs and fonts; capture time; note leakage; offline shell; licences |
| **1.0 Stabilization** — [07-stabilizzazione](../prompts/07-stabilizzazione.md) | All previous phases with evidence; schema 1.3.0 frozen unless explicitly decided | Essential impress.js import, diagnostics and fixtures; hardening, browser matrix, benchmarks, documentation (CHANGELOG, CONTRIBUTING, SECURITY) and release candidate | Mapping of the official attributes and six rotation orders with matrix comparison; E2E, migrations and exports not regressed; real targets recorded; budgets measured; licences; no P0/P1 blocker; otherwise a blocker list and no stable claim | Upstream CSS or plugins not convertible; missing hardware or browsers; unmeasured performance; library licence |

Strictly sequential dependency: `0.1 -> 0.2 -> 0.3 -> 0.4 -> 0.4.1 -> 0.5 -> 0.6 -> 1.0`; G0 had to close before 0.5 (layout model) and before any publish (licence, scope): it has been closed since 22 October 2026 (section 14). Every agent starts from the actual state, reads indexes and architecture before the relevant sources and preserves the user's changes. If the predecessor is missing or broken, it documents the missing requirement, fixes only relevant regressions and neither invents deliverables nor implements several phases automatically.

## 2. Minimum working product and cumulative demonstrations

**0.1 is the minimum usable framework:** a real vanilla page, three scenes, controls, API and lifecycle. No empty editor or cosmetic panel counts as a result. **0.2 is the minimum product for non-programmers:** a user creates and presents a savable document without writing code. Later versions extend that product while keeping it runnable; they do not rewrite it.

| Phase | Proposed fixture/demo | Test path and negative test |
| --- | --- | --- |
| 0.1 | `examples/core-three-scenes/project.json`; playground `/core` | Open, navigate 1->2->3, interrupt 2->3, destroy and remount; JSON or missing target rejected |
| 0.2 | `examples/editor-roundtrip/project.json`; Studio | Create three scenes, drag and inspector, undo, save, reopen in a new session and in the player; broken JSON does not replace the document |
| 0.3 | `examples/structure-branching/project.json` | A->B->D->prev=B, A->C->D->prev=C; limited D->A loop; parent cycle rejected; camera track without snaps |
| 0.4 | `examples/content-gallery/project.json` + local assets and a produced `.spatialdeck` | Gallery and sample plugin, archive export and import; XSS, missing asset, denied autoplay, missing plugin |
| 0.4.1 | 0.4 gallery plus edge-case asset fixtures (SVG with prologue and DOCTYPE, UTF-8 VTT >4 KiB, 50 MiB video) | Valid assets accepted and digests over non-localhost HTTP; smooth preview with media; player in another language with replaced texts; genuinely wrong signatures still rejected |
| 0.5 | `examples/layout-canvas/project.json` | Hidden title, image and text side by side, overlapping and rotated elements, reading order different from the visual order, non-default theme; frames outside the scene, CSS in the document and unknown PaletteId rejected |
| 0.6 | `examples/distribution-static/project.json` + `itinerary.json`, with at least one canvas scene and a theme font | Bundle and offline HTML; three-page PDF; 30 fps WebM; dynamic media in strict video rejected; consumer from tarballs |
| 1.0 | `packages/impress-compat/test/fixtures/` and final matrix | Inert import of controlled HTML, diagnostics for CSS and plugins; historical fixtures and cumulative regressions |

Historical fixtures are kept in their own version to test migrations; current examples may have migrated copies, without replacing the historical sources. Routes and names are targets to confirm in the real code. Earlier documents and APIs are kept, or change only through explicit migrations.

## 3. Schema and API evolution

| Milestone | Written document | New APIs, without anticipating code from later phases |
| --- | --- | --- |
| 0.1 | `schemaVersion: "1.0.0"`, linear capability | validate, migrate infrastructure, serialize, math, createPlayer, mount/destroy/goTo/next/prev/setPath/getState/on |
| 0.2 | `1.0.0` unchanged | Validated, atomic updateDocument; editor commands and storage with no UI data in the JSON |
| 0.3 | `1.1.0`, migration from 1.0.0 | Parent, graph, cameraTracks and cues, branching history; setView/setCamera and choice-required |
| 0.4 | `1.2.0`, migration from 1.1.0 | Block union and plugin API 1.0.0, concrete AssetResolver, pluginSettings |
| 0.4.1 | `1.2.0` unchanged | `PlayerOptions.messages`, `lang` from the document, incremental `updateDocument` with the same observable contract |
| 0.5 | `1.3.0`, migration from 1.2.0 | Frames, theme, appearance and style, layout capability, frame↔scene conversion in the core; scene editor |
| 0.6 | `1.3.0` unchanged | renderAt and capture, CLI, external manifests and itineraries |
| 1.0 | `1.3.0` unchanged | Importer; optional, isolated impress facade; public versioning |

Product, document and plugin API versions are independent. A minor schema bump alone never allows old readers to ignore unknown fields. Unknown plugin data instead stays opaque and round-trips. If this plan has to change, record an ADR in the specification, update every affected prompt and add fixtures and migrations before changing the consumers.

## 4. Decision points and settled trade-offs

1. **Before bootstrapping:** confirm the Node 24.22.0 / pnpm 12.14.0 / TS 6.0.3 / Vite 8.3.5 baseline with a real installation. The metadata were verified, the builds were not. TS 7 does not come in until the linter supports it. The existing GPL licence must not be replaced to make embedding easier.
2. **Before the canvas editor:** the XY map is authoring UI; preview and presentation are always `@spatialdeck/player`. A parallel React renderer is forbidden. Reparenting arrives in 0.3 and must not be simulated in 0.2.
3. **Before structure:** adopt latest-wins, history commits on completion and `prev()` on the actual visit. Decisions on loops and the independent camera must be settled before the timeline. Uniform scale avoids shear; a full 3D gizmo is out of scope.
4. **Before content:** a single sanitization pipeline and a host-approved plugin registry. No code loaded from the JSON. ZIP with assets is the portable transport; JSON stays canonical. Web MIDI optional, OSC bridge out of the requirements.
5. **G0, before layout and any publish:** the maintainer decides the SPDX identifier and licence of the packages including the player, ownership of the npm scope, the default language of the interface and the public documentation, and confirms the specification's layout model (canvas with frames, flow by default, token styles). An agent does not infer them: without them it records a blocker. **Closed on 22 October 2026:** `GPL-3.0-or-later` for every package, the player included; the maintainer's `@spatialdeck` scope; English as the default language; layout model confirmed without changes ([specification, section 21](PROJECT_SPEC.md)).
6. **Before layout:** incremental preview and store (0.4.1), because dragging inside the scene must stay within budget. Reading order = array order, `z` only visual. No style as free CSS; no React renderer for blocks, handles sit on top of the player preview.
7. **Before exports:** explicit profiles. A minimal static video without audio is mandatory and verifiable; dynamic media in the player do not imply video support. Standalone HTML does not embed arbitrary external web content. Exports start from the 1.3.0 visual model; third-party dependencies stay external in the packages and licence notices go into the artefacts that embed code.
8. **Before stability:** pin the impress.js baseline, real browsers and the benchmark environment. If source CSS cannot be converted, a concrete warning; if Safari or budgets are not verified, the gate stays open. No tag or publish in this phase.

## 5. Cross-cutting gates and commands

Every phase MUST implement, test and document its own scope, and fix errors before completion. The future report `docs/verification/phase-<version>.md` includes startup instructions, environment, commands and exit codes, the number of passed, failed and skipped tests, artefacts, decisions and limits. Environmental blocks are declared as checks not run; green tests are never fabricated.

Planned root commands: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm test:e2e`, `pnpm build`, `pnpm check:boundaries`, `pnpm check:bundle`. Verify the actual scripts and create them in the relevant modules before invoking them; do not assume they exist in the initial repository. Explicit browser installation, no remote services for demos. From 0.2 verify `pnpm dev:studio`; from 0.6 `pnpm spatialdeck --help` and real output. Every phase runs the relevant regression checks of the earlier ones.

| Area | Initial requirement | Later deepening |
| --- | --- | --- |
| Security | Input, schema, IDs and paths, textContent, package boundaries | Sanitization and ZIP in 0.4, Studio CSP and global debug handle in 0.4.1, token styles without CSS in 0.5, export CSP and licence notices in 0.6, full audit in 1.0 |
| Accessibility | Focus, keyboard, reduced motion, outline in 0.1 | Editor 0.2, graph and timeline 0.3, media and alt 0.4, language, texts, derived outline and axe in CI 0.4.1, reading order, drag alternative and contrast 0.5; real screen reader before 1.0 |
| Determinism | Pure clock and sampler in 0.1 | Tracks and cues 0.3; export frames 0.6 |
| Lifecycle | Two instances and destroy without leftovers in 0.1 | Editor storage and listeners, media and plugins in the phases that introduce them; incremental update without leftovers 0.4.1 |
| Bundle | Player and core free of React and editor, gzip budget | Separate plugin and CLI entry points; on-demand renderers, fonts as files and realistic consumer measured in 0.6; no unmeasured growth |
| Persistence | JSON and validation | IndexedDB recovery 0.2, asset archive 0.4, project deletion and IDB upgrade 0.4.1, 1.3.0 migration in 0.5, historical migrations always |

Normative budgets in the specification: core+player <=100 KiB gzip JS / <=20 KiB CSS; a 100-scene fixture; p95 mount <=1000 ms and validation <=100 ms on a recorded runner; p95 frame <=34 ms with no long task >200 ms; input->preview <=100 ms, also with 50 MiB of media (0.4.1) and while dragging 30 canvas blocks (0.5); realistic consumer measured (0.6); zero owned resources after 50 destroys; heap delta <=5 MiB with controlled GC. These are thresholds to measure, not performance already achieved. Timings on noisy CI stay informative; the pre-1.0 performance gate runs on a controlled environment.

## 6. Release 1.0: exit gate

- [ ] Every phase (0.1–0.6) run individually with real reports and cumulative demos; G0 closed with recorded decisions.
- [ ] Player independent of editor and React; editor without competing math or rendering.
- [ ] Current schema and types aligned; 1.0.0/1.1.0/1.2.0/1.3.0 fixtures and migrations without loss or rendering differences.
- [ ] Canvas layout, theme and token styles verified in player, Studio and exports; reading order and drag alternative tested.
- [ ] Branch, loop, history and interruption navigation, hierarchies and keyframes verified.
- [ ] Builtin content, sanitization and trust model documented and tested.
- [ ] Real JSON, archive and recovery, including quota errors and missing assets.
- [ ] Embed, offline HTML, PDF and minimal video actually produced and inspected; accurate manifests.
- [ ] Presenter with no notes in the audience view and with a pop-up fallback.
- [ ] Essential impress.js import with mapping and warnings; no full compatibility claimed.
- [ ] Browser matrix: automated Chromium, Firefox and WebKit, real Chrome, Edge and Safari per policy; touch and screen reader smoke tests recorded, or explicit blockers.
- [ ] Budgets measured with hardware, browser, build and results, without unsupported claims.
- [ ] Complete CI, installable local packages, public types, licences and attributions, and reproducible documentation.
- [ ] No known unresolved P0/P1, data loss or security risk; backlog classified.

If a mandatory condition is missing: `docs/RELEASE_BLOCKERS.md` with reproduction, impact, missing evidence and closing criterion. Prepare a candidate without declaring it stable. **Stop:** no automatic next phase, deploy, publish, push, tag, remote commit or unrequested destructive operation.

## 7. Documentation audit carried out in this delivery

The eight files define exactly six prompts, in the required order, each with ten operational sections, tests, a Definition of Done and a stop condition. The dependencies keep player and core free of React and a single preview; schema and API have explicit milestones and migrations. Every phase prescribes a runnable demo and verifiable tests; export and import distinguish capabilities, dependencies and limitations; security and accessibility run through every phase. impress.js is a reference and a limited import format, with no guaranteed equivalence. The audit is editorial and contractual: none of the six implementations has started and no application tests have been run.

Actual outcome of the delivery: **32 documentation checks passed**, run with the Python and jsonschema already available, without installations. They include Draft 2020-12 meta-validation, validation of the three-scene example and rejection of five structurally invalid variants (zero scale, unknown field, incomplete vector, future version and premature HTML block). Verified: prompt count, order and sections, scopes, tests, stops and handoffs, references, schema and API, tables, fences, links and whitespace, an unchanged LICENSE and no additions other than the eight Markdown files. Contract presence checks do not prove product functionality: implementation, installation and application tests remain entirely to be done in the six phases.

## 8. Verified implementation progress — 21 October 2026

0.1 now has runnable code and a production demo at the proposed paths: core and player, schema 1.0.0, three scenes and two vanilla instances, validation, math, navigation, history and cancel, input, focus and outline, CSP and teardown. Toolchain installed at the documented pins and frozen install verified. Details and actual counts in the [0.1 report](verification/phase-0.1.md), API in the [guide](DEVELOPMENT.md).

The local application gates now pass on all three engines without skips: Chromium and Firefox with Playwright 1.64.1 and WebKit with the dedicated 1.61.1 runner for macOS 14. The compatibility runner is authorized, separate in workspace and lockfile, and uses the same suite. Linux CI verified 1.64.1 on the three browsers: 85 unit and 30 E2E tests passed, zero skipped, [run 39596586324](https://github.com/fv-c/SpatialDeck/actions/runs/39596586324) on commit `07916cc`. The Linux result is distinct from the local macOS 14 test; 0.2 has not started. Real Safari, screen readers, heap/GC and controlled benchmarks remain among the planned stabilization checks.

## 9. Editor 0.2 progress — 21 October 2026

Studio 0.2 is implemented at the planned paths: React editor, XY map with core geometry, inspector, scenes, duplication and deletion, atomic undo/redo, shared player preview and presentation, JSON files and IndexedDB. The schema stays 1.0.0. The [0.2 report](verification/phase-0.2.md) records 119 unit + 66 E2E tests passed locally, zero failed or skipped, a roundtrip through a real file and a new session with model, camera and landmark comparison, recovery after reload, denied quota and rollback, and conflicts across two tabs. All contract scripts and both dev servers are verified.

The local test keeps the macOS 14 WebKit runner 1.61.1 and the main 1.64.1 for Chromium and Firefox. Linux CI for 0.2 has not been run; the remote evidence of section 8 remains limited to 0.1. The author guide is in [AUTHORING](AUTHORING.md). The restrictions for unsynchronized imported paths and history eviction are declared in the specification and the report. The starting point for 0.3 is now this editor with all the 1.0.0 regressions; no future structural work has been anticipated.

## 10. Structure 0.3 progress — 21–22 October 2026

0.3 is implemented with schema 1.1.0 and migration from 1.0.0, preserving historical fixtures and reports. Branches A/B/C/D and actual prev, a limited manual loop, world-preserving parent and reparent with undo, independent camera, tracks and cues, timeline editing and scrubbing and overview work both through the API and in Studio. The [0.3 report](verification/phase-0.3.md) collects commands, counts, coverage, bundle, landmarks and roundtrip/download/reopen, recovery and real screenshots.

187 unit and 90 E2E tests passed locally, with no failures or skips, with the browser runners already pinned. The 0.1/0.2 gates remain cumulative regressions; the new artefacts do not replace the historical ones. Linux CI for 0.3 and pre-1.0 checks on real Safari, screen readers and controlled performance remain not run. No later phase started: the prerequisite for 0.4 is now this current model, with green regressions and historical fixtures kept.

## 11. Content 0.4 progress — 22 October 2026

Schema 1.2.0, historical migrations, eleven block types and plugin API 1.0.0 are implemented. The local `/content` gallery and the `.spatialdeck` archive, Studio editing with a shared preview, resolver, sanitization, media and resource recovery are covered by the cumulative tests in the [0.4 report](verification/phase-0.4.md). The [SDK and trust model](PLUGINS.md) document the actual choices: the manifest separates path and entry; IDB stores bytes and MIME types atomically for WebKit compatibility; embeds are script-free and off by default, with no universal guarantee about the frame's CSP attribute. The original gallery resources are CC0.

The gates and counts are those of the current report, without extending the 0.1 Linux CI evidence. Capture is only a declared capability, not an export feature. Distribution, CLI, HTML, PDF, video and presenter have not started. For 0.5, reuse schema 1.2.0 and the pipeline, keep the regressions and test the export profiles without inferring support from browser playback alone.

> Guidance superseded by the revision of 22 October 2026 (section 12): the phase after 0.4 is 0.4.1 Consolidation; exports move to 0.6 on the 1.3.0 model.

## 12. Revision after the 0.4 audit — 22 October 2026

The pre-distribution audit confirmed the local gates (typecheck, lint, format, 233 unit, build, boundaries) and green Linux CI on the 0.4 commit (233 unit, 120 E2E). Each gap is assigned to a phase here; every prompt takes it up within its scope. Priorities: **P0** blocks publication, **P1** a defect or serious risk to close in the given phase, **P2** planned debt. Sequence rationale and the G0 gate in the [specification, section 19](PROJECT_SPEC.md).

| Gap | Priority | Phase |
| --- | --- | --- |
| SPDX identifier and package licence undecided, `license` field missing | P0 | G0: `GPL-3.0-or-later`; applied in 0.6 — **closed** |
| Third-party code copied into `dist` without licence notices and also declared as a dependency (sanitizer not updatable by consumers) | P0 | 0.6 — **closed** |
| Private and incomplete manifests, exact React peer, npm scope not verified | P0 | G0: the maintainer's scope; 0.6 — complete manifests and range peer **closed**; scope ownership **cannot be demonstrated** (registry 404): `private` stays and publication is blocked |
| No positioning, sizing or styling of blocks inside the scene | P1 product | 0.5 — **closed** |
| Asset signatures: SVG with a prologue, comment or DOCTYPE rejected; UTF-8 text truncated at byte 4096 rejected | P1 | 0.4.1 — **closed** |
| SHA-256 digest dependent on `crypto.subtle`: assets cannot load over non-localhost HTTP | P1 | 0.4.1 — **closed** |
| Studio preview rebuilding every renderer and recomputing digests on every edit; autosave recomputing and rewriting every asset | P1 | 0.4.1 — **closed** |
| Player texts hard-coded in Italian, document `lang` not applied, outline showing raw Markdown/HTML source | P1 | 0.4.1 — **closed** |
| Studio production CSP with `connect-src ws:` | P1 | 0.4.1 — **closed** |
| Real weight of a consumer with rich content (142 KB gzip JS, 954 KB gzip CSS because of tripled KaTeX `data:` fonts), every builtin loaded up front, a 976 KB Studio chunk | P1 | 0.6 — **closed** (measurements in the 0.6 report; the realistic-consumer threshold must be set before 1.0) |
| Published `dist` never exercised by the E2E tests (apps and tests use the sources through aliases) | P1 | 0.6 — **closed** |
| KaTeX inline styles and export CSP | P1 | 0.6 — **closed**: KaTeX through DOM/CSSOM, no `unsafe-inline` |
| `window.studio` exposed in production | P2 | 0.4.1 — **closed** |
| Store: serializing and freezing the whole document on every publication; one undo per keystroke in the title; player render walking every block on every frame | P2 | 0.4.1 — **closed** |
| IndexedDB: `versionchange`/`blocked` make autosave unusable until reload; projects cannot be deleted; recovery offered at every start | P2 | 0.4.1 — **closed** |
| “Exceeds 10 MiB” message for archives too; `playsinline` missing on videos | P2 | 0.4.1 — **closed** |
| `check:bundle` rewrites a tracked file; Actions not pinned by SHA; no axe; coverage limited to the core and not run in CI | P2 | 0.4.1 — **closed** locally; CI run to be verified at the first push |
| Outdated documentation (CI status, schema in AUTHORING, environment in DEVELOPMENT) | P2 | 0.4.1 — **closed** |
| Private notes reachable by plugin renderers through the document | P2 | 0.6 — **closed** |
| Demo plugin `org.spatialdeck.badge` among the production builtins; every internal editor API exported | P2 | 0.6 — **closed** |
| Synchronous, recompressing `writeArchive` on the main thread; `readArchive` using about three times the archive's memory | P2 | 0.6 — **closed** for writing; reading with one copy fewer (the whole archive buffer remains) |
| Studio presentation without full screen | P2 | 0.6 — **closed** |
| Fuzzing of the ZIP parser and sanitization policies; `navigator.onLine` as the plugins' offline signal; sandboxed embeds unusable for embeds with scripts | P2 | 1.0 |
| AVIF, FLAC, MOV unsupported; toolchain with exact Node/pnpm versions | P2 | 1.0, to evaluate |
| Documentation only in Italian; CHANGELOG, CONTRIBUTING, SECURITY missing | P2 | G0: English; documentation translated on 31 October 2026 — **closed** for the language; CHANGELOG, CONTRIBUTING, SECURITY in 1.0 |
| Player default texts and Studio interface in Italian, default language decided in G0: English | P2 | 0.6 player — **closed** (`italianMessages` exported); Studio — **closed** on 31 October 2026 |
| Links to prompts valid only locally | Informational | Maintainer's choice, no action |

The checks already known to be outstanding (real Safari, mobile devices, screen readers, controlled heap and benchmarks) remain 1.0 gates and are not reassigned.

Items marked **closed** by 0.4.1 were closed with a test that failed on the 0.4 code and passes after the fix; details, measurements and limits in the [0.4.1 report](verification/phase-0.4.1.md).

## 13. Consolidation 0.4.1 progress — 22 October 2026

0.4.1 is implemented with schema 1.2.0, fixtures and contracts unchanged. Common valid assets are accepted and the digest is computed outside secure contexts too; the Studio preview is incremental with heavy media (no new digest or URL per edit, p95 input→preview within 100 ms on the declared local runner in all three engines); player texts are replaceable through `PlayerOptions.messages`, the document `lang` is applied and the outline shows no source; production Studio has neither `ws:` nor `window.studio`; IndexedDB v3 is robust to upgrades and blocks, projects and revisions can be deleted, and recovery is offered only when it differs from the saved file; axe and extended coverage in CI, Actions pinned by SHA and no check that modifies tracked files. The updated CI has not run yet: nothing has been pushed. Prerequisites for 0.5: incremental preview within budget (verified locally) and confirmation of G0 item 4 by the maintainer, still open.

## 14. Closing the G0 gate — 22 October 2026

The maintainer took the four G0 decisions: `GPL-3.0-or-later` licence for every package, the embeddable player included; the npm scope `@spatialdeck`, owned by the maintainer, with the organization to be created before publishing and ownership verified in 0.6; English as the default language of the interface and of the public documentation (player in 0.6, Studio and guides by 1.0); the 1.3.0 layout model confirmed without changes. Details and consequences in the [specification, section 21](PROJECT_SPEC.md). The prerequisites of 0.5 are met; the phase has not started yet.

## 15. Layout 0.5 progress — 23 October 2026

0.5 is implemented with schema 1.3.0, four standalone validators, derived types and copy migration from 1.0.0/1.1.0/1.2.0 without enabling `layout`; the historical fixtures stay unchanged on disk and open with the same rendering (pixel and geometry comparison against a 0.4.1 build and computed-style checks in the suite). Frame geometry lives in the core and feeds both player and editor; the player renders clipped canvas scenes, theme, appearance and token styles without free CSS; Studio has the **Layout** mode over the shared player preview, with one command per gesture, Escape, arrows, numeric fields, align and distribute, grid, layers, reading order, conversions, theme, appearance and style panels and diagnostics for clipped text, overlaps and contrast. Example `examples/layout-canvas/` and route `/layout`. Outcomes, measurements and limits in the [0.5 report](verification/phase-0.5.md); decisions in the [specification, section 22](PROJECT_SPEC.md).

Prerequisites for 0.6: the 1.3.0 model frozen and tested (exports must reproduce canvas, theme and theme fonts with the same player and embed `fonts.css`/woff2 with `OFL.txt` in the manifest); the minimal bundle to be measured again on the realistic consumer; no 0.5 item deferred. The updated CI has not been run: nothing has been sent to the remote.

## 16. Distribution 0.6 progress — 26 October 2026

0.6 is implemented with schema 1.3.0 unchanged. The `spatialdeck` command (validate, build, export html/pdf/video) with the contract's exit codes, confined JSON or archive input, atomic output and an `ExportManifest`; standalone HTML with a hash-based CSP and `connect-src 'none'`, opened from `file://` offline in all three engines; static build over HTTP; PDF with one page per itinerary visit (single-page prints merged without re-rendering, because Chromium shifts 3D content in a multi-page document); minimal VP9 WebM with frame count and duration verified by ffprobe and poses equal to the sampler's; `renderAt` in the player and the capture plan in the core; presenter view in Studio with an audience window, private notes, previews, timer, reconnection and fallback; a versioned offline Studio shell with explicit updates. Packages with complete manifests, external third-party dependencies, on-demand renderers and an IIFE with generated notices, verified from tarballs in an external consumer, in the E2E tests too. Outcomes, measurements and limits in the [0.6 report](verification/phase-0.6.md); decisions in the [specification, section 23](PROJECT_SPEC.md); guide in [DISTRIBUTION](DISTRIBUTION.md).

Explicit blocker: ownership of the npm scope `@spatialdeck` cannot be demonstrated (registry 404 on 26 October 2026): the manifests stay `private` and no publishing preparation has been done. Linux CI green on commit `5ad6a89` ([run 40323855783](https://github.com/fv-c/SpatialDeck/actions/runs/40323855783): 458 unit, 246 E2E). Prerequisites for 1.0: a justified threshold for the realistic consumer, real Safari and device tests, impress.js import. 1.0 has not started.
