# Verifica SpatialDeck 0.6 Distribuzione

26 ottobre 2026. Schema **1.3.0** invariato; fixture e schemi storici invariati su disco. **458 unità + 246 E2E = 704 test passati**, zero fail/skip/flaky nell’ultima suite completa (82 per motore: Chromium e Firefox con Playwright 1.64.1, WebKit con il runner macOS 14 1.61.1). Nessun commit, push, deploy, publish o tag; 1.0 Stabilizzazione non è avviata. **Blocker esplicito:** la proprietà dello scope npm `@spatialdeck` non è dimostrabile, quindi i pacchetti restano `private` e nessuna preparazione al publish è stata fatta (G0 punto 2).

## Baseline, G0 e perimetro

Stato iniziale: soltanto `?? prompts/`, preservato e non aggiunto all’indice. Letti README, PROJECT_SPEC (sezioni 3–8, 12, 19, 21, 22), ROADMAP (sezioni 1 e 12), DEVELOPMENT, PLUGINS, AUTHORING e i rapporti 0.1–0.5 (inclusa la revisione dell’interfaccia di Studio del 23 ottobre) prima dei sorgenti. Nessun file AGENTS su disco: valgono il prompt di fase e le istruzioni della chat.

Baseline 0.5 misurata prima di cambiare codice (log in `.tools/distribution-baseline/`): `pnpm install --frozen-lockfile`, `typecheck`, `lint`, `format:check`, `build`, `check:boundaries`, `check:bundle` exit 0; `pnpm test` **410 pass**; `pnpm test:e2e` **201 pass** (134 Chromium/Firefox con Playwright 1.64.1, 67 WebKit con il runner macOS 14 1.61.1), zero fail/skip/flaky.

**G0.** Licenza `GPL-3.0-or-later` applicata a tutti i manifest e agli artefatti con il player (sezione 21 della specifica). Scope npm: `https://registry.npmjs.org/-/org/spatialdeck/package` e `https://registry.npmjs.org/@spatialdeck%2fcore` rispondono **404** il 26 ottobre 2026 (come il 22 ottobre): la creazione dell’organizzazione e la proprietà non sono verificabili, quindi `private: true` resta come guardia e la pubblicazione è un blocker. Punto 3 applicato: `defaultMessages` in inglese, `italianMessages` esportato. Punto 4: modello 1.3.0 non toccato.

**Decisione CSP per gli stili di KaTeX (primo passo della fase, prima degli export):** nessun `'unsafe-inline'`. Le formule passano da `katex.render`, che costruisce nodi DOM e imposta gli stili via CSSOM (verificato nel sorgente di KaTeX 0.19.0: `Object.assign(node.style, …)`), come il player per trasformazioni e token; il sink `renderToString` + `innerHTML` è rimosso. Limite dichiarato: `\pmb` e `\fcolorbox` impostano `style` su nodi MathML con `setAttribute`, bloccato dalla CSP degli export senza effetto visivo; non usati dalle fixture e non provati.

## Ambiente

[Ambiente](distribution-environment.json): macOS 14.8.7 / Darwin 23.6.0 arm64, Apple M3 Max, 64 GiB; Node **24.22.0** e pnpm **12.14.0** da `.tools` (Node globale 25.8.1). Chromium **156.0.8078.4** e Firefox **157.0** con Playwright 1.64.1; WebKit **26.5** con il runner 1.61.1; il CLI usa `playwright-core` **1.64.1** (stesso Chromium). FFmpeg e ffprobe **8.1** (Homebrew, build GPL locale, non distribuita): encoder WebM disponibili libvpx-vp9, libvpx (VP8) e libsvtav1; il CLI sceglie **libvpx-vp9**. Ispezione PDF con **xpdf-tools 4.05** (`pdftotext`, `pdftopng`). Prove locali: la CI non è stata eseguita perché nulla è stato inviato al remoto.

## Avvio e comandi export

```sh
export PATH="$PWD/.tools/node_modules/.bin:$PATH" # solo se Node/pnpm globali non corrispondono
pnpm install --frozen-lockfile
pnpm build
pnpm spatialdeck --help
pnpm spatialdeck validate examples/distribution-static/project.json --json
pnpm spatialdeck build examples/distribution-static/project.json --out site
pnpm spatialdeck export html examples/distribution-static/project.json --out deck.html
pnpm spatialdeck export pdf examples/distribution-static/project.json --itinerary examples/distribution-static/itinerary.json --out deck.pdf
pnpm spatialdeck export video examples/distribution-static/project.json --itinerary examples/distribution-static/itinerary.json --fps 30 --out deck.webm
pnpm check:packages
pnpm dev:studio   # Relatore nella barra; shell offline solo nella build di produzione
```

Ogni comando è stato invocato realmente sulla fixture, dal binario dei sorgenti compilati e dal binario installato dal tarball (suite `distribution.spec.ts`).

## Cambiamenti e file

| Area        | File                                                                                                                                                                                                                | Contenuto                                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core        | `packages/core/src/capture/index.ts` (nuovo), `src/index.ts`, `vite.config.ts`, `package.json`, `README.md`                                                                                                         | Itinerario, piano e campionatore di capture, pianificazione dei frame, `publicDocument`; dipendenze esterne (`gl-matrix`, `ajv` runtime)                      |
| Player      | `src/index.ts`, `src/content/index.ts`, `src/messages.ts`, `src/presenter.ts` e `src/iife.ts` (nuovi), `vite.config.ts`, `vite.iife.config.ts` (nuovo), `package.json`, `README.md`                                 | `renderAt`, `controls`, `delegate`, documento pubblico ai renderer, `ready()`, messaggi inglesi + `italianMessages`, protocollo relatore, build IIFE con note |
| Plugins     | `src/builtins.ts`, `src/rich.ts`, `src/media.ts`, `src/archive.ts`, `src/katex.css` (generato), `vite.config.ts`, `package.json`, `README.md`                                                                       | Renderer su richiesta, `replace`, badge fuori dai builtin, KaTeX via DOM, readiness media, foglio KaTeX woff2, archivio in streaming                          |
| Editor      | `src/index.ts`, `src/components/{Studio,PlayerSurface,icons}.tsx`, `src/components/PresenterView.tsx` (nuovo), `src/style.css`, `vite.config.ts`, `package.json`, `README.md`                                       | API pubblica delimitata, plugin approvati dall’host, Relatore, fullscreen di Presenta, flush prima dell’aggiornamento                                         |
| CLI         | `packages/cli/**` (nuovo)                                                                                                                                                                                           | `spatialdeck` (validate/build/export), IO confinato, profili, assemblaggio, capture, manifest, runtime IIFE, test                                             |
| App         | `apps/studio/{main.tsx,vite.config.ts,package.json}`, `apps/studio/{present.html,present.ts,present.css,shell.ts}` (nuovi), `apps/playground/{main,content,layout}.ts`, `vite.config.ts`                            | Pagina pubblica del relatore, service worker generato, testi italiani espliciti, badge approvato esplicitamente, foglio KaTeX                                 |
| Fixture     | `examples/distribution-static/{project.json,itinerary.json,itinerary-repeat.json,assets/orbit.svg}`                                                                                                                 | Scena canvas, font del tema, formula, immagine locale, track, loop esplicito, note private, payload `</script>`                                               |
| Script e CI | `scripts/{library,check-packages,katex-fonts,package-license}.mjs` (nuovi), `scripts/{generate,check-boundaries}.mjs`, `package.json`, `.github/workflows/ci.yml`, `.gitignore`, `.prettierignore`, `tsconfig.json` | Packaging, note, consumer da tarball, confini del CLI, strumenti di sistema in CI                                                                             |
| Prove       | `packages/core/test/capture.test.ts`, `packages/player/test/player.test.ts`, `packages/plugins/test/{builtins,archive}.test.ts`, `packages/cli/test/cli.test.ts`, `tests/e2e/{distribution,presenter,pwa}.spec.ts`  | Vedi sotto                                                                                                                                                    |
| Documenti   | `docs/DISTRIBUTION.md` (nuovo), README, DEVELOPMENT, PLUGINS, AUTHORING, PROJECT_SPEC (intestazione e sezione 23), ROADMAP (sezioni 12 e 16), questo rapporto e `distribution-*.json`                               | —                                                                                                                                                             |

Manifest portati a 0.6.0. Dipendenze nuove, verificate sul registry: `pdf-lib` **1.17.1** (MIT, 2021) con `@pdf-lib/standard-fonts` e `@pdf-lib/upng` (MIT), `pako` 1.0.11 (MIT AND Zlib), `tslib` 1.14.1 (0BSD), solo nel CLI per unire le pagine PDF; `playwright-core` 1.64.1 (Apache-2.0, già nel lockfile) dipendenza diretta del CLI; `ajv` diventa dipendenza runtime del core (era già incluso nel dist). Tutte compatibili con GPL-3.0-or-later.

## CLI, IO ed exit code

`packages/cli/test/cli.test.ts`, **15 test** (unità, senza browser): help/versione exit 0; comando, opzione, opzione ripetuta, valore mancante, formato, `--lang`, `--fps` invalidi exit 1; JSON e archivio validi, report `--json`, schema storico riportato come `sourceSchemaVersion`; JSON illeggibile, versione 1.4.0 (`UNSUPPORTED_VERSION`) e capacità sottodichiarata exit 1; traversal `../`, `%2e%2e/`, assoluto, backslash, link simbolico al file e directory simbolica intermedia rifiutati; asset mancante, dimensione, digest e firma MIME con il loro codice; nomi con virgolette, spazi, apostrofi e `$(…)` senza shell (nessun file creato); output esistente rifiutato con exit 3 e intatto (anche il manifest affiancato); directory di build sostituita solo se contiene `export-manifest.json`; directory di output mancante e directory in sola lettura con exit 3 e nessun file temporaneo; profilo strict con embed, plugin, `<link>` remoto, `@font-face` remoto e immagine Markdown remota exit 1 e nessun output; audio nel profilo video bloccante; itinerari non adiacenti, edge dopo l’ultima visita, vuoti, path ignoto e oltre il limite di visite exit 1; durata zero exit 1; FFmpeg assente exit 2 e nessun output.

In E2E (`distribution.spec.ts`), dal binario installato dal tarball: FFmpeg che fallisce durante la codifica (script finto con argv) exit 3 con lo stderr del tool e nessun file; Chromium assente (`PLAYWRIGHT_BROWSERS_PATH` vuoto) exit 2 con l’istruzione d’installazione esplicita.

## Packaging e consumer esterno

[Report](distribution-packages.json), da `pnpm check:packages`: **80/80 controlli**. I cinque tarball di `pnpm pack` (core 86 933 B, player 151 474 B, plugins 289 827 B, editor 64 037 B, cli 206 982 B) hanno `license: GPL-3.0-or-later`, description, repository, homepage, keywords, `sideEffects`, `engines`, README e `LICENSE`; le dipendenze interne diventano `0.6.0`, i peer React sono `^19.3.1`. I dist di core e plugins importano `gl-matrix`, `ajv/dist/runtime/*`, `dompurify`, `marked`, `katex`, `fflate` invece di copiarli; un plugin di build fa fallire la libreria se un chunk contiene un modulo di `node_modules`. Le note generate dell’IIFE del player (ajv, fast-deep-equal, gl-matrix) e del runtime degli export (anche dompurify, katex, marked, Atkinson Hyperlegible) iniziano con l’avviso GPL e il link ai sorgenti; la generazione fallisce su licenze mancanti o non compatibili.

Il consumer `test-results/packages/consumer` ha un proprio `pnpm-workspace.yaml` con override verso i tarball, si installa offline dallo store e **non usa alias ai sorgenti**: `tsc` con `skipLibCheck: false` su tutte le API (core, player, plugins, editor con React, CLI con tipi Node) senza diagnostica; `spatialdeck --version` dal tarball.

| Misura (gzip 9)                                    |                                0.5 |                                                                                                            0.6 |
| -------------------------------------------------- | ---------------------------------: | -------------------------------------------------------------------------------------------------------------: |
| Bundle minimo core+player da dist (`check:bundle`) |          64 510 B JS / 1 326 B CSS |                                                        **66 066 B JS / 1 326 B CSS** (limiti 102 400 / 20 480) |
| Consumer minimo da tarball                         |                                  — |                                              **59 529 B JS / 1 667 B CSS**, nessun React/editor/renderer ricco |
| Consumer realistico iniziale (gallery da archivio) | 142 KB JS / 954 KB CSS (audit 0.4) |                                                                                  **65 397 B JS / 9 085 B CSS** |
| Consumer realistico con renderer su richiesta      |                                  — | **169 736 B JS** (104 339 B nei chunk `rich`/`media`), font: 23 file woff2, 309 656 B, scaricati solo se usati |
| Studio, chunk principale                           |     976 KB in un chunk (audit 0.4) |        `main` 346 016 B (108 013 gzip) + condiviso 498 096 B (63 962) + `rich` su richiesta 305 758 B (89 818) |

L’unico `data:` nei CSS del consumer realistico è un woff2 KaTeX sotto il limite di inline del bundler Vite del consumer (4 KiB), un solo formato: nessun font in `data:` triplicato. La soglia del consumer realistico resta da fissare prima della 1.0 (spec sezione 12); qui è misurata.

## HTML autonomo, build ed embed

`distribution.spec.ts`, nei tre motori, con l’HTML prodotto dal CLI del tarball: aperto da `file://` con ogni richiesta `http(s)`/`ws(s)` intercettata, abortita e contata, più l’emulazione offline in Chromium e Firefox (nel runner WebKit di macOS 14 `file://` non si carica con l’emulazione offline attiva, «internal error» riprodotto fuori dalla suite, quindi lì vale il solo blocco delle richieste): **zero richieste** e **zero violazioni CSP** (`securitypolicyviolation`); CSP del `<meta>` con hash dello script e dello stile, `connect-src 'none'`, senza `unsafe-inline`/`unsafe-eval`; formula KaTeX resa, immagine SVG decodificata, font del tema caricato (`document.fonts.check`, `font-family` calcolata), landmark dei frame della scena canvas entro **1 px** dalla proiezione core, ritaglio `overflow: hidden` sul contenuto canvas, navigazione da tastiera e regione live, payload `</script><script>window.pwned=1</script>` reso come testo e mai eseguito, note private assenti da sorgente e DOM, `<noscript>` e `<template>` delle note di licenza presenti. Manifest: `complete`, verifiche eseguite (`jsonBlocksParse`, `cspHashesMatchInlineCode`, `privateNotesAbsent`), font e licenze elencati. Le schermate sono in `test-results/evidence/distribution/<motore>/html/`.

Strict/partial: con iframe, plugin e `<link>` a un font remoto l’export strict esce con 1 elencando `EMBED_REMOTE`, `PLUGIN_UNAVAILABLE`, `REMOTE_RESOURCE` e non scrive nulla; `--allow-partial` scrive un HTML con segnaposto visibili («Content unavailable (embed/plugin)»), nessun `<link>`/`<iframe>`, zero richieste e un manifest `partial` con `warnings` e `unsupported` veritieri.

Build statica servita su HTTP: `index.html`, runtime, CSS, font, `project.json` senza note, asset, note di terze parti e manifest; secondo build senza `--overwrite` exit 3, con `--overwrite` sostituita; richieste solo same-origin, zero violazioni CSP, formula e immagine rese.

Consumer ESM da tarball: due player indipendenti, navigazione e `destroy` senza errori, nessuna richiesta di chunk `rich`/`media` né di React/editor nel consumer minimo; il consumer realistico scarica i chunk `rich` e `media` e solo woff2.

## PDF

Fixture a tre visite (`itinerary.json`) e con visita ripetuta (`itinerary-repeat.json`), nei tre progetti E2E (il CLI usa sempre Chromium): **3 e 4 pagine** 960×540 pt nell’ordine dell’itinerario (manifest `singlePagePrints`, `pageCount`, `allPagesViewportSize`); `pdftotext` estrae il testo vettoriale della prima pagina e, dove presente, il testo di ogni pagina appartiene alla sua visita; nessuna nota; pagine rasterizzate con `pdftopng` e confrontate: visite diverse danno pagine diverse, la visita ripetuta dà la stessa pagina della prima (differenza media < 0,5/255). Ispezione visiva delle quattro pagine: copertina con immagine, testo e formula; scena flow con Markdown e barra SVG; scena figlia ruotata alla posa d’arrivo della track (zoom 1,1, diversa dal fit); copertina ripetuta. Durante lo sviluppo una prima versione con tutte le pagine in un unico documento produceva contenuto spostato e tagliato dalla seconda pagina in poi (bug di frammentazione di Chromium con trasformazioni 3D, riprodotto anche con il solo cambio delle regole di pagina): sostituita dalla stampa per visita.

## Video

Fixture a tre visite con hold 1000 ms, transizione di 800 ms e track cubica di 1000 ms: piano **4800 ms**, **144 frame** a 30 fps; ffprobe: **144 frame letti, 4,800 s, VP9, 1280×720** (scarto 0 ms, limite 33,3 ms); pose registrate (frame 0, intermedio, ultimo e arrivo di ogni visita) uguali a `sampleCapture` entro 1e-6; endpoint del campionatore uguale all’arrivo dell’ultima visita entro 1e-6; matrice resa uguale alla posa del campionatore entro 1e-5 relativo (precisione CSSOM) su ogni frame. Seconda esecuzione nello stesso ambiente: digest di tutti i 144 PNG e pose **identici**. I frame dall’arrivo dell’ultima visita in poi sono la stessa immagine (hold finale visibile); frame 0, 72 e 143 decodificati dal WebM e confrontati con i PNG catturati: differenza media sotto 4/255 (compressione VP9). Ispezione visiva: copertina, metà della transizione verso la scena flow in prospettiva, metà della track con zoom 0,6, scena figlia finale. Il manifest registra quantizzazione, `finalHoldVisible`, riduzione del movimento del piano (`false`) e encoder con licenza.

## Relatore

`presenter.spec.ts` (Studio di produzione, popup reale):

- **Relatore** apre la finestra pubblica sul clic; stato «Finestra pubblica collegata»; note private della scena nella console; scelte del ramo A con due pulsanti; «Esplora B» porta entrambe le finestre su B; frecce sulla console avanti/indietro (D, B); freccia nella finestra pubblica diventa richiesta alla console (D); note assenti dal DOM e dal testo della finestra pubblica; anteprime della console mute; timer Avvia/Pausa (valore fermo)/Azzera.
- Ricarica della finestra pubblica: snapshot con history `["A","C"]` ricostruita; ricarica della console: «Riprendi vista relatore» disabilitato finché il progetto non è riaperto, poi la sessione adotta la stessa finestra pubblica.
- Ignorati: messaggio dalla finestra stessa (sorgente errata), sessione errata, nuova epoca senza snapshot, comando non nel protocollo, finestra pubblica aperta da un’altra origine (resta «in attesa», player non montato).
- Popup bloccato (`window.open` → `null`): istruzioni, **Presenta in questa scheda** apre la presentazione a finestra singola senza note.
- Pagina pubblica aperta da sola: spiega di aprirla dal pulsante Relatore.

Tre difetti trovati dalle prove e corretti: i pulsanti di scelta del player di anteprima della console navigavano senza inoltrare il comando (ora passano da `delegate`); la ripresa dopo un reload inviava un documento vuoto (ora richiede il progetto aperto); in WebKit, dopo il reload della scheda relatore, lo snapshot non arrivava alla finestra pubblica. Diagnosi con un probe nel runner WebKit: l’hello della finestra pubblica arriva con `event.source` che punta alla scheda relatore stessa e un riferimento ottenuto da `event.source` non consegna messaggi, mentre la finestra ritrovata con `window.open("", nome)` li riceve con il mittente corretto. Ora la ripresa ritrova la finestra per nome sul clic e un handshake con nonce casuale (`probe` del relatore, nonce ripetuto dalla finestra pubblica) sostituisce l’identità della sorgente dove il motore la riporta male; 7 test unitari (`presenter.test.ts`) coprono schema, snapshot senza note, sequenze, sorgenti estranee e il caso di sorgente errata.

## Shell offline di Studio

`pwa.spec.ts`: Studio di produzione su un server del test che legge i file a ogni richiesta; worker attivo e pagina controllata; nessun avviso di aggiornamento alla prima installazione; una scena creata solo nell’autosave; una cache di un’altra app; ricarica **offline** con il server del test fermato (origine irraggiungibile, in tutti e tre i motori; l’emulazione offline di Playwright fa fallire il reload in WebKit): shell dalla cache, dialogo di recupero, progetto riaperto da IndexedDB; nuovo deploy (stessi file, nuova cache): il worker si installa e **attende**, compare «Aggiorna e ricarica», due cache SpatialDeck fino al clic; dopo l’aggiornamento una sola cache `…-next`, la cache dell’altra app intatta, il progetto ancora in IndexedDB. Il playground non registra alcun worker. Difetti trovati e corretti: script e CSS `crossorigin` non trovati in cache per `Vary: Origin` (ora `ignoreVary`); il routing di Playwright non intercetta lo script del worker, per cui l’aggiornamento è provato con un vero cambio del file servito.

## Regressioni e difetti trovati

La prima esecuzione delle suite esistenti su Chromium ha trovato, prima di toccare i test: CSS dell’editor e del player spariti dalle build delle app (i nuovi `sideEffects` facevano scartare `src/browser.ts`, che importa il CSS: ora dichiarato), testi inglesi nelle pagine `/content` e `/layout` (fabbriche demo ora italiane come le app), montaggio asincrono anche con modulo già caricato (ora sincrono dopo il primo caricamento). Modifiche ai test esistenti: soltanto quelle del nuovo contratto dei messaggi (`player.test.ts`: default inglesi, set italiano esportato).

## Accessibilità

axe-core 4.14.0 (WCAG 2.0/2.1/2.2 A–AA e best practice) negli audit esistenti, ora con Studio che usa i nuovi pulsanti **Relatore** e la shell offline: **42 audit** nei tre motori, **zero violazioni serious o critical**; resta soltanto la regola moderata `landmark-unique` del playground con due player, già registrata. I nuovi controlli (Relatore come `IconButton` con nome accessibile, console come `region` con stato `role="status"`, timer come `output` etichettato, avviso della shell come `status`) sono usati per ruolo e nome negli E2E. L’audit non copre la finestra pubblica e la console relatore aperte: verifica manuale con screen reader non eseguita.

## Comandi finali

[Comandi ed exit code](distribution-checks.json); log in `.tools/distribution-final/`.

| Comando                          | Exit | Risultato                                                                                                                                      |
| -------------------------------- | ---: | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile` |    0 | lockfile aggiornato solo per `pdf-lib` e gli specificatori dei manifest, poi invariato                                                         |
| `pnpm typecheck`                 |    0 | TS strict, core ES-only, CLI, app, test                                                                                                        |
| `pnpm lint`                      |    0 | ESLint e React hooks                                                                                                                           |
| `pnpm format:check`              |    0 | Prettier; prompt e KaTeX generato esclusi                                                                                                      |
| `pnpm test`                      |    0 | **458 pass**, 25 file, zero fail/skip (410 della baseline + 48 nuove)                                                                          |
| `pnpm test:coverage`             |    0 | soglie invariate e superate; `core/src/capture` 95,1% / 94,8%, `player/src/presenter.ts` 85,1% / 82,9%, totale 91,2% / 83,7%                   |
| `pnpm build`                     |    0 | core, player (ESM, IIFE, font), plugins (ESM, KaTeX woff2), CLI (Node e runtime IIFE), editor, playground, Studio con `present.html` e `sw.js` |
| `pnpm check:boundaries`          |    0 | core/player isolati; CLI e runtime degli export senza editor, React o codice dinamico                                                          |
| `pnpm check:bundle`              |    0 | 66 066 / 1 326 B gzip; font del tema a parte                                                                                                   |
| `pnpm check:packages`            |    0 | 80/80 controlli, consumer da tarball                                                                                                           |
| `pnpm spatialdeck --help`        |    0 | help e profili                                                                                                                                 |
| `pnpm test:e2e` (ultima)         |    0 | **246 pass**: 82 Chromium + 82 Firefox + 82 WebKit (201 regressioni + 45 nuove), zero fail/skip/flaky                                          |
| `git diff --check`               |    0 | whitespace                                                                                                                                     |
| `git status` dopo i controlli    |    — | nessun file tracciato modificato dagli script                                                                                                  |

Le esecuzioni intermedie hanno trovato e fatto correggere, prima dell’ultima: un helper di test che non chiudeva le connessioni keep-alive (timeout del consumer realistico in Chromium); due righe vuote finali in PROJECT_SPEC e ROADMAP (`git diff --check`); in WebKit un avviso «nuova versione» mostrato alla prima installazione della shell, che copriva il pannello del tema (riprodotto 1 volta su 6 ripetizioni, trace con «`#shell-update` intercepts pointer events»; ora l’avviso compare solo se la pagina era già controllata da un worker precedente, con un’asserzione dedicata in `pwa.spec.ts`; poi 48/48 su sei ripetizioni).

## Limiti e debito

- Pubblicazione bloccata dalla proprietà non verificata dello scope npm; `engines.node: ">=24"` provato solo con 24.22.0.
- PDF e video provati con Chromium 156 su macOS 14; WebKit e Firefox aprono HTML e build, ma non sono motori di capture.
- Negli screenshot del runner WebKit headless (Playwright 1.61.1, macOS 14) le scene ruotate in 3D sono dipinte appiattite (per esempio la scena flow ruotata di 25° dell’HTML esportato appare compressa di circa cos²25°), mentre la geometria misurata (`getBoundingClientRect`, landmark entro 1 px) coincide con la proiezione core. Lo stesso aspetto si ottiene con il playground su `/core`: limite preesistente della pittura di quel runner, non introdotto dagli export; le prove WebKit si basano sulla geometria, non sui pixel delle pose 3D. Safari reale non provato. Safari reale, dispositivi mobili e screen reader non provati. La vista relatore non è disponibile in HTML `file://`; nessuna garanzia contro il mirroring del sistema operativo, e la scelta del monitor resta del browser.
- Nel PDF il testo delle scene viste in prospettiva può essere rasterizzato da Chromium; la pagina della visita resta fedele al player.
- Il video non ha audio né media dinamici; H.264 non è offerto; l’identità dei pixel vale solo nello stesso ambiente fissato.
- `readArchive` tiene ancora in memoria l’intero archivio compresso oltre ai Blob; `writeArchive` mantiene i blocchi compressi fino al Blob finale.
- La soglia del consumer realistico è misurata ma non fissata (prima della 1.0). Nessuna CI eseguita.

## Handoff per 1.0

Prerequisiti: decisione/azione del maintainer sull’organizzazione npm prima di qualunque publish; soglia del consumer realistico; prima esecuzione della CI aggiornata (installa `ffmpeg` e `poppler-utils`); prove Safari reale e dispositivi; import essenziale impress.js (fuori da questa fase, non avviato); interfaccia di Studio e documentazione pubblica in inglese. Da riusare: `planCapture`/`renderAt` per regressioni visive, `check:packages` per ogni cambio di manifest, `distribution-static` come fixture degli export.
