# Verifica SpatialDeck 0.1 Core

Data: 21 ottobre 2026. Codice 0.1 implementato; **WebKit locale sbloccato con il runner dedicato 1.61.1 per macOS 14**. La suite completa passa sui tre motori senza skip. Il runner principale e la CI Linux mantengono Playwright 1.64.1; la [CI remota è passata](https://github.com/fv-c/SpatialDeck/actions/runs/39596586324) con 85 unità e 30 E2E, zero skip. Safari reale non è stato eseguito. Nessuna fase 0.2 avviata.

## Stato iniziale e perimetro

Checkout iniziale: LICENSE, PROJECT_SPEC e ROADMAP tracciati; `prompts/` già presente e non tracciato. Nessun sorgente applicativo. Nessun AGENTS su disco nei percorsi applicabili; applicate le istruzioni AGENTS fornite nella chat. Specifica e roadmap lette prima dei sorgenti; LICENSE e prompt preservati. Tutti i path proposti per 0.1 sono ora reali. Differenze additive: entrypoint `player/src/browser.ts` per raccogliere CSS in build senza import CSS nelle dichiarazioni pubbliche; generatori e controlli nella directory `scripts`; prove riproducibili e artefatti sotto `docs/verification`.

Implementati i pacchetti applicativi core, player e playground e il solo workspace di tooling privato `tools/webkit-macos14`. Nessun editor/React, parent/grafo/timeline, blocco oltre text, media/plugin concreto, CLI/import/export o servizio remoto. Manifest privati: SPDX GPL-only/or-later non inventato dal solo testo della licenza. Commit e push successivamente autorizzati ed eseguiti sul commit `07916cc`; nessun tag, deploy o publish.

## Ambiente riproducibile

Apple M3 Max, 16 CPU logiche, 64 GiB RAM, macOS 14.8.7 (Darwin 23.6.0), arm64. Node locale 24.22.0, pnpm 12.14.0. La macchina inizialmente esponeva Node 25.8.1 e pnpm 11.25.0: installati i pin nella directory ignorata `.tools`, senza cambiare installazioni globali.

[environment.json](environment.json) registra tutti i pin, engines/peer dal registry npm (HTTP 200), hash SHA256 del lockfile e versioni browser effettive. Il pin principale 1.64.1 è invariato; è aggiunta la sola eccezione autorizzata 1.61.1 per WebKit su macOS 14, con workspace e lockfile dedicati. Nessun peer forzato. Il JSON conserva anche l'hash del lockfile iniziale. pnpm ha registrato la sola eccezione release-age `vite@8.3.5`. Installazione frozen riuscita.

Browser effettivi: Chromium 156.0.8078.4 e Firefox 157.0 con runner 1.64.1; WebKit riporta 26.5 con runner 1.61.1. Il precedente valore WebKit 27.2 proveniva dai metadati del runner 1.64.1 che non arrivava a newPage: non era una prova runtime. Il campo `compatibility` di [environment.json](environment.json) registra runner, versione riportata, user agent, hash della suite condivisa e 10 pass/0 fail/0 skip.

Il problema `Unknown setting: PushAPIEnabled` è documentato nella [issue Playwright #42964](https://github.com/microsoft/playwright/issues/42964). La configurazione approvata mantiene la 1.64.1 per il prodotto e la CI Linux, usando la 1.61.1 soltanto per il WebKit congelato di macOS 14. La prima installazione aveva richiesto fallback CDN per errori DNS del mirror Microsoft; l'installazione ora selezionata dal launcher passa con i browser presenti. Il log storico e la risoluzione sono in [webkit-blocker.txt](webkit-blocker.txt).

## Installazione, avvio e API

```sh
npm install --prefix .tools --no-package-lock --no-save node@24.22.0 pnpm@12.14.0
export PATH="$PWD/.tools/node_modules/.bin:$PATH"
pnpm install --frozen-lockfile
pnpm browsers:install
pnpm dev:playground
```

Aprire `/core`. Avvio Vite vanilla verificato; la prima suite browser è stata eseguita sul dev server. Le suite finali avviano `vite preview` sulla build production. Il consumer base non richiede rete esterna a runtime; provato anche con CSP senza unsafe-eval.

[README](../../README.md) e [DEVELOPMENT](../DEVELOPMENT.md) documentano l'uso vanilla, CSS pubblico, Result/NavigationResult, opzioni, eventi, clock, lifecycle e confini. `pnpm test:e2e` include la build prima del browser. `pnpm browsers:install` installa i browser dal runner appropriato al sistema, senza dipendere dalla prova temporanea sotto `.tools`.

## Runner dedicato e CI Linux

- Root: `@playwright/test@1.64.1`, configurazione `playwright.config.ts`.
- Compatibilità: `tools/webkit-macos14/package.json` fissa `@playwright/test@1.61.1`, configurazione WebKit dedicata. Il comando rifiuta sistemi diversi da macOS 14.
- Suite unica: `tests/e2e/core.spec.ts` carica test/expect tramite l'adapter che verifica il pin selezionato; nessuna copia dei test, nessuno skip.
- `pnpm test:e2e` su questo Mac esegue Chromium/Firefox con 1.64.1 e WebKit con 1.61.1. `pnpm test:e2e:webkit:macos14` esegue soltanto i 10 WebKit; `--project=webkit` è disponibile anche sul comando generale.
- In Linux il launcher sceglie unicamente la 1.64.1 per Chromium/Firefox/WebKit. Il workflow installa tutti e tre e avvia `pnpm test:e2e`; 12 test di instradamento verificano anche questa scelta; il successivo run remoto ha confermato 30 E2E passati su Linux.
- JSON/trace isolati in `test-results/current/` e `test-results/webkit-macos14/`; riepilogo della singola invocazione in `test-results/e2e-summary.json`. L'ultimo comando dedicato può sovrascrivere il riepilogo locale, mentre l'evidenza permanente sotto conserva la precedente suite completa.

La baseline applicativa e il bundle core/player sono invariati; gli screenshot locali restano conservati. Non sono state modificate dipendenze di produzione o installazioni globali.

## Comandi ed esiti finali

I comandi sono stati eseguiti con il PATH locale sopra indicato. Gli esiti correnti non contano gli skip del tentativo storico come test passati.

| Comando                                                               | Exit | Evidenza                                                                                          |
| --------------------------------------------------------------------- | ---: | ------------------------------------------------------------------------------------------------- |
| `pnpm install`                                                        |    0 | 5 workspace; nuovo runner 1.61.1 fissato nel lockfile, peer strict                                |
| `pnpm install --frozen-lockfile`                                      |    0 | Nessuna modifica del lockfile dopo l'installazione                                                |
| `pnpm typecheck`                                                      |    0 | Include anche configurazioni e adapter dei due runner                                             |
| `pnpm lint`                                                           |    0 | ESLint 10 + typescript-eslint                                                                     |
| `pnpm format:check`                                                   |    0 | Nuovi file formattati; prompt e documenti normativi storici esclusi dalle riscritture automatiche |
| `pnpm test`                                                           |    0 | **85 passed, 0 failed, 0 skipped**: 73 core + 12 instradamento runner, 4 file Vitest              |
| `pnpm build`                                                          |    0 | ESM/dichiarazioni e playground production; eseguita anche dai due comandi E2E                     |
| `pnpm check:boundaries`                                               |    0 | 2 pacchetti runtime; tooling escluso dal prodotto                                                 |
| `pnpm check:bundle`                                                   |    0 | JS/CSS identici alla misura precedente                                                            |
| `pnpm browsers:install`                                               |    0 | Su macOS 14 seleziona Chromium/Firefox 1.64.1 e WebKit 1.61.1                                     |
| `pnpm exec playwright --version`                                      |    0 | Runner root 1.64.1                                                                                |
| `pnpm --filter @spatialdeck/webkit-macos14 exec playwright --version` |    0 | Runner isolato 1.61.1                                                                             |
| `pnpm test:e2e`                                                       |    0 | **30 passed, 0 failed, 0 skipped**: Chromium 10 + Firefox 10 (1.64.1), WebKit 10 (1.61.1)         |
| `pnpm test:e2e:webkit:macos14`                                        |    0 | **10 passed, 0 failed, 0 skipped**; ripetizione mirata, non sommata al totale                     |
| `git diff --check`                                                    |    0 | Whitespace dei file tracciati modificati                                                          |

Totale corrente: **115 test passati**, zero fail/skip (85 unità + 30 E2E). [e2e-results.json](e2e-results.json) conserva esiti, versione e profilo per ogni test della suite completa. Le misure precedenti di 93 pass/10 skip e il primo fallimento WebKit sono storiche; il runner dedicato ora dimostra anche le 10 prove WebKit sul prodotto reale.

## Verifica remota Linux dopo commit e push

Implementazione pubblicata su `origin/main` con commit `07916ccaf27cf7e6d210ac5d1f4ef8cc8d1e2901`. Il workflow [Core, run 39596586324](https://github.com/fv-c/SpatialDeck/actions/runs/39596586324) è concluso con **success** su Ubuntu 26.04.1, Node 24.22.0, pnpm 12.14.0 e Playwright **1.64.1**.

Tutti gli step sono passati: frozen install, typecheck, lint, format, 85 unità, build, confini/bundle, installazione dei tre browser e suite E2E production. Risultato browser: **Chromium 10/10, Firefox 10/10, WebKit 10/10; zero fail, skip o flaky**. Il riepilogo scaricato dall'artefatto conferma `platform: linux`, un solo profilo `current`, versione `1.64.1` e tre progetti. Le 85 unità più i 30 E2E costituiscono **115 test passati in CI**, distinti dai 115 pass locali.

Evidenza permanente: [ci-linux.json](ci-linux.json), con SHA, run/job/artifact ID, digest dell'archivio, riepilogo originale e ogni test E2E. L'artefatto `verification` è stato scaricato tramite il connettore GitHub e controllato; non è una deduzione dal solo badge verde. I report locali in `e2e-results.json` restano separati. Il bundle Linux coincide con quello locale: 17 823 byte JS e 662 byte CSS gzip.

L'hook locale `.git/hooks/pre-commit` mantiene `prompts/` fuori dai commit e visibile nel checkout: i sei prompt locali sono rimasti intatti e non pubblicati. `.tools`, dipendenze e output di build restano ignorati. Il successivo commit di documentazione registra questa verifica dell'implementazione `07916cc`; non cambia il codice già provato.

Errori riscontrati e corretti prima del risultato finale: dichiarazioni ES-only delle API standard nel core; lint del controllo caratteri asset; import CSS nelle dichiarazioni pubbliche; misura CSS del consumer minimo; annullamento rientrante da handler; focus nel passaggio tra due titoli e durante la modifica di un input. Il primo tentativo WebKit era stato interrotto (130) dopo tre errori identici; lo skip provvisorio è ora rimosso. È stato corretto anche il tipo del parametro `args` nel nuovo helper JS durante il typecheck, prima degli esiti finali. Il runner dedicato risolve il blocco locale senza modificare Playwright o le prove applicative.

## Funzionalità dimostrate

Schema normativo 2020-12 materializzato e schema/tipi derivati da un'unica fonte. JSON malformato, versioni future, capacità/campi non supportati, ID duplicati, riferimenti mancanti, target invisibili, branching/cicli/disconnessioni, scale invalide e numeri non finiti sono rifiutati senza mutazioni. Limiti byte/profondità e asset sicuri verificati, inclusi percent encoding ripetuto, backslash, traversal, totale cumulativo, accessor e input non JSON. Serializer deterministico e roundtrip delle estensioni opache. Documento/path vuoto e assenza di default validi.

Geometria: colonne column-major, pixel CSS, X destra/Y basso/Z osservatore, pivot centrale, `M=T*Rz*Ry*Rx*S`; camera piano di riferimento `V=S(zoom)*inverse(C)`. Prospettiva una sola volta nel viewport; contain esterno. Fit `0.9 * min(vw/w,vh/h)/scale`. Rotazione via quaternion normalizzato, slerp arco breve compreso q/-q, zoom in log-spazio, easing smoothstep una sola volta. Matrici identità/traslazione/tre assi/scala/ordine e inversione hanno attesi indipendenti. Proiezione browser di tre landmark per ciascuna scena verificata entro 1 CSS px su tutti e tre i motori locali, con i due runner dichiarati.

Navigazione latest-wins, dieci richieste ravvicinate, abort, comandi invalidi e noop non distruttivi, setPath valido/vuoto/assente, cambio percorso e prev sulla history effettiva. Commit solo all'arrivo, niente history fantasma, Promise/eventi esattamente una volta, durata zero e ordine eventi. Tempo hidden congelato con clock controllato; cambio prefers-reduced-motion verificato anche in browser. Handler che lanciano non interrompono il player; callback rientranti non lasciano Promise sospese.

Due istanze indipendenti, tastiera locale, campi di testo e focus verificati. Focus non rubato dal mount o durante la scrittura. Outline ordinato e leggibile, navigazione immediata, contenuti spaziali duplicati esclusi dall'accessibilità; fallback funzionante senza CSS 3D. Testo ostile reso letteralmente, nessun elemento HTML eseguito. CSP senza unsafe-eval e nessuna richiesta remota obbligatoria.

Teardown strumentato in ciascun browser disponibile: **50 cicli mount/destroy, 50 pending cancelled, 50 eventi destroy; 0 listener, 0 RAF, 0 ResizeObserver posseduti residui**. Destroy ripetuto e comandi successivi non ricreano risorse; nodi host e tabindex preesistente preservati. Nessun Blob URL o media è creato da questa fase.

## Screenshot ispezionati

Screenshot reali Chromium della build production con preset Desktop Chrome (viewport 1280×720), ritaglio del primo player. Ispezione visiva eseguita: scene centrate, bordi entro il viewport, testo leggibile e nessun clipping del contenuto target; outline senza sovrapposizioni. Le scene non attive possono restare visibili ai margini dello spazio (nella conclusione), coerentemente con il rendering spaziale; restano inert/aria-hidden. Le catture agli estremi non sostituiscono le prove numeriche e di interruzione.

- [Introduzione](scene-intro.png)
- [Dettaglio](scene-detail.png)
- [Conclusione](scene-end.png)
- [Outline](outline.png)

## Bundle

[Misura riproducibile](bundle.json), gzip livello 9, consumer minimo di `createPlayer` e CSS pubblico dagli artefatti dist: **17 823 byte JS (17,41 KiB)** e **662 byte CSS (0,65 KiB)**; gate 102 400 / 20 480 byte. Include il core raggiungibile dal player, validatore standalone e helper matematici. Esclude demo, JSON, test, editor/plugin e sorgenti del compilatore Ajv. Confini e scansione output non rilevano React/editor, eval o new Function. I pesi JS non compressi delle singole librerie non sono il gate gzip del consumer.

## Gate e limiti aperti

| Criterio 0.1                                       | Stato                                                                        |
| -------------------------------------------------- | ---------------------------------------------------------------------------- |
| Installazione/strict/lint/format/build/CI iniziale | Verificato localmente e nel run Linux sopra collegato                        |
| Schema 1.0.0, semantica, diagnostica, roundtrip    | Verificato                                                                   |
| Tre scene vanilla, API, tastiera e due istanze     | Dimostrato su Chromium/Firefox 1.64.1 e WebKit 1.61.1                        |
| History/cancel/clock/reduced motion/eventi         | Verificato                                                                   |
| Destroy/outline/focus                              | Verificato sui tre motori locali; 50 cicli e zero risorse residue per motore |
| Budget core+player e confini                       | Verificato; bundle invariato                                                 |
| Runner WebKit macOS 14                             | **10 pass, nessuno skip**, pin 1.61.1 isolato e riproducibile                |
| Selezione runner e pin CI                          | 12 unità passate; Linux sceglie soltanto 1.64.1 per i tre browser            |
| E2E Linux con 1.64.1                               | **30 pass (10 per motore), zero skip**, esecuzione remota verificata         |

Non eseguiti Safari/Chrome/Edge installati, mobile fisico o screen reader: nessuna compatibilità o certificazione dichiarata; verifiche estese previste prima di 1.0. Heap dopo GC e benchmark 100 scene/p95 non misurati; il teardown dimostra i contatori di risorse, non un profilo heap o FPS garantiti. Spazio numericamente limitato dalla specifica.

La verifica locale macOS 14 e la matrice Linux del runner corrente sono passate. Restano le prove di Safari reale e le verifiche di stabilizzazione già indicate. Per 0.2 conservare schema/fixture 1.0.0, aggiungere updateDocument atomico al player condiviso e verificare le regressioni prima della UI; nessun lavoro 0.2 svolto qui.
