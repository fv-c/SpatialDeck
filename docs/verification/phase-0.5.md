# Verifica SpatialDeck 0.5 Impaginazione

22–23 ottobre 2026. Schema **1.3.0** con quattro validatori standalone, tipi derivati e migrazione in copia da 1.0.0/1.1.0/1.2.0. **410 unità + 201 E2E = 611 test passati**, zero fail/skip/flaky nell’ultima suite completa. Fixture e schemi storici invariati su disco. Nessun commit, push, deploy, publish o tag; 0.6 Distribuzione non è avviata.

## Baseline, decisione G0 e perimetro

Stato iniziale: soltanto `?? prompts/`, preservato e non aggiunto all’indice. Letti README, PROJECT_SPEC (sezioni 3, 4, 6, 7, 10, 12, 19, 21), ROADMAP, DEVELOPMENT, AUTHORING, PLUGINS e i rapporti 0.1–0.4.1 prima dei sorgenti. Nessun file AGENTS su disco: valgono il prompt di fase e le istruzioni della chat.

Baseline 0.4.1 misurata prima di cambiare codice: `pnpm typecheck` exit 0, `pnpm test` **322 pass**, `pnpm test:e2e` **162 pass** (108 Chromium/Firefox con Playwright 1.64.1, 54 WebKit con il runner macOS 14 1.61.1), zero fail/skip. Log in `.tools/layout-baseline/`.

**G0 punto 4** è registrato nella specifica, sezione 21: modello 1.3.0 confermato senza modifiche. È stato applicato così com’è; nessuna decisione G0 è stata presa per deduzione. Le decisioni locali (forma dei colori, font incorporato, bordo in canvas, diagnostica, editor) sono nella [specifica, sezione 22](../PROJECT_SPEC.md).

## Ambiente e avvio

[Ambiente](layout-environment.json): macOS 14.8.7 / Darwin 23.6.0 arm64, Apple M3 Max, 64 GiB; Node **24.22.0** e pnpm **12.14.0** da `.tools` (Node globale 25.8.1). Chromium **156.0.8078.4** e Firefox **157.0** con Playwright 1.64.1; WebKit **26.5** con il runner 1.61.1. Prove locali: la CI non è stata eseguita perché nulla è stato inviato al remoto.

```sh
export PATH="$PWD/.tools/node_modules/.bin:$PATH" # solo se Node/pnpm globali non corrispondono
pnpm install --frozen-lockfile
pnpm dev:studio      # http://127.0.0.1:5174, Apri archivio → examples/layout-canvas/layout-canvas.spatialdeck, poi Impagina
pnpm dev:playground  # http://127.0.0.1:5173/layout
```

Avvio reale verificato nel browser: `/layout` del playground di sviluppo con due player, due scene canvas, otto blocchi con frame e immagine risolta; Studio di sviluppo con progetto vuoto 1.3.0, **Impagina** e **Tema del documento**.

## Cambiamenti e file

| Area                   | File                                                                                                                                                                                             | Contenuto                                                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema                 | `packages/core/schema/project-1.3.0.schema.json` (nuovo), `scripts/generate.mjs`, `packages/core/src/document/{types.ts,validator.js,validator.d.ts}` (generati)                                 | Tema, aspetto della scena, `layout`, `frame`/`style` su tutti i blocchi; quattro validatori con `inlineRefs: false`; tipi da 1.3.0                                                     |
| Semantica e migrazione | `packages/core/src/document/{index.ts,layout.ts,structure.ts}`                                                                                                                                   | Dispatcher 1.0.0–1.3.0, migrazione 1.2.0→1.3.0, `validateLayout`, `usesLayout`, `defaultTheme`, `defaultAppearance`, `NON_FINITE_NUMBER` con pointer, `layout` in `updateCapabilities` |
| Geometria              | `packages/core/src/layout/index.ts` (nuovo)                                                                                                                                                      | Frame↔scena, angoli/ingombri/intersezioni, sposta/ridimensiona/ruota, allinea/distribuisci/livelli, proiezione e proiezione inversa dei punti della scena, contrasto                   |
| Player                 | `packages/player/src/{index.ts,style.css,fonts.css}`, `scripts/player-fonts.mjs`, `packages/player/package.json`                                                                                 | Canvas, ritaglio, tema via proprietà personalizzate, aspetto, token di stile, titolo nascosto come nome accessibile; font del tema separati con licenza                                |
| Studio                 | `packages/editor/src/components/{LayoutEditor,LayoutPanel,ThemePanel}.tsx` (nuovi), `Studio.tsx`, `PlayerSurface.tsx`, `ContentPanel.tsx`, `commands/index.ts`, `store/index.ts`, `style.css`    | Modalità Impagina, gesti, frecce, campi numerici, allinea/distribuisci, griglia, livelli, ordine di lettura, conversioni, aspetto, stile, tema, diagnostica                            |
| Esempio                | `examples/layout-canvas/{project.json,layout-canvas.spatialdeck,assets/skyline.svg,LICENSE.md}`, `apps/playground/{layout.ts,main.ts,vite.config.ts}`, `apps/studio/{main.tsx,vite.config.ts}`   | Esempio di fase, route `/layout` con apertura di progetti salvati da Studio, import dei font                                                                                           |
| Prove                  | `packages/core/test/{layout,frame}.test.ts`, `packages/player/test/layout.test.ts`, `tests/e2e/layout.spec.ts` (nuovi), `tests/e2e/a11y.spec.ts`, `scripts/{flow-identity.mjs,check-bundle.mjs}` | Vedi sotto                                                                                                                                                                             |
| Documenti              | README, AUTHORING, DEVELOPMENT, PLUGINS, PROJECT_SPEC (sezione 22 e riga FontId), ROADMAP (sezioni 12 e 15), questo rapporto e `layout-*.json`                                                   | —                                                                                                                                                                                      |

Manifest portati a 0.5.0; core esporta `@spatialdeck/core/schema/1.3.0` e `schema` punta a 1.3.0; player esporta `@spatialdeck/player/fonts.css`.

## Schema, migrazione e capacità

- `validateDocument`/`migrateDocument` accettano 1.0.0–1.3.0 e restituiscono una copia 1.3.0. 1.2.0→1.3.0 aggiunge il tema predefinito (testo `#172035`, sfondo `#ffffff`, accento `#215baf`, fondale `#e8edf4`, `system-sans`, corpo 28, titolo 46), `layout:"flow"` e `appearance:{variant:"card",background:null,titleVisible:true}`; blocchi invariati. Una versione 1.4.0 è rifiutata con `UNSUPPORTED_VERSION`.
- `layout` è calcolata da `updateCapabilities` e richiesta solo quando usata (canvas, `style`, aspetto o tema diversi dal predefinito, confronto indipendente dall’ordine delle chiavi); la migrazione non la attiva mai: verificato sulle quattro fixture storiche.
- Rifiutati con code e pointer (test `layout.test.ts`): frame assente in canvas (`FRAME_REQUIRED`) o presente in flow (`FRAME_IN_FLOW`), oltre larghezza o altezza (`FRAME_OUTSIDE`), origine negativa, `NaN`/`Infinity` (`NON_FINITE_NUMBER`), larghezza < 8, rotazione oltre 360, `z` non intero o fuori intervallo, colori di blocco/sfondi/ruoli non in palette (`UNKNOWN_PALETTE_COLOR`), FontId ignoto, palette duplicata (`DUPLICATE_ID`), vuota o oltre 32, scala tipografica fuori intervallo o non intera, colori non `#rrggbb` (maiuscolo, `#fff`, nomi, `rgb()`, `var()`, iniezioni), qualunque stringa CSS al posto di un token, campi `style`/`className`/`css` non previsti, unità nei frame.
- Catena 1.0.0→1.3.0 senza perdita di testi, note, estensioni opache di documento e scena, dati e impostazioni plugin; idempotenza su 1.3.0; byte delle fixture su disco identici prima e dopo. Roundtrip deterministico di un documento canvas.

## Geometria condivisa

Le funzioni del core sono le uniche a calcolare posizioni: il player applica `frameMatrix` agli host, l’editor proietta maniglie e cornici con `projectScenePoint` e converte il puntatore con `unprojectScenePoint`. Test numerici (`frame.test.ts`): frame→scena→frame entro 1e-9 su 500 frame casuali deterministici, angoli e ingombri di frame ruotati, intersezioni con quasi-contatto ruotato, lato opposto fermo in tutte e otto le maniglie su frame ruotato, arresto al bordo per frame non ruotati, rotazione relativa e a passi, allinea/distribuisci/livelli, proiezione frontale con margine 0.9 e andata/ritorno entro 1e-6 su scene ruotate e annidate con camere qualsiasi, punti sul o dietro il piano prospettico e piani visti di taglio rifiutati.

## Prove di identità della resa flow

[Dettaglio](layout-identity.json). `scripts/flow-identity.mjs` ha confrontato la build del playground del commit `b9ee503` (0.4.1, schema 1.2.0, worktree temporaneo poi rimosso) con questo albero: ogni nodo del percorso predefinito di `/core` (1.0.0), `/structure` (1.1.0) e `/content` (1.2.0) a 1440×1000, DPR 1, movimento ridotto.

| Motore       | Viste | Identiche | Pixel diversi (max) | Geometria |
| ------------ | ----: | --------: | ------------------: | --------- |
| Chromium 156 |    18 |        18 |                   0 | identica  |
| Firefox 157  |    18 |        18 |                   0 | identica  |
| WebKit 26.5  |    18 |        18 |                   0 | identica  |

Soglia motivata: zero pixel diversi fuori dagli elementi `<video>`/`<audio>`, mascherati perché lo spinner nativo e il fotogramma decodificato variano fra due caricamenti della stessa build (osservato nella prima esecuzione: differenze soltanto nello spinner del video in Chromium e nei controlli audio in Firefox); i loro riquadri restano nel confronto di geometria. La stessa garanzia è ora nella suite, senza seconda build: l’E2E «migrated historical documents keep the 1.2.0 flow rendering tokens and markup» verifica sui tre motori stili calcolati 1.2.0 (padding 48, bordo 3 px `#215baf`, sfondo bianco, testo `#172035`, 28/46 px, `system-ui`, fondale `#e8edf4`) e assenza di classi o attributi `style` nuovi sui blocchi; il test jsdom del player verifica lo stesso DOM.

## Landmark, ritaglio, livelli, ordine e tema nel player

[Landmark](layout-landmarks.json): angoli e centro di ogni frame delle scene canvas `cover` (radice) e `details` (figlia ruotata 10/−15/4, scala 0.8), con camera di fit e camera obliqua: 80 punti per motore, errore massimo 0,00012 px (Chromium), 0,012 px (Firefox), 0,00004 px (WebKit), soglia 1 px. Stessa prova dopo salvataggio e riapertura: presentazione di Studio e player vanilla entro 0,011 px.

Sui tre motori: ritaglio sul wrapper di contenuto (`overflow: hidden`), wrapper spaziale ancora `preserve-3d` senza overflow, angolo ruotato fuori scena non colpibile e interno sì; sovrapposizione secondo `z` (il timbro copre l’immagine, abbassato a −1 no); DOM e Tab nell’ordine dell’array con livelli e posizioni invertiti (WebKit con Opzione+Tab, come Safari per pulsanti e link); titolo nascosto non visibile (riquadro ≤ 1 px), nome accessibile dell’`article` e primo testo della vista testuale. Con una CSP senza `unsafe-inline` per stili e script (`style-src 'self'`) tema e token sono applicati (sfondo `#fffaf0`, testo `#1b1f3b`, titolo `#9a3412` a 57,2 px, fondale `#1e293b`, accento nell’ombra del bordo) con **zero violazioni CSP**. Immagini e video riempiono il frame (immagine coincidente con l’host entro 1 px e `object-fit` del blocco; video a tutta larghezza, oltre metà altezza, pulsante dentro il frame).

## Studio

`tests/e2e/layout.spec.ts`, sui tre motori:

- **Gesti**: spostamento, ridimensionamento dall’angolo sud-ovest con angolo nord-est fermo, rotazione di 90° con Maiusc: un comando ciascuno; Annulla ripristina il frame esatto; Escape durante il drag ripristina senza comandi né stato di trascinamento residuo; frecce 1 px e Maiusc 10 px, un comando per pressione; frecce su maniglia e su rotazione; campi numerici, valore invalido rifiutato con errore associato; preview con la matrice core del frame.
- **Allinea/distribuisci/livelli/ordine**: allinea a sinistra sugli ingombri ruotati, distribuzione con spazi uguali, In primo piano (z 5) verificato con `elementsFromPoint` nella preview, ordine di lettura che cambia array e DOM senza toccare frame o z.
- **Conversioni**: Converti in canvas su una scena flow, un comando, rettangoli dei blocchi invariati entro 1,5 px di scena; Torna a flow con dialogo che nomina la perdita, Annulla del dialogo senza effetti, conferma che rimuove i frame, Annulla dei comandi che li ripristina.
- **Tema, aspetto, stile, diagnostica**: font del testo, ruolo colore con avviso di contrasto nel pannello e nel tema, variante semplice e titolo visibile, dimensione XS sul blocco; testo tagliato diagnosticato riducendo l’altezza; frame con z maggiore sopra il link diagnosticato come copertura di controlli.
- **Salvataggio e riapertura**: modifiche numeriche, Salva JSON e Salva archivio, JSON identico al modello; recupero dopo reload con modifica non salvata; nuova sessione che riapre JSON e archivio con modello identico; presentazione di Studio e player vanilla (**Apri progetto locale**) con modello e landmark identici.
- **Tastiera e viewport**: a 1440×900 e 768×1024 cornici allineate ai blocchi entro 1 px; Impagina, selezione, frecce, Tab verso le maniglie con focus visibile, ridimensionamento e rotazione da tastiera; Canc nell’editor non apre l’eliminazione della scena; Escape deseleziona; annunci nella regione live.

La prova manuale nel browser integrato ha trovato un difetto, corretto prima delle prove automatiche: in Impagina la colonna centrale sticky superava l’altezza della finestra e il fondo della preview non era raggiungibile; ora la mappa si riduce durante l’impaginazione. Le prove E2E hanno inoltre portato a correggere: ridimensionamento vicino al bordo che traslava il frame (ora il lato mobile si ferma), conversione misurata prima che la preview inquadrasse la scena (ora rifiutata con messaggio), maniglie non raggiungibili con Tab in WebKit (`tabIndex={0}` come gli altri pulsanti di Studio), maniglie di 18 px e coperte dai frame successivi (axe `target-size`: ora 24 px e sopra i frame).

## Accessibilità

[Esiti axe](layout-axe.json) (axe-core 4.14.0, WCAG 2.0/2.1/2.2 A–AA e best practice) su `/layout` con e senza vista testuale e su Studio in Impagina con selezione e con il pannello Tema, nei tre motori, oltre agli audit esistenti: **zero violazioni serious o critical**. Restano le due moderate già registrate in 0.4.1: `landmark-unique` (due player dello stesso documento) e `page-has-heading-one` in Studio. Ordine di lettura indipendente da `z` provato con DOM, Tab e vista testuale; alternativa numerica a ogni trascinamento; contrasto diagnosticato. Axe non equivale a una prova con screen reader.

## Prestazioni e bundle

[Misure](layout-perf.json): una scena canvas con 30 blocchi (5 ruotati), 100 gesti alternati di spostamento e ridimensionamento, 300 campioni input→preview per motore, Studio di produzione.

| Motore       | p50 ms | p95 ms | max ms | Comandi per 100 gesti |
| ------------ | -----: | -----: | -----: | --------------------: |
| Chromium 156 |    3,4 |    4,2 |    5,4 |                   100 |
| Firefox 157  |      4 |      5 |     10 |                   100 |
| WebKit 26.5  |     12 |     21 |     28 |                   100 |

Budget p95 ≤ 100 ms rispettato in locale nei tre motori; trace Chromium in `test-results/evidence/layout/perf-trace-chromium.json` (non tracciato per dimensione). Runner locale non controllato: tempi informativi, il test asserisce il budget soltanto senza `CI`; il conteggio dei comandi è il gate stabile.

[Bundle minimo](layout-bundle.json): **64 510 B JS / 1 326 B CSS gzip** (0.4.1: 48 929 / 932), limiti 102 400 / 20 480 B, React/editor/DOMPurify/marked/KaTeX/fflate assenti. L’aumento JS viene quasi tutto dal quarto validatore standalone (1.3.0): con `inlineRefs: true` sarebbe stato 68 189 B, quindi il generatore non duplica più il codice dei riferimenti. Font del tema misurati a parte: `fonts.css` 625 B gzip e quattro woff2 per 53 488 B, scaricati soltanto se usati; `check:bundle` fallisce se un `@font-face` entra nel CSS minimo.

## Licenze dei font

Atkinson Hyperlegible, `@fontsource/atkinson-hyperlegible` **5.3.0** (rilascio 2026-07-19, integrità nel lockfile), dipendenza esatta del player: Copyright 2020 Braille Institute of America, Inc., **SIL Open Font License 1.1**, verificata nel file `LICENSE` del pacchetto e nel campo `license: OFL-1.1`. Il font resta un file separato con la propria licenza accanto, non incorporato nel codice del player; l’OFL ne consente la ridistribuzione insieme al software a condizione di conservare licenza e copyright e di non venderlo da solo. La build del player copia i woff2 e `OFL.txt` in `dist/fonts/`; nessuna CDN e nessun `data:`. I font di sistema non vengono distribuiti. Le risorse dell’esempio sono originali e dedicate CC0 (`examples/layout-canvas/LICENSE.md`).

## Comandi finali

[Comandi ed exit code](layout-checks.json); log in `.tools/layout-final/`.

| Comando                          | Exit | Risultato                                                                                                                      |
| -------------------------------- | ---: | ------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm install --frozen-lockfile` |    0 | lockfile invariato dopo l’aggiunta della dipendenza font                                                                       |
| `pnpm typecheck`                 |    0 | TS strict, core ES-only, app, test e `@ts-expect-error` sui token                                                              |
| `pnpm lint`                      |    0 | ESLint e React hooks                                                                                                           |
| `pnpm format:check`              |    0 | Prettier; prompt esclusi                                                                                                       |
| `pnpm test`                      |    0 | **410 pass**, 21 file, zero fail/skip (322 della baseline + 88 nuove)                                                          |
| `pnpm test:coverage`             |    0 | soglie 0.4.1 invariate e superate; core 95,54% / 90,81%, `core/src/layout` 98,26% / 91,66% ([dettaglio](layout-coverage.json)) |
| `pnpm build`                     |    0 | core/player (con font)/plugins/editor e due app production                                                                     |
| `pnpm check:boundaries`          |    0 | core/player isolati, plugin opzionali                                                                                          |
| `pnpm check:bundle`              |    0 | 64 510 / 1 326 B gzip; font del tema a parte                                                                                   |
| `pnpm test:e2e`                  |    0 | **201 pass**: 67 Chromium + 67 Firefox + 67 WebKit (162 regressioni + 39 nuove), zero fail/skip/flaky                          |
| `git diff --check`               |    0 | whitespace                                                                                                                     |
| `git status` dopo i controlli    |    — | nessun file tracciato modificato dagli script                                                                                  |

La prima esecuzione finale ha trovato due errori, corretti e rieseguiti: un `let` da rendere `const` nello spec E2E e un E2E storico di 0.3 che usava 1.3.0 come «versione futura».

## Modifiche ai test esistenti

Solo adeguamenti al nuovo contratto, nessun test rimosso o reso facoltativo: le asserzioni della versione corrente passano da 1.2.0 a 1.3.0 (unità core, editor e E2E di editor e struttura), le prove di versione futura da 1.3.0 a 1.4.0, il test dello schema 1.2.0 convalida la fixture 1.2.0 originale e la copia migrata contro 1.3.0, l’atteso della migrazione 1.1.0 include tema, `layout` e aspetto. axe copre anche `/layout` e Studio in Impagina.

## Limiti e debito

- Prove locali su un solo computer non controllato; CI aggiornata da osservare al primo push del maintainer. WebKit è il runner Playwright per macOS 14, non Safari; nessuna prova su dispositivi touch o con screen reader.
- La prova pixel contro 0.4.1 non è nella suite perché richiede una seconda build; la suite contiene il controllo di stili e DOM equivalente. I media nativi sono esclusi dal confronto pixel, non dalla geometria.
- Le diagnostiche di testo tagliato e di copertura dei controlli misurano la preview di Studio e si aggiornano dopo ogni aggiornamento della preview e al caricamento dei font; il contrasto dipende solo dalla palette e non considera immagini sotto il testo.
- Nelle scene canvas la vista spaziale non riflue a 320 px: il riflusso è affidato alla vista testuale, come da specifica. Le maniglie misurano 24 px; su frame molto piccoli a schermo si avvicinano tra loro, e i campi numerici restano l’alternativa equivalente.
- Un consumer della dist che non importa `@spatialdeck/player/fonts.css` mostra la pila di sistema al posto di Atkinson Hyperlegible, senza diagnostica.
- Il bundle minimo cresce di circa 15,6 KB gzip per il quarto validatore; resta al 63% del budget.
- Fuori perimetro come da prompt: gruppi, modelli o master di scena, animazioni per elemento, editing WYSIWYG, CSS libero, font remoti, gizmo 3D, guide magnetiche avanzate.

## Handoff per 0.6

Modello 1.3.0 da congelare: gli export devono riprodurre canvas, tema e font con lo stesso player, includere `fonts.css` e i woff2 con `OFL.txt` nel manifest e nelle note di terze parti, e provare la CSP anche con le proprietà personalizzate del tema (CSSOM, senza `unsafe-inline`). Da riusare: `projectScenePoint`/`frameToScene` per landmark ed export PDF, `scripts/flow-identity.mjs` per le regressioni visive, il test prestazionale come base per il consumer realistico. Prerequisiti G0 punti 1–2 già decisi; la proprietà dello scope npm va verificata in 0.6. Nessuna voce 0.5 è rinviata.

## Revisione dell’interfaccia di Studio — 23 ottobre 2026

Dopo il commit 0.5, su richiesta del maintainer («look amatoriale, troppi pulsanti con etichette, troppo spazio per poche funzioni»), l’interfaccia di Studio è stata riprogettata senza cambiare documento, comandi o comportamento. Schermate prima/dopo a 1440, 1280, 768 e 390 px in `test-results/evidence/ui/` (non tracciate).

- Barra unica di 48 px con titolo del progetto modificabile sul posto e comandi come icone con descrizione (Nuovo, Apri, Salva, Salva archivio, Annulla, Ripristina, Recupero, Anteprima) più **Presenta**; «Apri JSON» e «Apri archivio», che aprivano lo stesso selettore, sono un solo **Apri**.
- Pannello scene con azioni come icone nell’intestazione, righe compatte con tipo di impaginazione, invito **Crea la prima scena** nel progetto vuoto, pulsanti stilizzati al posto degli input file nativi e risorse con stato a etichetta.
- Inspector a sezioni con intestazioni uniformi, griglie di proprietà ed etichette brevi visibili contenute nel nome accessibile completo; pannello Impaginazione con barre di icone per allinea/distribuisci e livelli/griglia, gruppi segmentati per l’allineamento del testo, interruttore per il titolo, ordine di lettura con estratto del contenuto; tema con palette a campioni.
- Token di stile unici (corpo 13 px, controlli da 28 px, una tinta d’accento, contorni dei campi a 3:1); gli stili degli elementi non raggiungono il DOM del player, quindi la preview resta identica alla presentazione.

Nomi accessibili invariati, salvo tre rinomine aggiornate nei test: «Presenta ↗» → «Presenta», «+ Nuova scena» → «Nuova scena», «Apri JSON» → «Apri». Le prove hanno trovato e fatto correggere due difetti: righe dell’ordine di lettura e intestazione dell’inspector che allargavano la colonna a 1280 px, e ridimensionamento che portava il lato sotto il puntatore invece di seguirne lo spostamento dal punto di presa (salto fino a metà maniglia). Suite completa dopo la revisione: tutti i comandi exit 0, **410 unità + 201 E2E** passati (67 per motore), axe senza violazioni serious o critical, bundle minimo invariato (64 510 / 1 326 B gzip). Log in `.tools/ui-final/`. In seguito il nome del prodotto nella barra è diventato l’`h1` della pagina: la violazione moderata `page-has-heading-one` registrata da 0.4.1 è chiusa e gli audit di Studio (vuoto, con contenuti, dialogo, presentazione, Impagina, tema) non hanno più alcuna violazione nei tre motori; `a11y.spec.ts` ed `editor.spec.ts` rieseguiti dopo la modifica: 54 passati. Resta solo `landmark-unique` (moderata) nel playground con due player.
