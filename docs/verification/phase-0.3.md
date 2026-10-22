# Verifica SpatialDeck 0.3 Struttura

21–22 ottobre 2026. Implementazione locale completata con schema **1.1.0**, migrazione in copia da **1.0.0**, player autonomo e Studio condivisi. **187 unità + 90 E2E = 277 test passati, zero fail/skip.** Nessun commit, push, tag, deploy, publish o fase 0.4.

## Baseline e perimetro

Stato iniziale: solo `?? prompts/`, preservato. Letti AGENTS della chat, README/indici, PROJECT_SPEC/ROADMAP, DEVELOPMENT e rapporti 0.1/0.2 prima dei sorgenti pertinenti. Baseline misurata prima delle estensioni: **119 unità e 66 E2E passati** sui tre motori; log locali `.tools/structure-baseline-unit.log` e `structure-baseline-e2e.log`.

File principali aggiunti: `packages/core/schema/project-1.1.0.schema.json`, `document/structure.ts`, test core/editor struttura, `HierarchyTree`, `PathPanel`, `CameraTimeline`, fixture `examples/structure-branching/project.json` e `tests/e2e/structure.spec.ts`. Estesi generatore/tipi/validatori, matematica, state machine/eventi, player, comandi/store, mappa/preview/inspector/Studio e demo vanilla. Aggiornate guide, specifica, roadmap, manifest 0.3.0 e lockfile; aggiunto soltanto il provider coverage V8 5.0.5 allineato al Vitest già fissato.

Schema/fixture originali 1.0.0, LICENSE, prompt e rapporti/evidenze storiche conservati. Gli E2E precedenti ora scrivono in `structure-regressions/`; check:bundle scrive in `structure-bundle.json`, senza sostituire il rapporto storico. Lo schema corrente e quello storico sono esportati come subpath espliciti.

## Ambiente e avvio riproducibile

[Ambiente rilevato](structure-environment.json): macOS 14.8.7 / 23J520 arm64, Apple M3 Max, 64 GiB, Node **24.22.0**, pnpm **12.14.0**, TS **6.0.3**, Vite **8.3.5**, Vitest/coverage V8 **5.0.5**. Tool locali `.tools`, nessun cambiamento globale. Chromium/Firefox con Playwright **1.64.1**, WebKit con il runner macOS 14 **1.61.1** già presente.

```sh
export PATH="$PWD/.tools/node_modules/.bin:$PATH" # solo se richiesto da questo host
pnpm install --frozen-lockfile
pnpm dev:studio
pnpm dev:playground
```

Studio normalmente sulla porta 5174; playground sulla porta indicata da Vite, route `/structure` per la nuova demo e `/core` per quella storica. In questa verifica 5174 era già occupata: è stato avviato un secondo Studio con `pnpm dev:studio --port 5175 --strictPort`, senza interrompere il processo preesistente. Entrambi gli avvii sono stati provati in Chromium reale: due player vanilla, una preview Studio, scelta manuale, import 1.1.0 e scrub fino all’endpoint, zero page error e nessun overflow a 1440/768/390/320 px: [smoke dev](structure-dev-smoke.json).

Aprire la fixture struttura anche con **Apri JSON** in Studio. A offre B/C, entrambi raggiungono D; `prev` torna al ramo effettivo. Il ritorno D→A e la sosta D→D sono manuali e limitati a due visite per nodo. B è figlia di A; l’array delle scene ordina A,C,B,D. La track AB contiene tre keyframe e termina in una posa diversa dal fit di B. Il secondo percorso C→D è indipendente.

## Modello e decisioni verificate

- `validateDocument`/`migrateDocument` restituiscono copie correnti; schema e semantica 1.0.0 sono verificati prima della migrazione. Aggiunti parent null e track/cue vuoti, senza rinominare ID o alterare percorsi/estensioni. Migrazione corrente idempotente e roundtrip deterministico; versioni future rifiutate senza sostituzione. La capacità structure si aggiunge solo se usata. Edge ID ripetuti tra percorsi storici sono conservati; un cue con riferimento ambiguo è invece rifiutato.
- Gerarchia `Mparent*Mlocal`, scala uniforme positiva e output double precision senza stato globale gl-matrix. Self-parent, cicli, parent assente e catene oltre 32 scene rifiutati. Reparent conserva world tramite inverse/decomposizione, oppure fallisce prima del commit se fuori range. Visibilità eredita i parent; fit usa rotazione e scala world. Drag figlio opera nel piano XY del mondo mantenendo Z.
- Grafi con nodi/edge/start stabili e tutti i nodi raggiungibili. SCC iterative individuano le connessioni cicliche, che richiedono condizioni esplicite e loopPolicy. Più uscite eleggibili o una singola uscita manuale producono choice-required senza mutazioni. Limiti contano solo visite completate nella history corrente; prev non consuma ingressi. Nessun loop automatico o codice eseguito dal JSON.
- History committata solo all’arrivo, con ID visita e posa finale; prev torna alla posa registrata. Noop, scelte e input invalidi non cancellano il piano valido. Dieci interruzioni, AbortSignal, prev interrotto, cambio path, updateDocument, hidden e reduced motion conservano gli invarianti precedenti. Un self-edge esplicito produce una nuova visita allo stesso nodo; goTo al nodo corrente resta noop.
- Camera documento Euler (`AuthoredCameraPose`) e camera runtime quaternion (`CameraPose`) restano distinte. Track risolta in copia con ingresso pari alla posa visuale; posizione lineare/Catmull-Rom, slerp e zoom log-lineare, easing track una sola volta. Estremi cubici verificati analiticamente, anche con ingresso runtime sostituito. Endpoint mantenuto senza snap al fit; ritorno alla posa registrata senza ripercorrere la track in avanti. Giri oltre 180° richiedono punti intermedi.
- Cue ordinati `(atMs,id)`, una sola emissione per transizione, niente esecuzione di payload. Durata sostitutiva scala le soglie; durata zero/reduced emettono tutti i cue in ordine. Hidden congela il tempo attivo; cancel sopprime i futuri. Un listener cue che distrugge o avvia ispezione non produce ricorsioni/commit fantasma. Scrub usa solo sampler e setCamera, senza eventi cue o nuove visite.
- setView/setCamera interrompono la transizione e non aggiungono visite; overview considera bounds world visibili. Pan/zoom e view sono temporanei. Outline DFS espone ogni nodo raggiungibile una volta, incluse alternative, evitando loop infiniti. Scelte pubbliche etichettate, focus al titolo dopo scelta e navigazione da tastiera verificati.
- Studio gestisce path/start/visite/connessioni/label/condizioni, parent via select e albero, camera nodo, durata/easing, track/keyframe e cue JSON. Il bottone loop imposta max 3 e condizioni manuali in un solo comando. La preview di selezione usa camera nodo/fit, anche per scene fuori dai percorsi; lo scrub ispeziona invece il piano edge. Nessun secondo renderer, sampler o clock React.
- Per un principale canonico senza condizioni, track o cue resta l’inserimento lineare automatico; nei grafi le nuove scene sono indipendenti. Le eliminazioni mostrano l’impatto concreto, inclusi nodi divenuti irraggiungibili e figli ricollocati world-preserving. Conferma e applicazione come singolo comando; undo ripristina tutti i riferimenti. Snapshot invariati non notificano i subscriber. JSON/download/IndexedDB contengono i dati nuovi senza stato UI; budget history/autosave restano quelli precedenti.

## Comandi finali

[Esiti e inventario](structure-checks.json), [test browser individuali e versioni runner](structure-e2e-results.json), [coverage core](structure-coverage.json). Log delle esecuzioni sotto `.tools/structure-final-*.log`; report/trace browser e HTML coverage sotto `test-results/`.

| Comando                                                                        |    Exit | Risultato                                                         |
| ------------------------------------------------------------------------------ | ------: | ----------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                                               |       0 | 7 workspace, peer strict, lockfile invariato alla reinstallazione |
| `pnpm typecheck`                                                               |       0 | Core ES-only, player, editor, app e test                          |
| `pnpm lint`                                                                    |       0 | ESLint e React hooks                                              |
| `pnpm format:check`                                                            |       0 | File applicativi/documentali pertinenti; prompt preservati        |
| `pnpm test`                                                                    |       0 | **187 pass, 0 fail/skip**, 9 file                                 |
| `pnpm test:coverage`                                                           |       0 | **94,71% statements / 89,42% branches** core                      |
| `pnpm build`                                                                   |       0 | Core/player/editor ESM + dichiarazioni, due app production        |
| `pnpm test:e2e`                                                                |       0 | **90 pass, 0 fail/skip**: 30 Chromium + 30 Firefox + 30 WebKit    |
| `pnpm check:boundaries`                                                        |       0 | Core/player isolati, React solo editor/app                        |
| `pnpm check:bundle`                                                            |       0 | **32 201 B JS / 815 B CSS gzip**; limiti 102 400 / 20 480 B       |
| `pnpm dev:studio --port 5175 --strictPort`, `pnpm dev:playground --strictPort` | 0 avvio | Due smoke browser reali, zero page error                          |
| `git diff --check`                                                             |       0 | Whitespace dei file tracciati                                     |

68 unità nuove più 119 regressioni; 24 E2E nuovi più 66 regressioni. La coverage misura i sorgenti TypeScript core eseguibili, escludendo tipi/dichiarazioni e il validatore Ajv generato; quest’ultimo è verificato dai test comportamentali degli schemi. Gate automatici 85% statements / 80% branches. Build e browser non richiedono backend.

## Prove visive e roundtrip

Artefatti reali Chromium aperti e ispezionati: [scena annidata nel player vanilla](structure-nested.png), [Studio](structure-studio.png), [endpoint track nella preview](structure-track.png), [timeline operativa](structure-timeline.png). Mappa e preview restano visibili su desktop durante lo scorrimento della lunga timeline. Testi/campi leggibili e controlli distinti; una track può volutamente inquadrare parzialmente scene non attive o usare una scala diversa dal fit. Non si dichiara visibilità universale durante il movimento 3D. L’inspector avvisa per punti sul/dietro il piano prospettico e rimane la vista testuale.

[Landmark camera/world](structure-landmarks.json): tre punti della scena figlia B, proiezione DOM confrontata con matrici core e prospettiva entro **1 CSS px** sui tre motori. Le unità verificano separatamente trasformazioni non commutative su tre livelli e reparent con errore **<=1e-6** sulle matrici; anche gimbal lock e inverse. L’E2E reparent confronta i landmark effettivi prima/dopo e usa undo.

[JSON realmente scaricato](structure-roundtrip.json): nuovo percorso costruito dai controlli Studio, connessione alternativa, salvataggio, lettura del download, apertura in un nuovo browser context e confronto integrale del modello 1.1.0. E2E distinti creano camera nodo, track e cue dalla UI, abilitano/chiudono un loop, verificano preview d’impatto/cancel/eliminazione/undo, importano 1.0.0 e rifiutano 1.2.0 lasciando il lavoro intatto. Reload e recupero IndexedDB mantengono struttura completa. Regressioni quota/conflitti/teardown/tastiera restano attive; nessuno skip per aggirare problemi.

Difetti trovati e corretti durante QA: preview che rifaceva il fit dopo una posa d’arrivo track durante il reparent; conferme numeriche senza variazioni che notificavano lo store e resettavano la preview; centro pagina allungato dalla timeline; incoerenza tra nodo scelto e inspector; ResizeObserver che osservava lo stage modificato dal callback durante il resize; rientranza da listener cue; warning prospettici e range camera world. I tentativi falliti sono diagnostici, i conteggi si riferiscono all’ultima suite completa riuscita.

## Gate, limiti e handoff 0.4

Tutti i gate obbligatori 0.3 locali risultano verificati. Nessuna CI Linux 0.3 avviata: l’evidenza remota precedente resta solo della fase 0.1. WebKit Playwright 1.61.1 su macOS 14 non equivale a Safari reale né a WebKit corrente in Linux. Safari/Chrome/Edge installati, screen reader, hardware touch, heap dopo GC e benchmark p95 controllati restano non eseguiti come previsto dalle verifiche pre-1.0.

Mappa XY, inspector Euler e timeline a elenco sono strumenti autoriali minimi operativi; nessun gizmo/orbit o graph layout complesso. Il confronto camera è geometrico, non una certificazione accessibilità o performance. Cue browser non garantiscono sincronizzazione audio. Outline e selezione numerica restano alternative al movimento. Recovery browser non è un backup.

Per 0.4 preservare schema/fixture 1.0.0 e 1.1.0, queste regressioni, limiti di JSON/history e separazione core/player/editor. Introdurre solo nella fase successiva schema 1.2.0 e blocchi/media/plugin con la propria migrazione e policy. Nessuna dipendenza o implementazione di contenuti/export/import successivi è stata anticipata.
