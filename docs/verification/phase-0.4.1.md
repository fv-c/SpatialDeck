# Verifica SpatialDeck 0.4.1 Consolidamento

22 ottobre 2026. Schema **1.2.0** invariato, fixture e rapporti storici invariati. **322 unità + 162 E2E = 484 test passati**, zero fail/skip nell’ultima suite completa. Nessun commit, push, deploy, publish o tag; 0.5 Impaginazione non è avviata e nessuna decisione G0 è stata presa.

## Baseline e perimetro

Stato iniziale: soltanto `?? prompts/`, preservato e non aggiunto all’indice. Letti README, PROJECT_SPEC (sezioni 5, 6, 7, 10, 12, 19), ROADMAP (4, 5, 12), DEVELOPMENT, AUTHORING, PLUGINS e i rapporti 0.1–0.4 prima dei sorgenti. Nessun AGENTS su disco: valgono le istruzioni della chat e del prompt di fase.

Baseline 0.4 misurata prima di cambiare codice: `pnpm test` **233 pass**, `pnpm test:e2e` **120 pass** (80 Chromium/Firefox con Playwright 1.64.1, 40 WebKit con il runner macOS 14 1.61.1). Log `.tools/consolidation-baseline-unit.log` e `.tools/consolidation-baseline-e2e.log`. La stessa esecuzione ha riscritto 12 file tracciati di `docs/verification/` (difetto «controlli che modificano file tracciati» riprodotto; diffstat in `.tools/consolidation-baseline-tracked-writes.txt`); quei file, intatti prima della prova, sono stati riportati a HEAD.

Test rossi sul codice 0.4 invariato: 39 unità fallite più la suite SHA-256 non importabile (`.tools/consolidation-red-unit.log`) e 11 E2E falliti su 14 nuovi in Chromium (`.tools/consolidation-red-e2e.log`). I 3 E2E axe del playground passavano già; quello di Studio falliva per contrasto insufficiente del numero della scena selezionata, corretto.

## Ambiente e avvio

[Ambiente](consolidation-environment.json): macOS 14.8.7 / Darwin 23.6.0 arm64, Apple M3 Max, 64 GiB; Node **24.22.0** e pnpm **12.14.0** da `.tools` (Node globale 25.8.1). Chromium **156.0.8078.4** e Firefox **157.0** con Playwright 1.64.1; WebKit **26.5** con il runner 1.61.1. Prove locali: la CI non è stata eseguita perché nulla è stato inviato al remoto.

```sh
export PATH="$PWD/.tools/node_modules/.bin:$PATH" # solo se Node/pnpm globali non corrispondono
pnpm install --frozen-lockfile
pnpm dev:studio
pnpm dev:playground
```

Studio di produzione: `pnpm build` e poi `pnpm --filter @spatialdeck/studio exec vite preview`; `window.studio` esiste solo con `?studio-debug` nell’URL.

## Difetti della ROADMAP sezione 12 riprodotti e corretti

| Carenza 0.4.1                                                                                                                | Test rosso su 0.4                                                                                                                                                                              | Correzione                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SVG con prologo/commento/DOCTYPE rifiutati; testo UTF-8 troncato al byte 4096                                                | `signatures.test.ts` (BOM, prologo, commenti, PI, DOCTYPE con internal subset; caratteri da 2–4 byte a cavallo del byte 4096 in VTT/SVG/testo)                                                 | Prologo saltato senza interpretare DTD/entità; UTF-8 decodificato per intero in streaming; non-SVG dopo commento, UTF-8 invalido, MIME e firme binarie errate restano rifiutati                         |
| Digest dipendente da `crypto.subtle`                                                                                         | `signatures.test.ts` senza `crypto.subtle`; E2E su `gallery/studio.spatialdeck.test` in HTTP (`isSecureContext=false`), gallery, archivio e Studio                                             | SHA-256 locale FIPS 180-4 (`sha256.test.ts`: vettori NIST, un milione di «a», confronto con `crypto.subtle` e `node:crypto` su tutti i confini di blocco); `randomId()` al posto di `crypto.randomUUID` |
| Preview che ricostruisce tutti i renderer e ricalcola i digest; autosave che ricalcola e riscrive gli asset                  | `player.test.ts` (contatori di mount, resolve e release; equivalenza con un mount completo); E2E con video da 50 MiB; `recovery.test.ts` (nessuna lettura, digest o `put` per asset invariati) | `updateDocument` incrementale, verifica/digest memoizzati per Blob, chiavi asset da digest dichiarato o memoizzato, scrittura dei soli byte nuovi                                                       |
| Testi del player cablati, `lang` assente, outline con sorgente                                                               | `player.test.ts`, `renderers.test.ts`, E2E con testi inglesi                                                                                                                                   | `PlayerOptions.messages` per player e renderer builtin, `lang` da `metadata.language`, outline con testo derivato                                                                                       |
| CSP di produzione con `ws:`; `window.studio` in produzione                                                                   | E2E sulla dist di Studio                                                                                                                                                                       | `connect-src 'self'`; `ws:` solo nel dev server; `window.studio` solo in dev o con `?studio-debug`                                                                                                      |
| Store che serializza e congela tutto a ogni pubblicazione; un undo per tasto; render che scorre tutti i blocchi a ogni frame | `store.test.ts` (spia su `JSON.stringify`/`Object.freeze` su selezione e pan, sessioni di testo); `player.test.ts` (MutationObserver durante 10 frame)                                         | Pubblicazione shallow, dirty per identità, `coalesce`/`endCoalesce`; render per frame della sola camera                                                                                                 |
| IndexedDB: `versionchange`/`blocked`, progetti non eliminabili, recupero a ogni avvio                                        | `recovery.test.ts` con fake-indexeddb; E2E con seconda scheda v40, scheda 0.4 che blocca l’upgrade, eliminazione con conferma, recupero dopo salvataggio                                       | DB v3 con indice `assetKeys`, avvisi persistenti e riapertura, `deleteRevision`/`deleteProject`, `markSaved` e `pendingRecovery`                                                                        |
| Messaggio di limite unico; `playsinline` assente                                                                             | E2E e `storage.test.ts`; `renderers.test.ts`                                                                                                                                                   | Messaggi distinti JSON 10 MiB / archivio 220 MiB; `playsinline` sui video                                                                                                                               |
| `check:bundle` su file tracciato; Actions non fissate; axe e coverage estesa assenti                                         | Diffstat della baseline                                                                                                                                                                        | Report in `test-results/`, evidenze E2E in `test-results/evidence/`, Actions per SHA, `a11y.spec.ts`, coverage per aree e `git diff --exit-code` in CI                                                  |
| Documentazione superata                                                                                                      | —                                                                                                                                                                                              | README, DEVELOPMENT, AUTHORING, PLUGINS, ROADMAP sezioni 12–13 e PROJECT_SPEC sezione 20 aggiornati                                                                                                     |

Durante l’implementazione l’E2E storico «missing assets recover manually» ha rivelato una regressione della prima versione incrementale: un file associato dopo l’apertura non veniva risolto di nuovo perché il resolver di Studio non esponeva `revision`. Corretto in due modi, entrambi coperti: il player ritenta i blocchi il cui asset non si era risolto, e Studio/playground inoltrano `revision`.

## Misure prima e dopo

[Dati completi](consolidation-perf.json). Studio di produzione, tre scene, video MP4 da 50 MiB (gallery più box `free` di riempimento), SVG da 1,6 MiB e SVG piccolo; 100 modifiche X nell’inspector (fill + Invio) e 100 passi di drag sulla mappa. Latenza = `performance.now()` alla consegna dell’evento di input → `documentchange` della preview. «Prima» = commit 0.4 `b0a2acd` compilato in un worktree temporaneo con lo stesso test; «dopo» = questo albero. Runner locale non controllato: tempi **informativi**; i contatori sono il gate stabile.

| Browser      | Inspector p50 / p95 / max ms (prima → dopo) | Drag p50 / p95 / max ms (prima → dopo) | Digest e URL Blob in 200 modifiche | Video preservato |
| ------------ | ------------------------------------------- | -------------------------------------- | ---------------------------------- | ---------------- |
| Chromium 156 | 5,6 / 16,1 / 20,8 → 7,9 / 15,3 / 15,6       | 2,8 / 3,1 / 19,8 → 2,1 / 2,5 / 19,0    | 418 / 392 → **0 / 0**              | no → **sì**      |
| Firefox 157  | 5 / 39 / 319 → 5 / 8 / 9                    | 3 / 4 / 9 → 2 / 3 / 21                 | 516 / 404 → **0 / 0**              | no → **sì**      |
| WebKit 26.5  | 10 / 66 / 523 → 10 / 20 / 23                | 14 / **528** / 565 → 15 / 23 / 26      | 430 / 552 → **0 / 0**              | no → **sì**      |

Il budget p95 input→preview ≤100 ms con 50 MiB di media è rispettato in locale nei tre motori; sul codice 0.4 WebKit lo superava nel drag. Il commit della preview avviene prima del lavoro asincrono sui media: sul codice 0.4 ogni modifica rileggeva e ricalcolava il digest di fino a 50 MiB e creava nuovi URL Blob dopo `documentchange`, per cui il test durava circa 2 minuti per browser contro pochi secondi ora. Trace Chromium in `test-results/evidence/perf-trace-chromium.json` (non tracciato per dimensione). Misura prima con un timestamp diverso, scartata: in WebKit `event.timeStamp` degli eventi sintetici usa un altro orologio (`.tools/perf-before/`).

[Bundle minimo](consolidation-bundle.json): **48 929 B JS / 932 B CSS gzip** (0.4: 46 353 / 932; +2 576 B per SHA-256 locale, messaggi e aggiornamento incrementale), limiti 102 400 / 20 480 B, React/editor/DOMPurify/marked/KaTeX/fflate assenti.

## Accessibilità

[Esiti axe](consolidation-axe.json) di axe-core 4.14.0 (WCAG 2.0/2.1/2.2 A–AA e best practice) su `/core`, `/structure`, `/content` con e senza vista testuale, Studio vuoto, con la gallery, con dialogo e in presentazione, nei tre motori: **zero violazioni serious o critical**, nessuna eccezione motivata necessaria. Restano due regole **moderate**, non bloccanti per il gate: `landmark-unique` nel playground (due player dello stesso documento hanno lo stesso nome accessibile) e `page-has-heading-one` in Studio. Le violazioni moderate sono registrate, non nascoste. Axe non equivale a una prova con screen reader.

## Coverage

[Dettaglio per file](consolidation-coverage.json). Soglie per area, fissate pochi punti sotto la misura 0.4.1 per impedire regressioni senza renderle fragili; il core conserva il gate 0.3.

| Area                           | Statements | Branches | Soglia  | Motivazione                                                                 |
| ------------------------------ | ---------: | -------: | ------- | --------------------------------------------------------------------------- |
| core                           |     94,63% |   90,05% | 85 / 80 | Gate storico invariato                                                      |
| player assets                  |     95,71% |   90,08% | 90 / 85 | Logica pura di sicurezza e verifica, testabile per intero in Node           |
| player index/content/messages  |     85,87% |   70,32% | 80 / 65 | Tastiera, focus, resize e CSS 3D sono provati negli E2E reali, non in jsdom |
| plugins security/archive/media |     89,20% |   79,34% | 85 / 75 | Rami dei codec e degli eventi media reali coperti dagli E2E                 |
| editor store/storage           |     92,08% |   75,50% | 88 / 72 | Rami di errore IndexedDB specifici dei motori coperti dagli E2E             |

## Comandi finali

[Comandi ed exit code](consolidation-checks.json); log in `.tools/consolidation-final/`.

| Comando                               | Exit | Risultato                                                                                       |
| ------------------------------------- | ---: | ----------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`      |    0 | 8 workspace, lockfile invariato dopo l’aggiunta motivata delle tre dipendenze di sviluppo       |
| `pnpm typecheck`                      |    0 | TS strict, core ES-only, app e test                                                             |
| `pnpm lint`                           |    0 | ESLint e React hooks                                                                            |
| `pnpm format:check`                   |    0 | Prettier; prompt esclusi                                                                        |
| `pnpm test`                           |    0 | **322 pass**, 18 file, zero fail/skip (233 della baseline + 89 nuove)                           |
| `pnpm test:coverage`                  |    0 | Soglie per area superate (tabella sopra)                                                        |
| `pnpm build`                          |    0 | Core/player/plugins/editor e due app production                                                 |
| `pnpm check:boundaries`               |    0 | Core/player isolati, plugin opzionali                                                           |
| `pnpm check:bundle`                   |    0 | 48 929 / 932 B gzip, report in `test-results/bundle/`                                           |
| `pnpm test:e2e`                       |    0 | **162 pass**: 54 Chromium + 54 Firefox + 54 WebKit (120 regressioni + 42 nuove), zero fail/skip |
| `git diff --check`                    |    0 | Whitespace                                                                                      |
| `git status --short` dopo i controlli |    — | Nessun file tracciato modificato dagli script                                                   |

La prima esecuzione finale ha trovato due errori, corretti e rieseguiti: un tipo in un test (`exactOptionalPropertyTypes`) e l’allineamento di una tabella in DEVELOPMENT.

## Decisioni, compatibilità e modifiche ai test

- API additive: `PlayerOptions.messages`, `PlayerMessages`/`defaultMessages`, `ContentContext.messages?`, `AssetError`, `AssetResolver.revision?`, `NavigationMachine.peek()`/`getChoices()`, `EditorStore.coalesce`/`endCoalesce`, metodi di `RecoveryRepository` e `Autosave`, `ARCHIVE_LIMIT`/`JSON_LIMIT`, `randomId`. Unico cambio di comportamento esportato: `blockText` restituisce testo accessibile (alt, label, titolo) e non più il sorgente Markdown/HTML/SVG/LaTeX, come richiesto per l’outline.
- I renderer di terze parti non vengono rimontati quando il loro blocco non cambia: ricevono il nuovo documento con `update()`, documentato in PLUGINS.
- Dipendenze di sviluppo esatte, rilasciate da più di due settimane e verificate: axe-core 4.14.0 (MPL-2.0), jsdom 30.1.2 (MIT), fake-indexeddb 6.2.5 (Apache-2.0). Nessuna dipendenza runtime nuova. Manifest portati a 0.4.1.
- E2E esistenti: URL di Studio con `?studio-debug` e `window.studio!`; evidenze verso `test-results/evidence/`; il test storage apre il database senza fissare la versione (ora v3) e inietta la quota su una risorsa nuova, perché le risorse invariate non vengono più riscritte. Nessun test rimosso o reso facoltativo.
- CI: Actions per SHA (checkout v4.4.0, pnpm/action-setup v4.3.0, setup-node v4.4.0, upload-artifact v4.6.2, cioè le release a cui puntava `@v4`), `permissions: contents: read`, `pnpm test:coverage`, `git diff --exit-code` e upload del solo `test-results/`.

## Limiti e rinvii

- Nessuna voce 0.4.1 della ROADMAP è rinviata. L’esecuzione della CI aggiornata resta da osservare al primo push del maintainer.
- Tempi su un solo computer non controllato; il gate prestazionale pre-1.0 su runner controllato resta aperto. Il test asserisce il budget in locale e lo registra soltanto con `CI` impostata, come previsto per runner rumorosi.
- WebKit è il runner Playwright per macOS 14, non Safari installato; dispositivi mobili, screen reader, heap dopo GC non provati.
- Le due violazioni axe moderate restano aperte; non sono state introdotte da questa fase.
- L’host non-localhost è simulato instradando `*.spatialdeck.test` verso i server locali nel browser di test: prova il contesto non sicuro reale, non una rete esterna.
- Un blocco con un asset non risolto viene ritentato a ogni aggiornamento; il costo è limitato dalla verifica memoizzata.

## Handoff per 0.5

Prerequisiti: preview incrementale nel budget (verificata in locale nei tre motori) e conferma del punto 4 di G0 (modello di impaginazione) da parte del maintainer, ancora **aperta**. Da riusare: `updateDocument` incrementale e la sua prova di equivalenza, i contatori del test prestazionale per il drag di 30 blocchi canvas, `messages` per i nuovi testi del player, evidenze in `test-results/`.
