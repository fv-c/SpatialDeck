# Verifica SpatialDeck 0.2 Editor

21 ottobre 2026. Studio 0.2 implementato, documento **schema 1.0.0 invariato**. Verifica locale su macOS 14; la CI remota della fase 0.2 non è stata eseguita. Nessun commit, push, deploy, tag o publish.

## Baseline e perimetro

Letture iniziali: istruzioni AGENTS fornite nella chat, README, PROJECT_SPEC, ROADMAP, DEVELOPMENT, rapporto 0.1, manifest e API pubbliche core/player prima dei relativi sorgenti. Stato Git iniziale: solo `?? prompts/`, preservato. Il motore precedente era realmente utilizzabile: **85 unità e 30 E2E passati, zero fail/skip**, prima di modificare il player. Log locali in `.tools/baseline-unit.log` e `.tools/baseline-e2e.log`.

Aggiunti `packages/editor` e `apps/studio`, fixture `examples/editor-roundtrip/project.json`, unità store/storage/update, suite browser editor e guida autore. Estesi API/eventi/core navigation e player per updateDocument; aggiornati manifest, lockfile, TS/React lint, build, confini e server E2E. README, DEVELOPMENT, PROJECT_SPEC e ROADMAP descrivono le decisioni effettive. LICENSE, schema, fixture storica, prompt e implementazione vanilla preservati.

Non sono stati implementati grafi, parent, timeline, plugin/media, CLI/export, cloud o fase 0.3.

## Ambiente e avvio

Stesso ambiente della fase 0.1: macOS 14.8.7 arm64, Apple M3 Max, Node **24.22.0** e pnpm **12.14.0** sotto `.tools`, senza cambiare strumenti globali. React/React DOM **19.3.1**, tipi **19.3.0**, plugin-react **6.1.2**, hooks lint **7.1.1** verificati dal registry e installati con peer strict; stack precedente conservato. [Metadati di questa fase](editor-environment.json).

```sh
export PATH="$PWD/.tools/node_modules/.bin:$PATH" # se necessario su questa macchina
pnpm install --frozen-lockfile
pnpm dev:studio
# Altro terminale, demo vanilla:
pnpm dev:playground
```

Studio: `http://127.0.0.1:5174`; playground: `/core` sulla porta stampata da Vite. I due avvii reali sono stati verificati in browser: una preview Studio e due player vanilla, zero page error; inspector Z=125 arriva alla camera. Vite risolve direttamente i sorgenti core/player, senza dist preliminari: [evidenza dev](editor-dev-smoke.json). Nessun backend/account o risorsa remota richiesta dalla demo.

Workflow: crea tre scene, seleziona/trascina o usa coordinate/rotazioni/scala/dimensioni, modifica testo e note, usa Annulla/Ripristina, scarica Salva JSON. Apri il file in una sessione separata e presenta; Escape ritorna all'editor. [Guida autore](../AUTHORING.md).

## Decisioni implementate

- Store separato dalla sessione, snapshot validati e congelati. Comandi prima/dopo; massimo 100 comandi o 20 MiB UTF-8, con espulsione dei più vecchi finché entrambi i limiti sono rispettati. Un comando eccedente da solo viene applicato ma non conservato nella history. Edit dopo undo elimina redo; nessuna history nel JSON.
- Drag live con un comando al pointerup; Escape/pointercancel ripristinano. Mappa SVG XY usa `sceneMatrix` core, pan/zoom restano UI. Preview aggiornata al massimo una volta per RAF; una raffica di 30 modifiche è verificata con un solo documentchange. Nessun renderer React delle scene.
- Il player valida updateDocument prima di qualsiasi cambiamento, annulla il pending senza visitare la destinazione, conserva nodo/percorso se esistono, altrimenti seleziona start o empty e ricostruisce camera/history. DOM/listener/observer appartengono alla stessa istanza; update non rimonta il player e non ruba focus. documentchange viene emesso soltanto dopo l'aggiornamento.
- Create/duplicate assegnano nuovi ID a scena, blocchi e nodi; il principale segue l'ordine scene. Delete ricuce i vicini con defaultTransition; undo ripristina ID/transizioni originali. Altri percorsi referenzianti: eliminazione rifiutata con nomi e conteggi. Principale importato con ordine diverso o visite ripetute: rifiuto delle modifiche strutturali, mantenendo apertura e modifiche di contenuti/trasformazioni.
- File input e download Blob; candidato validato prima di sostituire, dialogo dirty annullabile e focus ripristinato. Salva comprende anche il draft attualmente focalizzato. Estensioni opache, note e array preservati, nessun campo UI o migrazione.
- IndexedDB reale: `documents` e `recovery` nella stessa transazione; revisione attesa confrontata prima della scrittura; ultime dieci revisioni per projectId. Autosave 750 ms, coda seriale e nessuna scrittura di snapshot identici. Recupero proposto, con selezione esplicita delle revisioni. Quota, storage negato e conflitti lasciano memoria/download disponibili. Flush visibilitychange best effort; niente promessa unload e nessuna descrizione come backup.
- Pannelli richiudibili, controlli etichettati/errori associati, coordinate alternative al drag, Tab/Shift+Tab e pulsanti attivabili da tastiera. Gestito il focus quando undo/redo disabilita il controllo attivo. Presentazione con istanza separata dello stesso player, modello intatto al ritorno e reduced motion rispettato. Layout verificato a 1440×1000, 768×900, 390×900 e 320×900.

## Comandi finali

Tutti eseguiti col PATH locale; esiti riferiti all'ultima esecuzione riuscita, senza sommare ripetizioni diagnostiche. [Comandi, exit code e inventario dei file](editor-checks.json).

| Comando                                  |    Exit | Risultato                                                            |
| ---------------------------------------- | ------: | -------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`         |       0 | 7 workspace, lockfile/peer strict                                    |
| `pnpm typecheck`                         |       0 | Core, player, editor, app, test e configurazioni                     |
| `pnpm lint`                              |       0 | ESLint e regole React hooks                                          |
| `pnpm format:check`                      |       0 | File pertinenti formattati, prompt preservati                        |
| `pnpm test`                              |       0 | **119 pass, 0 fail, 0 skip**, 7 file                                 |
| `pnpm build`                             |       0 | Core/player/editor ESM e dichiarazioni, playground/Studio production |
| `pnpm test:e2e`                          |       0 | **66 pass, 0 fail, 0 skip**: 22 Chromium + 22 Firefox + 22 WebKit    |
| `pnpm check:boundaries`                  |       0 | Core/player senza React/editor; React peer dell'editor               |
| `pnpm check:bundle`                      |       0 | **18 180 B JS / 662 B CSS gzip**, limiti 102 400 / 20 480 B          |
| `pnpm dev:studio`, `pnpm dev:playground` | 0 avvio | Smoke browser reale sopra collegato                                  |
| `git diff --check`                       |       0 | Whitespace dei file tracciati                                        |

Totale: **185 test** (119 unità + 66 E2E), zero fail/skip. Le 119 unità includono tutte le 85 precedenti e 34 nuove. Le 66 E2E includono 30 regressioni core/player e 36 prove editor, senza copie o skip tra runner. Chromium/Firefox: Playwright 1.64.1. WebKit macOS 14: runner di compatibilità 1.61.1 già autorizzato dalla fase precedente. [Esiti dettagliati per test](editor-e2e-results.json); trace/report locali sotto `test-results/` e log `.tools/final-*.log`, `.tools/editor-e2e.log`.

## Roundtrip, storage e artefatti ispezionati

La prova crea tre scene dalla UI, trascina una scena e verifica un solo comando, modifica XYZ/tre Euler/scala/dimensioni, prova undo/redo, aggiunge testo letterale e note. Il file viene realmente scaricato, letto e confrontato col documento, la pagina originale viene chiusa e il file aperto in un nuovo browser context. Il modello riaperto è identico. La camera corrisponde a resolveSceneCamera core; tre landmark vengono misurati nel DOM prima/dopo e nel player di presentazione entro 1 CSS px, normalizzati per contain. Nessun confronto basato soltanto su immagini.

- [JSON realmente scaricato](editor-roundtrip-saved.json)
- [Pose e landmark misurati](editor-roundtrip-evidence.json)
- [Desktop](editor-desktop.png), [mobile](editor-mobile.png), [proposta recovery](editor-recovery.png)
- [Revisioni reali e conflitto obsoleto](editor-storage-evidence.json)

Le immagini sono state aperte e ispezionate: toolbar/scene/inspector leggibili, selezione visibile, mappa e anteprima coerenti, target della preview interamente contenuto; a 390 px pannelli impilati e scene scorrevoli. Nessun overflow orizzontale della pagina nei tre viewport ridotti. I rendering non sostituiscono i controlli numerici.

Storage normale provato su IndexedDB di ogni browser, incluso reload e scelta recovery. Quota viene iniettata sul put di recovery durante una transazione reale: la scrittura head precedente viene rollbackata e resta una sola revisione. Accesso negato viene iniettato separatamente. Due vere pagine condividono lo stesso database: un writer supera la revisione dell'altro, che riceve warning conservando contenuti e download. Ultime dieci revisioni e rifiuto di un writer obsoleto verificati.

Difetti corretti durante QA: revisione incrementata dal solo recupero, label dei campi alterata dal messaggio d'errore, ritaglio della preview per min-height ereditato, commit del testo all'ultimo Tab su Firefox, pulsanti non tabbabili con impostazioni macOS/WebKit, perdita del focus quando redo diventava disabled e ritorno del focus dopo il selettore file. I primi tentativi falliti sono diagnostici; il risultato finale si riferisce al codice corretto. Tab e Shift+Tab sono entrambi usati nel workflow da tastiera, senza pointer o chiamate programmatiche focus nel test.

## Gate e limiti

Tutti i gate obbligatori 0.2 locali risultano verificati. Restano fuori dalla prova Safari/Chrome/Edge installati, dispositivi fisici touch, screen reader, heap dopo GC e benchmark p95 controllati: sono verifiche di stabilizzazione, non compatibilità o prestazioni dichiarate. La CI Linux precedente rimane evidenza solo di 0.1; nessuna esecuzione remota 0.2 dichiarata.

Debito esplicito: mappa ortografica XY con profondità via inspector, nessun gizmo 3D; niente file system picker avanzato, sincronizzazione collaborativa o garanzia persistenza browser. La history ha un budget reale e può espellere comandi. Per 0.3 conservare fixture/schema 1.0.0 e queste regressioni, introdurre soltanto allora schema 1.1.0/migrazione e preview d'impatto per strutture/grafi. Nessuna fase successiva avviata.
