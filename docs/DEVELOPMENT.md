# Sviluppo e API 0.4.1

## Struttura verificata

| Percorso                                  | Responsabilità                                                                                      |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `packages/core/schema`                    | Schema corrente 1.2.0 e storici 1.0.0/1.1.0; export `@spatialdeck/core/schema` e subpath versionati |
| `packages/core/src/document`              | Tipi derivati, validatore standalone, parser/semantica, diagnostica, serializer                     |
| `packages/core/src/math`                  | Matrici, quaternioni, auto-fit e vista camera                                                       |
| `packages/core/src/navigation`            | Macchina lineare, visite, interruzione e clock attivo                                               |
| `packages/core/src/timing`                | Sampler puro e easing                                                                               |
| `packages/core/src/events`                | Payload degli eventi tipizzati                                                                      |
| `packages/player/src/index.ts`            | Factory, DOM, input, accessibilità e risorse per istanza                                            |
| `packages/player/src/browser.ts`          | Entrypoint di build che raccoglie anche il CSS                                                      |
| `packages/editor`                         | Store immutabile, comandi atomici, React UI, file e IndexedDB                                       |
| `apps/studio`                             | App React/Vite locale su porta 5174                                                                 |
| `apps/playground`                         | Demo Vite vanilla con due player su `/core`                                                         |
| `examples/core-three-scenes/project.json` | Esempio normativo di tre scene, conservato in 1.0.0                                                 |
| `scripts`                                 | Generazione, verifica confini e budget bundle                                                       |
| `tests/e2e`                               | Geometria, lifecycle, contenuti, Studio, prestazioni e axe su browser reali                         |

Core non dipende da DOM, player, filesystem o React. Il typecheck delle dichiarazioni core usa la sola libreria ES2022 e i tipi delle API standard Node, senza lib DOM. Il player dipende dal core. Il bundle standalone comprende soltanto i piccoli helper Ajv necessari e gl-matrix; il compilatore Ajv è usato esclusivamente dal generatore Node.

Il runner `tools/webkit-macos14` è un workspace privato con l'unica dipendenza di sviluppo `@playwright/test@1.61.1`. Non è una libreria del prodotto e non entra nel bundle. Il pacchetto root mantiene `@playwright/test@1.64.1`.

## Toolchain e installazione

Tutti i pin della baseline sono conservati, senza peer forzati. È stata aggiunta l'eccezione approvata per il solo runner WebKit di macOS 14: Playwright 1.61.1 in un workspace separato, fissato anche nel lockfile. [Metadati verificati e ambiente](verification/environment.json). Il pnpm locale ha aggiunto l'eccezione temporale puntuale `vite@8.3.5` alla sua policy di release age. `strictPeerDependencies` rimane attivo.

Se Node o pnpm globali non corrispondono ai pin (sul computer delle verifiche locali: Node 25.8.1 senza pnpm), installare strumenti locali ignorati da Git, senza cambiare quelli globali:

```sh
npm install --prefix .tools --no-package-lock --no-save node@24.22.0 pnpm@12.14.0
export PATH="$PWD/.tools/node_modules/.bin:$PATH"
pnpm install --frozen-lockfile
```

Con Node/pnpm già corretti usare direttamente i comandi del README. Non occorre `.tools` in CI. La CI Linux installa Chromium, Firefox e WebKit ed esegue tutti e tre con Playwright 1.64.1, senza pubblicare pacchetti.

## Runner browser e compatibilità macOS 14

```sh
pnpm browsers:install
pnpm test:e2e
# Solo WebKit su macOS 14:
pnpm test:e2e:webkit:macos14
# Filtro compatibile anche con la selezione automatica:
pnpm test:e2e --project=webkit
```

Il primo comando installa Chromium/Firefox della 1.64.1 e WebKit della 1.61.1 su Darwin 23 (macOS 14). Su Linux e macOS successivi installa tutti e tre dalla 1.64.1. Il comando dedicato rifiuta altri sistemi. Non occorre alcuna installazione npm ad hoc sotto `.tools` per il runner: `pnpm install --frozen-lockfile` installa entrambi i pin nei rispettivi workspace.

`scripts/e2e-plan.mjs` decide il piano da piattaforma, release e filtri; `scripts/run-e2e.mjs` risolve il CLI dal pacchetto corretto e verifica la versione esatta prima di avviarlo. Su Linux il piano contiene soltanto il runner corrente per tutti e tre i browser. Una versione diversa da quella attesa o un runner fallito produce exit non zero. I 12 test di instradamento coprono Linux, macOS 14 e successivi, filtri e guardie del comando dedicato.

`tests/e2e/core.spec.ts` e `tests/e2e/editor.spec.ts` sono le suite condivise dai due runner. L'adapter `tests/e2e/runner.ts` caricano test/expect dalla versione selezionata; il suo controllo di versione impedisce una risoluzione accidentale del pacchetto root nel runner di compatibilità. `tests/e2e/config.ts` condivide server, worker e opzioni; le due configurazioni selezionano i browser. Non si copiano sorgenti e non si eliminano test per eseguire WebKit.

Report/trace vengono scritti in `test-results/current/` e `test-results/webkit-macos14/`; il launcher registra versioni, progetti, exit e conteggi in `test-results/e2e-summary.json`. Il comando dedicato aggiorna il riepilogo per la propria esecuzione. Da 0.4.1 le evidenze dei test (screenshot, JSON di roundtrip/storage/media, misure di prestazione, risultati axe, trace Chromium) vanno in `test-results/evidence/` tramite `tests/e2e/evidence.ts`: nessun comando riscrive file tracciati. I rapporti in `docs/verification/` si compilano a mano da quelle evidenze; quelli storici restano invariati.

Il runtime WebKit per macOS 14 è congelato. La 1.61.1 evita il comando di protocollo incompatibile introdotto nelle versioni successive: [issue Playwright #42964](https://github.com/microsoft/playwright/issues/42964). Questa prova locale non equivale alla matrice Linux con 1.64.1 né a Safari installato.

## Generazione e build

`pnpm generate` legge lo schema JSON, produce il validatore Ajv standalone ESM e deriva i tipi TypeScript dallo stesso schema. Non modificare a mano `document/types.ts` o `document/validator.js`. Il generatore produce tre validatori standalone e deriva i tipi dallo schema 1.2.0. `validateDocument` e `migrateDocument` accettano 1.0.0/1.1.0/1.2.0 e restituiscono una copia corrente 1.2.0; il dispatcher verifica schema e vincoli lineari storici prima della migrazione, poi semantica corrente. Una versione futura è rifiutata. Le fixture storiche non sono riscritte.

Vite library mode genera JS ESM e CSS separato; tsc genera `.d.ts`. Il consumer deve importare il CSS pubblico. `pnpm check:bundle`, dopo la build, crea un consumer minimo dal JS e dal CSS distribuiti in `test-results/bundle/consumer`, comprime con gzip livello 9, misura entrambi e scrive `test-results/bundle/report.json` (ignorato). `pnpm check:boundaries` controlla dipendenze, sorgenti e output. Nessun pacchetto futuro vuoto.

## Uso vanilla

Dopo la build, nel consumer con risoluzione dei pacchetti workspace:

```ts
import { createPlayer } from "@spatialdeck/player";
import "@spatialdeck/player/style.css";
import project from "./project.json";

const container = document.querySelector<HTMLElement>("#presentation")!;
const player = createPlayer({ input: true, motion: "system" });
const unsubscribe = player.on("scenechange", ({ visit }) => {
  console.log(visit.nodeId);
});
const mounted = await player.mount(container, project);
if (!mounted.ok) console.error(mounted.diagnostics);
else {
  await player.next();
  await player.goTo({ pathId: "main", nodeId: "n3" }, { durationMs: 300 });
  await player.prev();
  await player.setPath("main");
}
unsubscribe();
player.destroy();
```

Il container deve avere dimensioni CSS positive; il player ne adatta il viewport con contain e osserva i resize. Il mount preserva figli e attributi dell'host; aggiunge tabindex soltanto quando manca e lo ripristina al destroy. Un'istanza distrutta non può essere rimontata: crearne una nuova. Mount ripetuto su un'istanza attiva è un errore, non una sostituzione implicita. Valori non validi al mount lasciano l'host intatto.

### Core

- `validateDocument(unknown)` accetta oggetti JSON o testo JSON. Restituisce `Result<ProjectDocument>` con copia indipendente oppure diagnostica con code, severity e JSON Pointer. Non muta l'input.
- `migrateDocument(unknown)` valida e migra 1.0.0→1.1.0→1.2.0 in copia, aggiungendo parent null, track/cue e pluginSettings vuoti senza cambiare ID, percorsi, testo o estensioni. Su 1.2.0 è idempotente.
- `serializeDocument(document)` restituisce `Result<string>`, con chiavi ordinate, array preservati e newline finale. Rifiuta input invalido.
- `getWorldMatrix(document, sceneId)` restituisce `Result<number[]>`, matrice column-major.
- `resolveSceneCamera(document, sceneId)` restituisce `Result<CameraPose>`; rotazione interna quaternion `[x,y,z,w]`.
- `sampleTransition({from,to,durationMs,easing}, elapsedMs)` restituisce `{camera,progress}`. È puro, senza eventi; argomenti numerici invalidi sollevano RangeError. L'API operativa del player restituisce invece risultati, senza rejection per errori di navigazione.

La validazione applica schema strict, finitezza, ID/riferimenti, visibilità dei target, grafi raggiungibili, cicli solo con policy/condizioni esplicite, limiti byte/profondità e asset relativi sicuri. Niente schema alternativo nel player. Estensioni JSON opache preservate senza esecuzione. `holdMs` è conservato e non attiva autoplay.

### Player

`PlayerOptions`: `input?: boolean`, `keymap?: Record<string,'next'|'prev'>`, `motion?: 'system'|'reduced'`, `clock?: PlayerClock`, `onError?: (diagnostic)=>void`. Una keymap fornita sostituisce la mappa predefinita. Da 0.4 aggiunge registry, assets, muted e onContentEvent, descritti sotto; da 0.4.1 `messages`, descritto nella sezione Consolidamento.

`PlayerClock` espone `now()`, `request(callback)` e `cancel(id)`. `NavigationOptions` accetta `durationMs` intera tra 0 e 60000 e `signal` compatibile con AbortSignal. Il clock normale usa performance.now e RAF; nessun timer governa l'interpolazione.

| Metodo                             | Risultato                                                                                                                                                                                                                     |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mount(container, document)`       | `Promise<Result<void>>`; primo nodo immediato, ready prima della risoluzione                                                                                                                                                  |
| `goTo({pathId?,nodeId}, options?)` | `Promise<NavigationResult>`; node ID identifica una visita target anche se più nodi usano la stessa scena                                                                                                                     |
| `next({edgeId?}?)`, `prev()`       | Navigazione dalla visita completata; prev usa la history effettiva                                                                                                                                                            |
| `setPath(pathId)`                  | Seleziona start immediatamente e azzera history; un path vuoto porta a empty                                                                                                                                                  |
| `getState()`                       | Snapshot indipendente: status, pathId/nodeId/sceneId, history, camera, transition, choices, diagnostics                                                                                                                       |
| `on(event, handler)`               | Unsubscribe locale; handler lancianti isolati, riportati come HANDLER_ERROR                                                                                                                                                   |
| `updateDocument(document)`         | Valida prima; annulla la transizione senza visite fantasma, conserva nodo/path se presenti altrimenti start, azzera history, aggiorna DOM e camera senza focus. Da 0.4.1 è incrementale: ricostruisce solo i blocchi cambiati |
| `destroy()`                        | Idempotente; cancella pending, emette destroy e rimuove tutte le risorse possedute                                                                                                                                            |

`NavigationResult.status`: completed, noop, cancelled, choice-required oppure error. Da 0.3 choice-required espone scelte etichettate e ragioni di disabilitazione. I codici includono UNKNOWN_NODE, UNKNOWN_PATH, UNKNOWN_EDGE, INVALID_DURATION, PLAYER_UNMOUNTED e PLAYER_DESTROYED. Eventi attivi: ready, navigationstart, navigationcancel, scenechange, navigationend, diagnostic, documentchange, destroy; choice e cue sono operativi in 0.3. documentchange segue un aggiornamento riuscito; mediaerror è operativo in 0.4: `{instanceId,sceneId,blockId,assetId?,diagnostic}` per missing/decode/play failure, con diagnostica warning.

Ordine: eventuale cancel precedente, start nuovo, scenechange e end al commit, poi Promise completed. Nessuna visita annullata entra nella history. Noop e comandi invalidi non interrompono il piano valido; 10 next ravvicinati mirano sempre al successore dell'ultima visita completata. La posizione corrente è campionata prima della sostituzione. AbortSignal conserva la posa visuale. Il tempo attivo si congela quando il documento è hidden. Il cambio reduced motion completa subito con un solo commit.

### Geometria e accessibilità

Unità CSS, X destra/Y basso/Z verso osservatore; `M=T*Rz*Ry*Rx*S`, pivot centrale e wrapper contenuto separato. La camera è un piano di riferimento: `V=S(zoom)*inverse(C)`. Una sola prospettiva sul viewport; scala esterna contain. Auto-fit: `0.9 * min(viewportWidth/sceneWidth, viewportHeight/sceneHeight) / sceneScale`. Slerp arco breve e zoom logaritmico; nessuna somma Euler o interpolazione delle matrici.

Frecce, PageUp/PageDown e spazio agiscono soltanto sul container focalizzato e sui suoi contenuti; input, textarea, select, contenteditable, audio/video e controlli interattivi non sono intercettati. Tastiera e outline spostano il focus sul target al completamento; mount non ruba focus. Una chiamata API programmata non sposta il focus se l'utente è in un campo di testo. Scene non attive sono inert/aria-hidden. La vista testuale espone tutto il percorso una sola volta e naviga senza movimento; è anche il fallback se CSS 3D non è disponibile. Le preferenze reduced motion del sistema prevalgono sulle impostazioni autoriali.

Sicurezza: textContent per text, pipeline unica DOMPurify per markup utente e sink riservato al markup fidato KaTeX; nessun eval o rete obbligatoria. La CSP dimostrata omette unsafe-eval; ammette gli stili inline necessari alle matrici CSS. Non è una certificazione WCAG o un test screen reader.

## Limiti e prossima fase

WebKit locale verificato con il runner macOS 14 dedicato; la CI Linux con Playwright 1.64.1 è verde fino al commit 0.4 (233 unità, 120 E2E), mentre la 0.4.1 è verificata solo in locale ([rapporto](verification/phase-0.4.1.md)). La prova Safari reale rimane non eseguita. Non sono misurati heap dopo GC, benchmark 100 scene o timing p95: sono gate successivi di stabilizzazione, non prestazioni dichiarate. Studio 0.2 è implementato con schema 1.0.0 invariato: [guida autore](AUTHORING.md), [verifica](verification/phase-0.2.md). Parent, grafi e timeline sono ora implementati in 0.3, descritti sotto. I blocchi della 0.4 sono descritti sotto; CLI/export, deploy e pubblicazione restano fuori fase.

## Editor e integrazione Studio — base 0.2

`@spatialdeck/editor` esporta `Studio`, `EditorStore`, comandi (`createScene`, `editScene`, `deleteScene`), `emptyProject`, `RecoveryRepository`, `Autosave` e CSS pubblico. React/React DOM 19.3.1 sono peer; core/player non dipendono da React. `Studio` accetta store/repository opzionali e `onPlayer(player, present)` per integrazioni. L'app espone `window.studio` (store, repository e riferimenti ai player) solo con il dev server o, nella build di produzione, quando l'URL contiene `?studio-debug`; gli E2E usano questa opzione esplicita.

`EditorStore.getSnapshot()` restituisce documento e sessione congelati; `subscribe` è compatibile con `useSyncExternalStore`. `execute(edit, selectNew?)` clona, applica e convalida prima del commit. Undo/redo usano snapshot prima/dopo, con espulsione dei più vecchi oltre **100 comandi oppure 20 MiB UTF-8 complessivi**; un comando singolo oltre il budget viene applicato ma escluso dalla history. Selezione, camera mappa, dirty e history non entrano nel JSON. `beginDrag/moveDrag/endDrag/cancelDrag` mantengono un solo comando e permettono Escape. Preview coalesciata via RAF; salvataggio usa il medesimo documento validato.

Le modifiche strutturali aggiornano il percorso principale preservando nodi/edge non coinvolti. I vicini ricuciti ricevono defaultTransition; undo ripristina esattamente riferimenti e transizioni. Scene referenziate da altri percorsi non si possono eliminare: messaggio con nomi e conteggi. Un principale con visite ripetute o ordine diverso dalle scene rifiuta le modifiche strutturali; apertura, contenuti e trasformazioni rimangono disponibili senza perdere dati.

IndexedDB `spatialdeck-studio` (v1 in 0.2, v2 in 0.4, v3 da 0.4.1) contiene `documents` (head per projectId) e `recovery` (projectId/revision). Una sola transazione readwrite confronta la revisione attesa, scrive entrambi e rimuove le revisioni oltre le ultime dieci. L'autosave serializza le scritture, attende 750 ms e non riscrive snapshot identici. Il recupero adotta la revisione scelta senza reclamarne una nuova. Conflitti/quota/permessi producono warning persistenti, mai sostituzione del documento attivo; download JSON disponibile. Flush su save e visibilitychange come best effort, nessuna garanzia unload. Recovery è una proposta esplicita, non un backup.

`pnpm dev:studio` e `pnpm dev:playground` risolvono i sorgenti con Vite, anche senza dist. La suite E2E avvia due server production sulle porte 4173/4174, sempre senza backend. L'editor di libreria produce ESM, dichiarazioni e `editor.css` comprensivo del CSS player.

## Struttura 0.3

La fase 0.3 ha introdotto lo schema **1.1.0**, ora migrato a 1.2.0; `@spatialdeck/core/schema/1.0.0` conserva il contratto storico. Nuovi campi: `Scene.parentId`, `cameraTracks`, `cues`, `PathNode.camera?`, `PathEdge.cameraTrackId?/condition?`, `ScenePath.loopPolicy?`. Condizioni sono esclusivamente `manual` oppure `visit-limit`. La capacità `structure` è obbligatoria quando usata; i comandi aggiornano l’elenco in base ai dati, mentre l’apertura di dati sotto-dichiarati fallisce. Schema strict, ordinamento keyframe, limiti cumulativi JSON e riferimenti rimangono obbligatori. Un cue con edgeId ambiguo tra path è rifiutato; gli ID storici non vengono rinominati durante la migrazione.

Geometria core: `getWorldMatrix` compone fino a 32 livelli. `reparentScene(document,sceneId,parentId,preserveWorld=true)` restituisce un documento indipendente, validato, oppure errore senza mutazioni. `worldPositionToLocal` serve al drag XY nel mondo; nessuna matrice è implementata in React. Output gl-matrix in number[] a doppia precisione, senza modificare configurazioni globali. Scene effettivamente nascoste da un parent non possono essere target; pose automatiche dei target oltre i range camera sono rifiutate. `inspectCamera` segnala punti sul/dietro il piano prospettico, senza eliminare l’alternativa testuale.

`AuthoredCameraPose` è il formato JSON con Euler in gradi; **`CameraPose` runtime mantiene quaternion `[x,y,z,w]`**, come nelle API precedenti. `cameraPose` e `authoredCameraPose` convertono i formati. `setCamera(CameraPose)` valida, normalizza se necessario e interrompe il movimento senza nuove visite. `setView('overview'|'scene')` inquadra world bounds visibili oppure ripristina la posa registrata della visita. `PlayerState.view` distingue scene, overview e inspection; l’overview è disponibile anche con scene senza percorsi. Pan/zoom sono controlli locali del player e non vengono salvati.

`next({edgeId})` seleziona esplicitamente una connessione. Più uscite eleggibili, oppure l’unica uscita manuale, producono choice-required senza cambiare posa/history o interrompere un piano valido. Condizioni e policy contano le visite completate al nodo destinazione nella history corrente; prev ripristina la visita precedente e non consuma ingressi. Al limite: scelta disabilitata con ragione, edge esplicito restituisce VISIT_LIMIT, nessuna uscita disponibile restituisce noop con diagnostica. Nessun autoplay dei loop. `goTo` diretto verifica il limite del percorso e azzera history cambiando path; se tra sorgente e target ci sono più edge non sceglie implicitamente una track. Un edge esplicito può creare una nuova visita al medesimo nodo; goTo al nodo corrente resta noop.

`resolveCameraTrack` sostituisce at=0 con la posa visuale runtime senza mutare il JSON. `resolveEdgePlan`, `sampleTransition` e `sampleCameraTrack` sono condivisi con la timeline. Easing track una sola volta, Catmull-Rom con estremi duplicati, slerp e zoom log-lineare; controllo analitico degli estremi cubici, anche dopo la sostituzione dell’ingresso. Endpoint track registrato nella visita, senza fit finale; prev interpola verso la posa registrata senza ripercorrere la track in avanti. Una durata API sostitutiva scala le soglie cue proporzionalmente; reduced motion/durata zero emettono i cue in ordine `(atMs,id)`.

Evento `cue`: `{instanceId,transitionId,cue:{id,edgeId,atMs,event,payload}}`. Si emette una volta per transizione alla soglia, senza eseguire il payload. Hidden congela il tempo attivo; cancel sopprime i cue successivi. Anche un listener cue che avvia ispezione o distrugge il player non produce commit fantasma o emissioni ricorsive. Capture/scrub campionano soltanto pose e chiamano setCamera: nessun cue o visita.

Studio aggiunge `HierarchyTree`, `PathPanel`, `CameraTimeline`; path/nodi/edge/start/label/condizioni, parent world-preserving, camera nodo, durata/easing/interpolazione/keyframe e cue sono editabili. Il bottone loop abilita policy 3 e condizioni manuali in un solo comando prima di aggiungere una connessione ciclica. La preview di selezione usa camera nodo o fit, anche per scene ancora fuori dai percorsi; la timeline ispeziona invece il piano edge e la presentazione conserva la posa d’arrivo effettiva. Le modifiche senza variazioni non pubblicano un nuovo snapshot o resettano la preview.

La creazione scene conserva la sincronizzazione automatica solo per un principale canonico lineare senza condizioni, track o cue; con grafi/ordine diverso crea una scena indipendente, da aggiungere esplicitamente ai percorsi. Le eliminazioni mostrano conteggi concreti di scene, percorsi, visite, connessioni, cue e figli ricollocati; eliminare un nodo/edge elimina anche le visite diventate irraggiungibili. Eliminare una scena ricolloca i figli conservando world; la catena canonica ricuce i vicini. Conferma UI e singolo comando undo ripristinano tutti gli ID e i riferimenti. `deleteScene(id)` conserva il rifiuto per altri path referenzianti; `deleteScene(id,true)` è la variante usata dopo la preview d’impatto.

`pnpm test:coverage` usa provider V8 **5.0.5**, allineato a Vitest, con gate core 85% statements / 80% branches; da 0.4.1 misura anche asset del player, plugins (sicurezza, archivio, media) ed editor (store, storage) con soglie dedicate, descritte nella sezione Consolidamento. Risultati e artefatti della fase sono nel [rapporto 0.3](verification/phase-0.3.md). In 0.3 `check:bundle` registrava la misura in `verification/structure-bundle.json`; gli artefatti storici e i report 0.1/0.2 restano conservati. Le regressioni browser 0.3 scrivevano in `verification/structure-regressions/`.

## Contenuti 0.4

Il documento scritto è 1.2.0; `@spatialdeck/core/schema/1.0.0`, `/1.1.0` e `/1.2.0` esportano i tre schemi. Il generatore deriva i tipi dall’union corrente e tre validatori standalone. Le verifiche storiche e le migrazioni rimangono cumulative; un futuro 1.3.0 non viene accettato implicitamente.

`PlayerOptions` aggiunge `registry`, `assets`, `muted` e `onContentEvent`. `RendererRegistry.register(type,factory)` restituisce unregister; una factory restituisce `ContentRenderer` con mount/update/destroy. Il player possiede abort e teardown di ogni blocco. `createAssetResolver(assets,blobs)` verifica i byte e restituisce lease URL con release idempotente. Questi contratti non obbligano il player a dipendere dai renderer concreti.

`packages/plugins` contiene SDK 1.0.0, rich/media/navigation/sample, pipeline unica e archivio, con entrypoint separati. `packages/editor` usa gli stessi renderer, ContentPanel/AssetPanel, store invariato nei confini undo/redo e IndexedDB v2 per revisioni e risorse atomiche. [Guida completa e trust model](PLUGINS.md).

La gallery vanilla è `/content`, con undici blocchi e asset originali in `examples/content-gallery`. `content-gallery.spatialdeck` si apre anche in Studio. Preview muta e presentazione sono istanze indipendenti. Le app risolvono i sorgenti plugin anche in dev; i font KaTeX sono emessi come file locali. Il bundle minimo core/player continua a essere misurato separatamente e non contiene le dipendenze opzionali.

Per 0.4, i report regressivi precedenti sono rediretti a `docs/verification/content-regressions/`; i rapporti e le fixture storiche restano conservati. Report, ambiente, comandi e limiti correnti: [phase-0.4](verification/phase-0.4.md). CLI/export/presenter rimangono nel perimetro 0.6 Distribuzione, dopo 0.5 Impaginazione ([roadmap](ROADMAP.md)).

## Consolidamento 0.4.1

Schema 1.2.0, fixture e contratti di navigazione/eventi invariati. Le aggiunte sono additive.

**Asset.** `verifyAsset` accetta SVG con BOM, dichiarazione XML, istruzioni di elaborazione, commenti e un DOCTYPE `svg` (anche con internal subset) prima della radice `<svg`: il prologo viene saltato senza interpretare DTD o entità. SVG, VTT e `text/plain` sono decodificati in UTF-8 a blocchi in streaming, quindi un carattere a cavallo di un blocco è valido e un UTF-8 realmente invalido resta rifiutato. `sha256(blob)` usa `crypto.subtle` quando esiste; in un contesto non sicuro (HTTP fuori da localhost) usa un'implementazione SHA-256 locale (FIPS 180-4, verificata con i vettori NIST e contro `crypto.subtle`). Digest ed esito della verifica sono memoizzati per identità di Blob (immutabile) e metadati attesi: la stessa risorsa non viene riletta a ogni preview, un Blob o un digest diverso invalidano. Gli errori del resolver sono `AssetError` con `code` `missing | size | signature | digest | aborted`. `AssetResolver.revision?(assetId)` è facoltativo: identifica la risorsa dietro l'ID; `createAssetResolver` lo implementa e Studio/playground lo inoltrano.

**Player.** `PlayerOptions.messages?: Partial<PlayerMessages>` sostituisce qualunque testo del player e dei renderer builtin; `defaultMessages` contiene i default italiani. Le funzioni ricevono testo semplice e il risultato è sempre inserito come testo. `messages.lang` (default `it`) è applicato come `lang` ai controlli e ai testi di stato; la radice `.sd-player` riceve `metadata.language` e lo aggiorna con il documento. L'outline mostra testo derivato: testo, alt, label o titolo, e per Markdown/HTML/plugin il testo del contenuto già renderizzato e sanitizzato; mai il sorgente. `blockText(block, messages?)` segue la stessa regola.

`updateDocument` conserva il contratto osservabile (validazione prima, annullamento della transizione, history azzerata, `documentchange`) ma confronta scene e blocchi: matrici, titoli, dimensioni, visibilità e ordine sono aggiornati in loco; un `ContentMount` viene ricostruito solo se cambiano il blocco, i record degli asset referenziati (e la loro `revision`), la lingua per audio/video, le impostazioni del plugin, oppure se il renderer ha lanciato o un suo asset non si è risolto. I blocchi invariati ricevono il nuovo documento tramite `update()` del renderer, senza rimontaggio: lease e media in corso restano. Un test confronta il DOM prodotto da una sequenza di aggiornamenti con un mount completo. Il render per frame aggiorna soltanto la camera; attivazione dei blocchi, outline, scelte e regione live cambiano solo quando cambiano i loro dati. `NavigationMachine.peek()`/`getChoices()` nel core servono a questo, senza copie per frame.

**Store.** La pubblicazione dello snapshot è shallow: il documento è congelato una volta quando nasce e `dirty` confronta l'identità con il documento salvato, quindi selezione e pan non serializzano né congelano il documento. `coalesce(key, edit)` unisce le modifiche testuali della stessa sessione (titolo progetto a ogni tasto, titolo scena, note, sorgenti, dati JSON e label dei blocchi) in un solo comando undo; `endCoalesce()`, al blur, chiude la sessione; ogni altro comando, undo, redo o drag la chiude. Una sessione che torna al valore iniziale non lascia comandi. La serializzazione di un documento congelato è memoizzata (`documentJSON`).

**Storage.** `RecoveryRepository` apre `spatialdeck-studio` v3 (`DATABASE_VERSION`) e aggiunge l'indice multiEntry `assetKeys` su `recovery`; i dati v1/v2 si aggiornano senza perdita. `onWarning(listener)` notifica stati persistenti: `blocked` (un'altra scheda con versione precedente) attende senza fallire e si risolve da solo; `versionchange` chiude la connessione e la riapre alla richiesta successiva se il database è stato eliminato, oppure segnala una versione più recente e sospende l'autosave (`StorageVersionError`); il documento in memoria resta e Salva JSON funziona. `save` calcola le chiavi asset dal digest dichiarato o memoizzato, legge i byte solo per le chiavi assenti e non riscrive quelle presenti; la GC considera soltanto le chiavi delle revisioni eliminate e le conta con l'indice, senza caricare le revisioni degli altri progetti. Nuovi metodi: `markSaved(projectId, revision)`, `deleteRevision(projectId, revision)` (la head passa alla revisione più recente rimasta), `deleteProject(projectId)`. `pendingRecovery(heads)` esclude le head marcate `saved`; `Autosave.flush(document, saved)` marca o scrive la revisione corrispondente a un salvataggio su file; `Autosave.rebase` segue una head eliminata. `openLimitError(file)` nomina il tipo di file (JSON 10 MiB, archivio 220 MiB); `ARCHIVE_LIMIT` e `JSON_LIMIT` sono esportati dall'archivio. `randomId()` sostituisce `crypto.randomUUID`, assente nei contesti non sicuri.

**Produzione.** La CSP di `apps/studio/index.html` ha `connect-src 'self'`; un plugin Vite attivo solo con `serve` aggiunge `ws:` per l'HMR. I video hanno `playsinline`.

**Verifiche.** I test unitari DOM di player e plugins usano jsdom (`// @vitest-environment jsdom`), quelli dello storage `fake-indexeddb`; axe-core è iniettato negli E2E `tests/e2e/a11y.spec.ts` (violazioni serious/critical vietate, eccezioni motivate elencate nel file: oggi nessuna). Sono dipendenze di sviluppo esatte e non entrano nei bundle. `tests/e2e/consolidation.spec.ts` contiene le prove di fase: asset con digest su host HTTP non-localhost (instradato localmente dal browser di test), Studio con video da circa 50 MiB e immagini, testi e `lang`, dist di produzione, IndexedDB tra schede, eliminazione progetti e recupero condizionato. Coverage V8 con soglie per file: core 85/80, asset del player, plugins (sicurezza, archivio, media) ed editor (store, storage) con le soglie motivate nel [rapporto 0.4.1](verification/phase-0.4.1.md). La CI esegue anche `pnpm test:coverage` e verifica con `git diff --exit-code` che nessun controllo modifichi file tracciati; le Actions sono fissate per SHA.
