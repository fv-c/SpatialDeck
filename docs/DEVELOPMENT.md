# Sviluppo e API 0.2

## Struttura verificata

| Percorso                                  | Responsabilità                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------------- |
| `packages/core/schema`                    | Schema normativo 1.0.0 esportato come `@spatialdeck/core/schema`                |
| `packages/core/src/document`              | Tipi derivati, validatore standalone, parser/semantica, diagnostica, serializer |
| `packages/core/src/math`                  | Matrici, quaternioni, auto-fit e vista camera                                   |
| `packages/core/src/navigation`            | Macchina lineare, visite, interruzione e clock attivo                           |
| `packages/core/src/timing`                | Sampler puro e easing                                                           |
| `packages/core/src/events`                | Payload degli eventi tipizzati                                                  |
| `packages/player/src/index.ts`            | Factory, DOM, input, accessibilità e risorse per istanza                        |
| `packages/player/src/browser.ts`          | Entrypoint di build che raccoglie anche il CSS                                  |
| `packages/editor`                         | Store immutabile, comandi atomici, React UI, file e IndexedDB                   |
| `apps/studio`                             | App React/Vite locale su porta 5174                                             |
| `apps/playground`                         | Demo Vite vanilla con due player su `/core`                                     |
| `examples/core-three-scenes/project.json` | Esempio normativo di tre scene, conservato in 1.0.0                             |
| `scripts`                                 | Generazione, verifica confini e budget bundle                                   |
| `tests/e2e`                               | Geometria e lifecycle su browser reali                                          |

Core non dipende da DOM, player, filesystem o React. Il typecheck delle dichiarazioni core usa la sola libreria ES2022 e i tipi delle API standard Node, senza lib DOM. Il player dipende dal core. Il bundle standalone comprende soltanto i piccoli helper Ajv necessari e gl-matrix; il compilatore Ajv è usato esclusivamente dal generatore Node.

Il runner `tools/webkit-macos14` è un workspace privato con l'unica dipendenza di sviluppo `@playwright/test@1.61.1`. Non è una libreria del prodotto e non entra nel bundle. Il pacchetto root mantiene `@playwright/test@1.64.1`.

## Toolchain e installazione

Tutti i pin della baseline sono conservati, senza peer forzati. È stata aggiunta l'eccezione approvata per il solo runner WebKit di macOS 14: Playwright 1.61.1 in un workspace separato, fissato anche nel lockfile. [Metadati verificati e ambiente](verification/environment.json). Il pnpm locale ha aggiunto l'eccezione temporale puntuale `vite@8.3.5` alla sua policy di release age. `strictPeerDependencies` rimane attivo.

Per questa esecuzione il computer aveva Node 25.8.1 e pnpm 11.25.0. Sono stati installati strumenti locali ignorati da Git, senza cambiare quelli globali:

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

Report/trace vengono scritti in `test-results/current/` e `test-results/webkit-macos14/`; il launcher registra versioni, progetti, exit e conteggi in `test-results/e2e-summary.json`. Il comando dedicato aggiorna il riepilogo per la propria esecuzione. Il rapporto permanente conserva i risultati della suite completa in `docs/verification/e2e-results.json`.

Il runtime WebKit per macOS 14 è congelato. La 1.61.1 evita il comando di protocollo incompatibile introdotto nelle versioni successive: [issue Playwright #42964](https://github.com/microsoft/playwright/issues/42964). Questa prova locale non equivale alla matrice Linux con 1.64.1 né a Safari installato.

## Generazione e build

`pnpm generate` legge lo schema JSON, produce il validatore Ajv standalone ESM e deriva i tipi TypeScript dallo stesso schema. Non modificare a mano `document/types.ts` o `document/validator.js`. Non sono presenti migrazioni future: `migrateDocument` riconosce soltanto `1.0.0`, restituisce una copia e rifiuta tutte le altre versioni.

Vite library mode genera JS ESM e CSS separato; tsc genera `.d.ts`. Il consumer deve importare il CSS pubblico. `pnpm check:bundle`, dopo la build, crea un consumer minimo dal JS e dal CSS distribuiti, comprime con gzip livello 9 e misura entrambi. `pnpm check:boundaries` controlla dipendenze, sorgenti e output. Nessun pacchetto futuro vuoto.

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
- `migrateDocument(unknown)` usa il dispatcher della sola versione 1.0.0; non anticipa migrazioni.
- `serializeDocument(document)` restituisce `Result<string>`, con chiavi ordinate, array preservati e newline finale. Rifiuta input invalido.
- `getWorldMatrix(document, sceneId)` restituisce `Result<number[]>`, matrice column-major.
- `resolveSceneCamera(document, sceneId)` restituisce `Result<CameraPose>`; rotazione interna quaternion `[x,y,z,w]`.
- `sampleTransition({from,to,durationMs,easing}, elapsedMs)` restituisce `{camera,progress}`. È puro, senza eventi; argomenti numerici invalidi sollevano RangeError. L'API operativa del player restituisce invece risultati, senza rejection per errori di navigazione.

La validazione applica schema strict, finitezza, ID/riferimenti, visibilità dei target, catene raggiungibili senza cicli, limiti byte/profondità e asset relativi sicuri. Niente schema alternativo nel player. Estensioni JSON opache preservate senza esecuzione. `holdMs` è conservato e non attiva autoplay.

### Player

`PlayerOptions`: `input?: boolean`, `keymap?: Record<string,'next'|'prev'>`, `motion?: 'system'|'reduced'`, `clock?: PlayerClock`, `onError?: (diagnostic)=>void`. Una keymap fornita sostituisce la mappa predefinita. Non sono anticipati resolver media o registry plugin della fase contenuti.

`PlayerClock` espone `now()`, `request(callback)` e `cancel(id)`. `NavigationOptions` accetta `durationMs` intera tra 0 e 60000 e `signal` compatibile con AbortSignal. Il clock normale usa performance.now e RAF; nessun timer governa l'interpolazione.

| Metodo                             | Risultato                                                                                                                                                      |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mount(container, document)`       | `Promise<Result<void>>`; primo nodo immediato, ready prima della risoluzione                                                                                   |
| `goTo({pathId?,nodeId}, options?)` | `Promise<NavigationResult>`; node ID identifica una visita target anche se più nodi usano la stessa scena                                                      |
| `next({edgeId?}?)`, `prev()`       | Navigazione dalla visita completata; prev usa la history effettiva                                                                                             |
| `setPath(pathId)`                  | Seleziona start immediatamente e azzera history; un path vuoto porta a empty                                                                                   |
| `getState()`                       | Snapshot indipendente: status, pathId/nodeId/sceneId, history, camera, transition, choices, diagnostics                                                        |
| `on(event, handler)`               | Unsubscribe locale; handler lancianti isolati, riportati come HANDLER_ERROR                                                                                    |
| `updateDocument(document)`         | Valida prima; annulla la transizione senza visite fantasma, conserva nodo/path se presenti altrimenti start, azzera history, aggiorna DOM e camera senza focus |
| `destroy()`                        | Idempotente; cancella pending, emette destroy e rimuove tutte le risorse possedute                                                                             |

`NavigationResult.status`: completed, noop, cancelled, choice-required oppure error. Nel modello lineare non occorre choice-required. I codici includono UNKNOWN_NODE, UNKNOWN_PATH, UNKNOWN_EDGE, INVALID_DURATION, PLAYER_UNMOUNTED e PLAYER_DESTROYED. Eventi attivi: ready, navigationstart, navigationcancel, scenechange, navigationend, diagnostic, documentchange, destroy; choice è tipizzato per il risultato comune, senza grafi in questa fase. documentchange segue un aggiornamento riuscito; mediaerror resta nella fase contenuti.

Ordine: eventuale cancel precedente, start nuovo, scenechange e end al commit, poi Promise completed. Nessuna visita annullata entra nella history. Noop e comandi invalidi non interrompono il piano valido; 10 next ravvicinati mirano sempre al successore dell'ultima visita completata. La posizione corrente è campionata prima della sostituzione. AbortSignal conserva la posa visuale. Il tempo attivo si congela quando il documento è hidden. Il cambio reduced motion completa subito con un solo commit.

### Geometria e accessibilità

Unità CSS, X destra/Y basso/Z verso osservatore; `M=T*Rz*Ry*Rx*S`, pivot centrale e wrapper contenuto separato. La camera è un piano di riferimento: `V=S(zoom)*inverse(C)`. Una sola prospettiva sul viewport; scala esterna contain. Auto-fit: `0.9 * min(viewportWidth/sceneWidth, viewportHeight/sceneHeight) / sceneScale`. Slerp arco breve e zoom logaritmico; nessuna somma Euler o interpolazione delle matrici.

Frecce, PageUp/PageDown e spazio agiscono soltanto sul container focalizzato e sui suoi contenuti; input, textarea, select, contenteditable, audio/video e controlli interattivi non sono intercettati. Tastiera e outline spostano il focus sul target al completamento; mount non ruba focus. Una chiamata API programmata non sposta il focus se l'utente è in un campo di testo. Scene non attive sono inert/aria-hidden. La vista testuale espone tutto il percorso una sola volta e naviga senza movimento; è anche il fallback se CSS 3D non è disponibile. Le preferenze reduced motion del sistema prevalgono sulle impostazioni autoriali.

Sicurezza: textContent per contenuti, nessun eval/innerHTML, nessuna rete obbligatoria. La CSP dimostrata omette unsafe-eval; ammette gli stili inline necessari alle matrici CSS. Non è una certificazione WCAG o un test screen reader.

## Limiti e prossima fase

WebKit locale verificato con il runner macOS 14 dedicato e CI Linux con Playwright 1.64.1 superata sui tre browser; la prova Safari reale rimane non eseguita: [evidenza](verification/phase-0.1.md). Non sono misurati heap dopo GC, benchmark 100 scene o timing p95: sono gate successivi di stabilizzazione, non prestazioni dichiarate. Studio 0.2 è implementato con schema 1.0.0 invariato: [guida autore](AUTHORING.md), [verifica](verification/phase-0.2.md). Parent, grafi, timeline, blocchi oltre text, CLI/export, deploy e pubblicazione rimangono fuori fase.

## Editor e integrazione Studio

`@spatialdeck/editor` esporta `Studio`, `EditorStore`, comandi (`createScene`, `editScene`, `deleteScene`), `emptyProject`, `RecoveryRepository`, `Autosave` e CSS pubblico. React/React DOM 19.3.1 sono peer; core/player non dipendono da React. `Studio` accetta store/repository opzionali e `onPlayer(player, present)` per integrazioni. L'app espone esplicitamente `window.studio` con store/repository e riferimenti ai player, come il playground vanilla espone le sue istanze.

`EditorStore.getSnapshot()` restituisce documento e sessione congelati; `subscribe` è compatibile con `useSyncExternalStore`. `execute(edit, selectNew?)` clona, applica e convalida prima del commit. Undo/redo usano snapshot prima/dopo, con espulsione dei più vecchi oltre **100 comandi oppure 20 MiB UTF-8 complessivi**; un comando singolo oltre il budget viene applicato ma escluso dalla history. Selezione, camera mappa, dirty e history non entrano nel JSON. `beginDrag/moveDrag/endDrag/cancelDrag` mantengono un solo comando e permettono Escape. Preview coalesciata via RAF; salvataggio usa il medesimo documento validato.

Le modifiche strutturali aggiornano il percorso principale preservando nodi/edge non coinvolti. I vicini ricuciti ricevono defaultTransition; undo ripristina esattamente riferimenti e transizioni. Scene referenziate da altri percorsi non si possono eliminare: messaggio con nomi e conteggi. Un principale con visite ripetute o ordine diverso dalle scene rifiuta le modifiche strutturali; apertura, contenuti e trasformazioni rimangono disponibili senza perdere dati.

IndexedDB `spatialdeck-studio` v1 contiene `documents` (head per projectId) e `recovery` (projectId/revision). Una sola transazione readwrite confronta la revisione attesa, scrive entrambi e rimuove le revisioni oltre le ultime dieci. L'autosave serializza le scritture, attende 750 ms e non riscrive snapshot identici. Il recupero adotta la revisione scelta senza reclamarne una nuova. Conflitti/quota/permessi producono warning persistenti, mai sostituzione del documento attivo; download JSON disponibile. Flush su save e visibilitychange come best effort, nessuna garanzia unload. Recovery è una proposta esplicita, non un backup.

`pnpm dev:studio` e `pnpm dev:playground` risolvono i sorgenti con Vite, anche senza dist. La suite E2E avvia due server production sulle porte 4173/4174, sempre senza backend. L'editor di libreria produce ESM, dichiarazioni e `editor.css` comprensivo del CSS player.
