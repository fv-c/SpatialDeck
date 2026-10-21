# SpatialDeck — roadmap delle sei fasi

Baseline documentale: 21 ottobre 2026. Contratto normativo: [PROJECT_SPEC.md](PROJECT_SPEC.md). Stato iniziale verificato: solo `LICENSE` GPL v3, nessun codice applicativo; questa consegna aggiunge soltanto due documenti e sei prompt. Tutti i path applicativi/fixture/report seguenti sono proposti finché l'agente non ne verifica l'esistenza. Nessuna casella implementativa è già completata.

## 1. Matrice delle fasi

| Fase / prompt | Dipendenze reali | Deliverable | Accettazione osservabile | Rischi principali |
| --- | --- | --- | --- | --- |
| **0.1 Core** — [01-core](../prompts/01-core.md) | `LICENSE`, specifica e toolchain verificata; non richiede editor | pnpm/TS strict/Vite; core e player; schema `1.0.0`; demo vanilla; API, CI iniziale | Tre scene con XYZ/rotazioni/scale diverse visibili; next/prev/goTo/setPath e due istanze; schema/semantica e transizioni testate; destroy senza risorse residue; typecheck/lint/format/unit/build/boundaries/bundle e smoke reali | Convenzioni CSS/matrici; peer tooling; interruzioni e focus |
| **0.2 Editor** — [02-editor](../prompts/02-editor.md) | 0.1 eseguibile e relativa verifica; schema invariato | Studio React, mappa XY, inspector XYZ/Euler/scala, albero, preview condivisa, comandi, file JSON e IndexedDB | Creare/duplicare/eliminare/trascinare; un undo per drag; undo/redo e apertura invalida preservano dati; salva->riapri->player mantiene documento e posa; reload propone recovery; quota negata gestita | Divergenza preview/store; autosave non atomico; dipendenza browser picker |
| **0.3 Struttura** — [03-struttura](../prompts/03-struttura.md) | 0.1/0.2 regressioni verdi | Schema `1.1.0`, migrazione; UI grafi/parent/timeline; camera indipendente; history e overview | Fixture A->B->D e A->C->D con prev coerente; loop con uscita/limite; reparent world invariato; track 3 keyframe e interruzione senza snap/visite fantasma; apertura fixture `1.0.0` | Ambiguità history; gimbal lock; cue duplicati; UI timeline e graph eccessiva |
| **0.4 Contenuti** — [04-contenuti](../prompts/04-contenuti.md) | 0.3 + contratto plugin, profilo fiducia | Schema `1.2.0`; blocchi, asset/archivio, plugin SDK; editing/render; sicurezza e media | Demo testo/Markdown/HTML/SVG/LaTeX/immagine/audio/video; link ramo; plugin locale con dispose e roundtrip assente; payload ostili inerti; missing asset/codec/play denial con fallback; archivio riaperto offline | XSS/SVG/CSS; media permission; zip/traversal; plugin JS fidato |
| **0.5 Distribuzione** — [05-distribuzione](../prompts/05-distribuzione.md) | 0.4; Chromium disponibile; FFmpeg/ffprobe per video | CLI locale, bundle embed, HTML autonomo, PDF, video minimo, presenter e shell Studio cacheabile | HTML file:// con rete disabilitata e zero richieste remote; PDF 1 pagina/visita; WebM frame/durata entro contratto; note assenti dal pubblico; popup denial gestito; CLI exit code negativi | file origin/CSP, codec e font; tempo capture; leakage note; shell offline |
| **1.0 Stabilizzazione** — [06-stabilizzazione](../prompts/06-stabilizzazione.md) | Tutte le precedenti con prove; nessun nuovo schema salvo decisione esplicita | Import essenziale impress.js, diagnostica/fixture; hardening, browser matrix, benchmark, documentazione e candidato release | Mapping attributi ufficiali e sei ordini rotazione con confronto matrici; E2E/migrazioni/export non regrediti; target reali registrati; budget misurati; licenze; nessun blocker P0/P1; altrimenti lista blocker e nessuna dichiarazione stabile | CSS/plugin upstream non convertibili; hardware/browser assenti; prestazioni non misurate; licenza della libreria |

Dipendenza strettamente sequenziale: `0.1 -> 0.2 -> 0.3 -> 0.4 -> 0.5 -> 1.0`. Ogni agente parte dallo stato effettivo, legge indici/architettura prima dei sorgenti interessati e preserva cambi dell'utente. Se il predecessore manca o è rotto, documenta il requisito mancante, corregge solo regressioni pertinenti e non inventa deliverable né implementa automaticamente più fasi.

## 2. Minimo funzionante e dimostrazioni cumulative

**0.1 è il minimo framework utilizzabile:** una pagina vanilla reale, tre scene, controlli, API e lifecycle. Nessun editor vuoto o pannello cosmetico conta come risultato. **0.2 è il minimo prodotto per non programmatori:** un utente crea e presenta un documento salvabile senza scrivere codice. Le successive versioni ampliano quel prodotto mantenendolo eseguibile, non lo riscrivono.

| Fase | Fixture/demo proposta | Percorso di prova e prova negativa |
| --- | --- | --- |
| 0.1 | `examples/core-three-scenes/project.json`; playground `/core` | Apri, naviga 1->2->3, interrompi 2->3, destroy/remount; JSON o target assente rifiutati |
| 0.2 | `examples/editor-roundtrip/project.json`; Studio | Crea tre scene, drag/inspector, undo, save, riapri in nuova sessione e player; JSON rotto non sostituisce il documento |
| 0.3 | `examples/structure-branching/project.json` | A->B->D->prev=B, A->C->D->prev=C; loop D->A limitato; parent ciclo rifiutato; camera track senza snap |
| 0.4 | `examples/content-gallery/project.json` + asset locali e `.spatialdeck` prodotto | Gallery e plugin di esempio, export/import archivio; XSS, asset mancante, autoplay negato, plugin assente |
| 0.5 | `examples/distribution-static/project.json` + `itinerary.json` | Bundle e HTML offline; PDF tre pagine; WebM 30fps; media dinamici nel video strict rifiutati |
| 1.0 | `packages/impress-compat/test/fixtures/` e matrice finale | Import inerte di HTML controllati, diagnostica di CSS/plugin; fixture storiche e regressioni cumulative |

Le fixture storiche si conservano nella propria versione per testare migrazioni; gli esempi correnti possono avere copie migrate, senza sostituire le fonti storiche. Route/nomi sono obiettivi da confermare nel codice reale. Documenti e API precedenti si conservano o cambiano con migrazioni esplicite.

## 3. Evoluzione schema e API

| Tappa | Documento scritto | API nuove, senza anticipare codice delle fasi successive |
| --- | --- | --- |
| 0.1 | `schemaVersion: "1.0.0"`, capacità linear | validate/migrate infrastruttura/serialize, math, createPlayer, mount/destroy/goTo/next/prev/setPath/getState/on |
| 0.2 | `1.0.0` invariato | updateDocument validato/atomico; editor commands e storage senza dati UI nel JSON |
| 0.3 | `1.1.0`, migrazione da 1.0.0 | parent, graph, cameraTracks/cues, history branching; setView/setCamera e choice-required |
| 0.4 | `1.2.0`, migrazione da 1.1.0 | Union blocchi e plugin API 1.0.0, AssetResolver concreto, pluginSettings |
| 0.5 | `1.2.0` invariato | renderAt/capture, CLI, manifest e itinerary esterni |
| 1.0 | `1.2.0` invariato | Importer; facade impress facoltativa e isolata; versionamento pubblico |

Versione del prodotto, del documento e dell'API plugin sono indipendenti. Il solo aumento minor dello schema non autorizza vecchi lettori a ignorare campi ignoti. Dati plugin ignoti restano invece opachi e roundtrip. Se serve cambiare questo piano, registrare ADR nella specifica, aggiornare tutti i prompt coinvolti e aggiungere fixture/migrazione prima di cambiare i consumatori.

## 4. Snodi decisionali e compromessi fissati

1. **Prima del bootstrap:** confermare la baseline Node 24.22.0 / pnpm 12.14.0 / TS 6.0.3 / Vite 8.3.5 con installazione reale. I metadati sono stati verificati, le build no. TS 7 non entra finché il linter non lo supporta. La licenza GPL esistente non va sostituita per rendere più semplice l'embed.
2. **Prima del canvas editor:** la mappa XY è UI di authoring; preview e presentazione sono sempre `@spatialdeck/player`. Vietato un renderer React parallelo. Reparent arriva in 0.3, non va simulato nel 0.2.
3. **Prima della struttura:** adottare latest-wins, commit history al completamento e `prev()` sulla visita reale. Decisioni sui loop e camera indipendente vanno fissate prima della timeline. Uniform scale evita shear; gizmo 3D completo fuori perimetro.
4. **Prima dei contenuti:** sanitizzazione unica e registry plugin host-approved. Nessun codice caricato dal JSON. ZIP con asset è trasporto portabile; JSON resta canonico. Web MIDI facoltativo, bridge OSC fuori requisito.
5. **Prima degli export:** profili espliciti. Video minimo statico e senza audio è obbligatorio e verificabile; media dinamici nel player non implicano supporto video. HTML autonomo non incorpora il web esterno arbitrario.
6. **Prima della stabilità:** pin baseline impress.js, browser reali e ambiente benchmark. Se CSS sorgente non è convertibile, warning concreto; se Safari o budget non sono verificati, il gate resta aperto. Nessun tag o publish in questa fase.

## 5. Gate trasversali e comandi

Ogni fase DEVE implementare, testare e documentare il proprio perimetro; correggere gli errori prima del completamento. Il report futuro `docs/verification/phase-<versione>.md` include istruzioni di avvio, ambiente, comandi ed exit code, numero di test pass/fail/skip, artefatti, decisioni e limiti. Blocchi ambientali si dichiarano come verifiche non eseguite; non si fabbricano test verdi.

Comandi root previsti: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm test:e2e`, `pnpm build`, `pnpm check:boundaries`, `pnpm check:bundle`. Verificare gli script effettivi e crearli nei moduli di competenza prima di invocarli; non assumere che esistano nel repository iniziale. Installazione browser esplicita, nessun servizio remoto per demo. Da 0.2 verificare `pnpm dev:studio`; da 0.5 `pnpm spatialdeck --help` e output reali. Tutte le fasi eseguono controlli regressivi pertinenti delle precedenti.

| Area | Requisito iniziale | Approfondimento successivo |
| --- | --- | --- |
| Sicurezza | Input/schema/ID/path, textContent, confini pacchetti | Sanitizzazione e ZIP in 0.4, export/CSP in 0.5, audit completo in 1.0 |
| Accessibilità | Focus, keyboard, reduced motion, outline in 0.1 | Editor 0.2, graph/timeline 0.3, media/alt 0.4; screen reader reale prima di 1.0 |
| Determinismo | Clock e sampler puri in 0.1 | Track/cue 0.3; frame export 0.5 |
| Lifecycle | Due istanze e destroy senza residui in 0.1 | Storage/listener editor e media/plugin nelle fasi che li introducono |
| Bundle | Player/core privi di React/editor, budget gzip | Entry point plugin e CLI separati; nessun aumento non misurato |
| Persistenza | JSON e validazione | Recovery IndexedDB 0.2, archivio asset 0.4, migrazioni storiche sempre |

Budget normativi nella specifica: core+player <=100 KiB gzip JS / <=20 KiB CSS; fixture 100 scene; p95 mount <=1000 ms e validazione <=100 ms su runner registrato; p95 frame <=34 ms senza long task >200 ms; input->preview <=100 ms; zero risorse possedute dopo 50 destroy; delta heap <=5 MiB con GC controllata. Queste sono soglie da misurare, non prestazioni già ottenute. Timing in CI rumorosa resta informativo, gate prestazionale pre-1.0 su ambiente controllato.

## 6. Release 1.0: gate di uscita

- [ ] Sei fasi eseguite individualmente con report e demo cumulativi reali.
- [ ] Player indipendente da editor/React; editor senza matematica o rendering concorrenti.
- [ ] Schema corrente e tipi allineati; fixture 1.0.0/1.1.0/1.2.0 e migrazioni senza perdita.
- [ ] Navigazione a rami/loop/history/interruzione, gerarchie e keyframe verificati.
- [ ] Contenuti builtin, sanitizzazione e trust model documentati e testati.
- [ ] JSON/archivio e recovery reali, incluso errore quota o asset assente.
- [ ] Embed, HTML offline, PDF e video minimo realmente prodotti e ispezionati; manifest accurati.
- [ ] Presenter senza note nel pubblico e con fallback popup.
- [ ] Import impress.js essenziale con mapping e warning; nessuna compatibilità totale dichiarata.
- [ ] Browser matrix: Chromium/Firefox/WebKit automatici, Chrome/Edge/Safari reali secondo policy; smoke touch e screen reader registrati o blocker espliciti.
- [ ] Budget misurati con hardware/browser/build e risultati, senza claim non supportati.
- [ ] CI completa, pacchetti locali installabili, tipi pubblici, licenze/attribuzioni e documentazione riproducibile.
- [ ] Nessun P0/P1, perdita dati o rischio sicurezza noto irrisolto; backlog classificato.

Se una condizione obbligatoria manca: `docs/RELEASE_BLOCKERS.md` con riproduzione, impatto, evidenza mancante e criterio di chiusura. Preparare candidato senza dichiararlo stabile. **Fermarsi:** nessuna fase successiva automatica, deploy/publish/push/tag/commit remoto o operazione distruttiva non richiesta.

## 7. Audit documentale effettuato in questa consegna

Gli otto file definiscono esattamente sei prompt, nell'ordine richiesto, ognuno con dieci sezioni operative, test, Definition of Done e stop condition. Le dipendenze preservano player/core senza React e una sola preview; schema e API hanno tappe/migrazioni esplicite. Ogni fase prescrive demo eseguibile e prove verificabili; export/import distinguono capacità, dipendenze e limitazioni; sicurezza e accessibilità attraversano tutte le fasi. Impress.js è riferimento e formato d'import limitato, senza equivalenza garantita. L'audit è redazionale/contrattuale: nessuna delle sei implementazioni è stata avviata e non sono stati eseguiti test applicativi.

Esito effettivo della consegna: **32 controlli documentali superati**, eseguiti con Python e jsonschema già disponibili, senza installazioni. Inclusi meta-validazione Draft 2020-12, convalida dell'esempio a tre scene e rifiuto di cinque varianti strutturalmente invalide (scala zero, campo ignoto, vettore incompleto, versione futura e blocco HTML prematuro). Verificati conteggio/ordine/sezioni dei prompt, perimetri/test/stop/handoff, riferimenti/schema/API, tabelle/fence/link/whitespace, LICENSE invariata e assenza di aggiunte diverse dagli otto Markdown. I controlli di presenza contrattuale non dimostrano funzionalità del prodotto: implementazione, installazione e test applicativi restano interamente da eseguire nelle sei fasi.

## 8. Avanzamento implementativo verificato — 21 ottobre 2026

0.1 ha ora codice e demo production eseguibili nei path proposti: core/player, schema 1.0.0, tre scene e due istanze vanilla, validazione, matematica, navigazione/history/cancel, input/focus/outline, CSP e teardown. Toolchain installata ai pin documentati e frozen install verificata. Dettagli e conteggi effettivi nel [rapporto 0.1](verification/phase-0.1.md), API nella [guida](DEVELOPMENT.md).

I gate applicativi locali passano ora su tutti e tre i motori senza skip: Chromium/Firefox con Playwright 1.64.1 e WebKit con runner dedicato 1.61.1 per macOS 14. Il runner di compatibilità è autorizzato, separato nel workspace/lockfile e usa la stessa suite. La CI Linux ha verificato la 1.64.1 sui tre browser: 85 unità e 30 E2E passati, zero skip, [run 39596586324](https://github.com/fv-c/SpatialDeck/actions/runs/39596586324) sul commit `07916cc`. Il risultato Linux è distinto dalla prova locale macOS 14; 0.2 non è avviata. Safari reale, screen reader, heap/GC e benchmark controllati restano nelle verifiche di stabilizzazione previste.

## 9. Avanzamento Editor 0.2 — 21 ottobre 2026

Studio 0.2 è implementato nei path previsti: editor React, mappa XY con geometria core, inspector, scene/duplicazione/eliminazione, undo/redo atomici, preview/presentazione player condivise, file JSON e IndexedDB. Schema resta 1.0.0. Il [rapporto 0.2](verification/phase-0.2.md) registra 119 unità + 66 E2E locali passati, zero fail/skip, roundtrip tramite file reale e nuova sessione con confronto modello/camera/landmark, recovery dopo reload, quota negata/rollback e conflitti in due tab. Tutti gli script contrattuali e i due server dev sono verificati.

La prova locale conserva il runner WebKit macOS 14 1.61.1 e il principale 1.64.1 per Chromium/Firefox. La CI Linux 0.2 non è stata eseguita; l'evidenza remota della sezione 8 resta limitata a 0.1. La guida autore è in [AUTHORING](AUTHORING.md). Le restrizioni per path importati non sincronizzati e l'espulsione della history sono dichiarate nella specifica e nel rapporto. Il punto di partenza per 0.3 è ora questo editor con tutte le regressioni 1.0.0; nessun lavoro strutturale futuro è stato anticipato.
