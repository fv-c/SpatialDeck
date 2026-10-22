# SpatialDeck — roadmap delle fasi

Baseline documentale: 21 ottobre 2026. Contratto normativo: [PROJECT_SPEC.md](PROJECT_SPEC.md). Stato iniziale verificato: solo `LICENSE` GPL v3, nessun codice applicativo; questa consegna aggiunge soltanto due documenti e sei prompt. Tutti i path applicativi/fixture/report seguenti sono proposti finché l'agente non ne verifica l'esistenza. Nessuna casella implementativa è già completata.

**Revisione del 22 ottobre 2026.** Dopo l'audit pre-distribuzione la sequenza è `0.1 -> 0.2 -> 0.3 -> 0.4 -> 0.4.1 Consolidamento -> 0.5 Impaginazione -> 0.6 Distribuzione -> 1.0 Stabilizzazione`, con il gate decisionale G0 prima di 0.5, chiuso il 22 ottobre 2026 (decisioni nella [specifica, sezione 21](PROJECT_SPEC.md)). Motivazione e decisioni aperte nella [specifica, sezione 19](PROJECT_SPEC.md); mappa carenze→fasi nella sezione 12 di questo documento. I prompt sono locali ed esclusi dai commit: i link alla cartella `prompts/` funzionano solo nel checkout del maintainer.

## 1. Matrice delle fasi

| Fase / prompt | Dipendenze reali | Deliverable | Accettazione osservabile | Rischi principali |
| --- | --- | --- | --- | --- |
| **0.1 Core** — [01-core](../prompts/01-core.md) | `LICENSE`, specifica e toolchain verificata; non richiede editor | pnpm/TS strict/Vite; core e player; schema `1.0.0`; demo vanilla; API, CI iniziale | Tre scene con XYZ/rotazioni/scale diverse visibili; next/prev/goTo/setPath e due istanze; schema/semantica e transizioni testate; destroy senza risorse residue; typecheck/lint/format/unit/build/boundaries/bundle e smoke reali | Convenzioni CSS/matrici; peer tooling; interruzioni e focus |
| **0.2 Editor** — [02-editor](../prompts/02-editor.md) | 0.1 eseguibile e relativa verifica; schema invariato | Studio React, mappa XY, inspector XYZ/Euler/scala, albero, preview condivisa, comandi, file JSON e IndexedDB | Creare/duplicare/eliminare/trascinare; un undo per drag; undo/redo e apertura invalida preservano dati; salva->riapri->player mantiene documento e posa; reload propone recovery; quota negata gestita | Divergenza preview/store; autosave non atomico; dipendenza browser picker |
| **0.3 Struttura** — [03-struttura](../prompts/03-struttura.md) | 0.1/0.2 regressioni verdi | Schema `1.1.0`, migrazione; UI grafi/parent/timeline; camera indipendente; history e overview | Fixture A->B->D e A->C->D con prev coerente; loop con uscita/limite; reparent world invariato; track 3 keyframe e interruzione senza snap/visite fantasma; apertura fixture `1.0.0` | Ambiguità history; gimbal lock; cue duplicati; UI timeline e graph eccessiva |
| **0.4 Contenuti** — [04-contenuti](../prompts/04-contenuti.md) | 0.3 + contratto plugin, profilo fiducia | Schema `1.2.0`; blocchi, asset/archivio, plugin SDK; editing/render; sicurezza e media | Demo testo/Markdown/HTML/SVG/LaTeX/immagine/audio/video; link ramo; plugin locale con dispose e roundtrip assente; payload ostili inerti; missing asset/codec/play denial con fallback; archivio riaperto offline | XSS/SVG/CSS; media permission; zip/traversal; plugin JS fidato |
| **0.4.1 Consolidamento** — [04b-consolidamento](../prompts/04b-consolidamento.md) | 0.4 con regressioni verdi; audit del 22 ottobre 2026; nessuna decisione G0 necessaria | Correzioni firme/digest asset, preview/store/autosave incrementali, testi del player sostituibili e `lang`, outline derivata, hardening Studio/IndexedDB, CI con axe e coverage plugins/editor | SVG con prologo e VTT UTF-8 >4 KiB accettati; asset con digest serviti su HTTP non-localhost; p95 input->preview <=100 ms con 50 MiB di media; nessun `ws:` né `window.studio` in produzione; progetti locali eliminabili; schema 1.2.0 invariato | Regressioni della preview incrementale; differenze IndexedDB tra browser |
| **0.5 Impaginazione** — [05-impaginazione](../prompts/05-impaginazione.md) | 0.4.1; G0 punto 4 (modello di layout) confermato | Schema `1.3.0` e migrazione; frame dei blocchi in scene canvas, tema, aspetto scena, stile a token; editor di scena sulla preview del player | Fixture canvas con contenuti affiancati, sovrapposti e ruotati; fixture storiche migrate senza differenze di resa; un undo per gesto; ordine di lettura indipendente da `z` verificato con tastiera e outline; nessuna stringa CSS nel documento | Divergenza editor/player; ordine di lettura; prestazioni del drag; font e licenze |
| **0.6 Distribuzione** — [06-distribuzione](../prompts/06-distribuzione.md) | 0.5; G0 punti 1–2 per licenza e scope; Chromium disponibile; FFmpeg/ffprobe per video | CLI locale, packaging corretto, bundle embed, HTML autonomo, PDF, video minimo, presenter e shell Studio cacheabile | HTML file:// con rete disabilitata e zero richieste remote; PDF 1 pagina/visita; WebM frame/durata entro contratto; note assenti dal pubblico; popup denial gestito; CLI exit code negativi; export fedeli a canvas/tema/font; tarball installati e provati in consumer esterno; note di terze parti; consumer realistico misurato | file origin/CSP anche per KaTeX, codec e font; tempo capture; leakage note; shell offline; licenze |
| **1.0 Stabilizzazione** — [07-stabilizzazione](../prompts/07-stabilizzazione.md) | Tutte le precedenti con prove; schema 1.3.0 congelato salvo decisione esplicita | Import essenziale impress.js, diagnostica/fixture; hardening, browser matrix, benchmark, documentazione (CHANGELOG, CONTRIBUTING, SECURITY) e candidato release | Mapping attributi ufficiali e sei ordini rotazione con confronto matrici; E2E/migrazioni/export non regrediti; target reali registrati; budget misurati; licenze; nessun blocker P0/P1; altrimenti lista blocker e nessuna dichiarazione stabile | CSS/plugin upstream non convertibili; hardware/browser assenti; prestazioni non misurate; licenza della libreria |

Dipendenza strettamente sequenziale: `0.1 -> 0.2 -> 0.3 -> 0.4 -> 0.4.1 -> 0.5 -> 0.6 -> 1.0`; G0 andava chiuso prima di 0.5 (modello di layout) e prima di qualsiasi publish (licenza, scope): è chiuso dal 22 ottobre 2026 (sezione 14). Ogni agente parte dallo stato effettivo, legge indici/architettura prima dei sorgenti interessati e preserva cambi dell'utente. Se il predecessore manca o è rotto, documenta il requisito mancante, corregge solo regressioni pertinenti e non inventa deliverable né implementa automaticamente più fasi.

## 2. Minimo funzionante e dimostrazioni cumulative

**0.1 è il minimo framework utilizzabile:** una pagina vanilla reale, tre scene, controlli, API e lifecycle. Nessun editor vuoto o pannello cosmetico conta come risultato. **0.2 è il minimo prodotto per non programmatori:** un utente crea e presenta un documento salvabile senza scrivere codice. Le successive versioni ampliano quel prodotto mantenendolo eseguibile, non lo riscrivono.

| Fase | Fixture/demo proposta | Percorso di prova e prova negativa |
| --- | --- | --- |
| 0.1 | `examples/core-three-scenes/project.json`; playground `/core` | Apri, naviga 1->2->3, interrompi 2->3, destroy/remount; JSON o target assente rifiutati |
| 0.2 | `examples/editor-roundtrip/project.json`; Studio | Crea tre scene, drag/inspector, undo, save, riapri in nuova sessione e player; JSON rotto non sostituisce il documento |
| 0.3 | `examples/structure-branching/project.json` | A->B->D->prev=B, A->C->D->prev=C; loop D->A limitato; parent ciclo rifiutato; camera track senza snap |
| 0.4 | `examples/content-gallery/project.json` + asset locali e `.spatialdeck` prodotto | Gallery e plugin di esempio, export/import archivio; XSS, asset mancante, autoplay negato, plugin assente |
| 0.4.1 | Gallery 0.4 più fixture asset limite (SVG con prologo/DOCTYPE, VTT UTF-8 >4 KiB, video 50 MiB) | Asset validi accettati e digest su HTTP non-localhost; preview fluida con media; player in lingua diversa con testi sostituiti; firme davvero errate ancora rifiutate |
| 0.5 | `examples/layout-canvas/project.json` | Titolo nascosto, immagine e testo affiancati, elementi sovrapposti e ruotati, ordine di lettura diverso dall'ordine visivo, tema non predefinito; frame fuori scena, CSS nel documento e PaletteId ignoto rifiutati |
| 0.6 | `examples/distribution-static/project.json` + `itinerary.json`, con almeno una scena canvas e un font del tema | Bundle e HTML offline; PDF tre pagine; WebM 30fps; media dinamici nel video strict rifiutati; consumer da tarball |
| 1.0 | `packages/impress-compat/test/fixtures/` e matrice finale | Import inerte di HTML controllati, diagnostica di CSS/plugin; fixture storiche e regressioni cumulative |

Le fixture storiche si conservano nella propria versione per testare migrazioni; gli esempi correnti possono avere copie migrate, senza sostituire le fonti storiche. Route/nomi sono obiettivi da confermare nel codice reale. Documenti e API precedenti si conservano o cambiano con migrazioni esplicite.

## 3. Evoluzione schema e API

| Tappa | Documento scritto | API nuove, senza anticipare codice delle fasi successive |
| --- | --- | --- |
| 0.1 | `schemaVersion: "1.0.0"`, capacità linear | validate/migrate infrastruttura/serialize, math, createPlayer, mount/destroy/goTo/next/prev/setPath/getState/on |
| 0.2 | `1.0.0` invariato | updateDocument validato/atomico; editor commands e storage senza dati UI nel JSON |
| 0.3 | `1.1.0`, migrazione da 1.0.0 | parent, graph, cameraTracks/cues, history branching; setView/setCamera e choice-required |
| 0.4 | `1.2.0`, migrazione da 1.1.0 | Union blocchi e plugin API 1.0.0, AssetResolver concreto, pluginSettings |
| 0.4.1 | `1.2.0` invariato | `PlayerOptions.messages`, `lang` dal documento, `updateDocument` incrementale con stesso contratto osservabile |
| 0.5 | `1.3.0`, migrazione da 1.2.0 | Frame/tema/aspetto/stile, capacità layout, conversione frame↔scena nel core; editor di scena |
| 0.6 | `1.3.0` invariato | renderAt/capture, CLI, manifest e itinerary esterni |
| 1.0 | `1.3.0` invariato | Importer; facade impress facoltativa e isolata; versionamento pubblico |

Versione del prodotto, del documento e dell'API plugin sono indipendenti. Il solo aumento minor dello schema non autorizza vecchi lettori a ignorare campi ignoti. Dati plugin ignoti restano invece opachi e roundtrip. Se serve cambiare questo piano, registrare ADR nella specifica, aggiornare tutti i prompt coinvolti e aggiungere fixture/migrazione prima di cambiare i consumatori.

## 4. Snodi decisionali e compromessi fissati

1. **Prima del bootstrap:** confermare la baseline Node 24.22.0 / pnpm 12.14.0 / TS 6.0.3 / Vite 8.3.5 con installazione reale. I metadati sono stati verificati, le build no. TS 7 non entra finché il linter non lo supporta. La licenza GPL esistente non va sostituita per rendere più semplice l'embed.
2. **Prima del canvas editor:** la mappa XY è UI di authoring; preview e presentazione sono sempre `@spatialdeck/player`. Vietato un renderer React parallelo. Reparent arriva in 0.3, non va simulato nel 0.2.
3. **Prima della struttura:** adottare latest-wins, commit history al completamento e `prev()` sulla visita reale. Decisioni sui loop e camera indipendente vanno fissate prima della timeline. Uniform scale evita shear; gizmo 3D completo fuori perimetro.
4. **Prima dei contenuti:** sanitizzazione unica e registry plugin host-approved. Nessun codice caricato dal JSON. ZIP con asset è trasporto portabile; JSON resta canonico. Web MIDI facoltativo, bridge OSC fuori requisito.
5. **G0, prima dell'impaginazione e di ogni publish:** il maintainer decide SPDX/licenza dei pacchetti incluso il player, proprietà dello scope npm, lingua predefinita di interfaccia e documentazione pubblica, e conferma il modello di layout della specifica (canvas con frame, flow predefinito, stile a token). Un agente non le deduce: in assenza registra un blocker. **Chiuso il 22 ottobre 2026:** `GPL-3.0-or-later` per tutti i pacchetti, player incluso; scope `@spatialdeck` del maintainer; inglese come lingua predefinita; modello di layout confermato senza modifiche ([specifica, sezione 21](PROJECT_SPEC.md)).
6. **Prima dell'impaginazione:** preview e store incrementali (0.4.1), perché il drag nella scena deve restare nel budget. Ordine di lettura = ordine dell'array, `z` solo visivo. Nessuno stile come CSS libero; nessun renderer React dei blocchi, le maniglie stanno sopra la preview del player.
7. **Prima degli export:** profili espliciti. Video minimo statico e senza audio è obbligatorio e verificabile; media dinamici nel player non implicano supporto video. HTML autonomo non incorpora il web esterno arbitrario. Gli export partono dal modello visivo 1.3.0; dipendenze di terze parti esterne nei pacchetti e note di licenza negli artefatti che incorporano codice.
8. **Prima della stabilità:** pin baseline impress.js, browser reali e ambiente benchmark. Se CSS sorgente non è convertibile, warning concreto; se Safari o budget non sono verificati, il gate resta aperto. Nessun tag o publish in questa fase.

## 5. Gate trasversali e comandi

Ogni fase DEVE implementare, testare e documentare il proprio perimetro; correggere gli errori prima del completamento. Il report futuro `docs/verification/phase-<versione>.md` include istruzioni di avvio, ambiente, comandi ed exit code, numero di test pass/fail/skip, artefatti, decisioni e limiti. Blocchi ambientali si dichiarano come verifiche non eseguite; non si fabbricano test verdi.

Comandi root previsti: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm test:e2e`, `pnpm build`, `pnpm check:boundaries`, `pnpm check:bundle`. Verificare gli script effettivi e crearli nei moduli di competenza prima di invocarli; non assumere che esistano nel repository iniziale. Installazione browser esplicita, nessun servizio remoto per demo. Da 0.2 verificare `pnpm dev:studio`; da 0.6 `pnpm spatialdeck --help` e output reali. Tutte le fasi eseguono controlli regressivi pertinenti delle precedenti.

| Area | Requisito iniziale | Approfondimento successivo |
| --- | --- | --- |
| Sicurezza | Input/schema/ID/path, textContent, confini pacchetti | Sanitizzazione e ZIP in 0.4, CSP Studio e debug globale in 0.4.1, token di stile senza CSS in 0.5, export/CSP e note di licenza in 0.6, audit completo in 1.0 |
| Accessibilità | Focus, keyboard, reduced motion, outline in 0.1 | Editor 0.2, graph/timeline 0.3, media/alt 0.4, lingua/testi/outline derivata e axe in CI 0.4.1, ordine di lettura/drag alternativo/contrasto 0.5; screen reader reale prima di 1.0 |
| Determinismo | Clock e sampler puri in 0.1 | Track/cue 0.3; frame export 0.6 |
| Lifecycle | Due istanze e destroy senza residui in 0.1 | Storage/listener editor e media/plugin nelle fasi che li introducono; aggiornamento incrementale senza residui 0.4.1 |
| Bundle | Player/core privi di React/editor, budget gzip | Entry point plugin e CLI separati; renderer su richiesta, font come file e consumer realistico misurato in 0.6; nessun aumento non misurato |
| Persistenza | JSON e validazione | Recovery IndexedDB 0.2, archivio asset 0.4, eliminazione progetti e upgrade IDB 0.4.1, migrazione 1.3.0 in 0.5, migrazioni storiche sempre |

Budget normativi nella specifica: core+player <=100 KiB gzip JS / <=20 KiB CSS; fixture 100 scene; p95 mount <=1000 ms e validazione <=100 ms su runner registrato; p95 frame <=34 ms senza long task >200 ms; input->preview <=100 ms, anche con 50 MiB di media (0.4.1) e durante il drag di 30 blocchi canvas (0.5); consumer realistico misurato (0.6); zero risorse possedute dopo 50 destroy; delta heap <=5 MiB con GC controllata. Queste sono soglie da misurare, non prestazioni già ottenute. Timing in CI rumorosa resta informativo, gate prestazionale pre-1.0 su ambiente controllato.

## 6. Release 1.0: gate di uscita

- [ ] Tutte le fasi (0.1–0.6) eseguite individualmente con report e demo cumulativi reali; G0 chiuso con decisioni registrate.
- [ ] Player indipendente da editor/React; editor senza matematica o rendering concorrenti.
- [ ] Schema corrente e tipi allineati; fixture 1.0.0/1.1.0/1.2.0/1.3.0 e migrazioni senza perdita né differenze di resa.
- [ ] Impaginazione canvas, tema e stile a token verificati in player, Studio ed export; ordine di lettura e alternativa al drag provati.
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


## 10. Avanzamento Struttura 0.3 — 21–22 ottobre 2026

0.3 è implementata con schema 1.1.0 e migrazione da 1.0.0, preservando fixture e rapporti storici. Rami A/B/C/D e prev effettivo, loop manuale limitato, parent/reparent world-preserving con undo, camera indipendente, track/cue, timeline edit/scrub e overview sono operativi sia via API sia in Studio. Il [rapporto 0.3](verification/phase-0.3.md) raccoglie comandi, conteggi, coverage, bundle, landmark e roundtrip/download/riapertura, recovery e screenshot reali.

187 unità e 90 E2E locali superati, senza fail/skip, con i runner browser già fissati. I gate 0.1/0.2 restano regressioni cumulative; i nuovi artefatti non sostituiscono quelli storici. CI Linux 0.3 e verifiche pre-1.0 su Safari reale, screen reader e prestazioni controllate restano non eseguite. Nessuna fase successiva avviata: il prerequisito per 0.4 è ora questo modello corrente, con regressioni verdi e fixture storiche conservate.

## 11. Avanzamento Contenuti 0.4 — 22 ottobre 2026

Schema 1.2.0, migrazioni storiche, undici tipi di blocco e plugin API 1.0.0 sono implementati. Gallery locale `/content` e archivio `.spatialdeck`, editing Studio con preview condivisa, resolver, sanitizzazione, media e recovery risorse sono oggetto delle prove cumulative nel [rapporto 0.4](verification/phase-0.4.md). [SDK e trust model](PLUGINS.md) documentano le scelte effettive: manifest separa path/entry; IDB conserva byte/MIME atomicamente per compatibilità WebKit; embed senza script/off per default, senza garanzia universale dell’attributo CSP del frame. Le risorse originali della gallery sono CC0.

I gate e i conteggi sono quelli del rapporto corrente, senza estendere l’evidenza CI Linux 0.1. Capture è solo una capability dichiarata, non una funzione export. Distribuzione/CLI/HTML/PDF/video/presenter non sono avviati. Per 0.5 riutilizzare schema 1.2.0 e pipeline, conservare le regressioni e provare i profili export senza dedurre il supporto dalla sola riproduzione browser.

> Indicazione superata dalla revisione del 22 ottobre 2026 (sezione 12): la fase successiva a 0.4 è 0.4.1 Consolidamento; gli export passano a 0.6 sul modello 1.3.0.

## 12. Revisione dopo l'audit 0.4 — 22 ottobre 2026

L'audit pre-distribuzione ha confermato i gate locali (typecheck, lint, format, 233 unità, build, boundaries) e la CI Linux verde sul commit 0.4 (233 unità, 120 E2E). Le carenze sono assegnate qui a una fase; ogni prompt le riprende nel proprio perimetro. Priorità: **P0** blocca la pubblicazione, **P1** difetto o rischio serio da chiudere nella fase indicata, **P2** debito pianificato. Motivazione della sequenza e gate G0 nella [specifica, sezione 19](PROJECT_SPEC.md).

| Carenza | Priorità | Fase |
| --- | --- | --- |
| SPDX e licenza dei pacchetti non decisi, campo `license` assente | P0 | G0: `GPL-3.0-or-later`; 0.6 applica |
| Codice di terze parti copiato nei `dist` senza note di licenza e insieme dichiarato come dipendenza (sanitizer non aggiornabile dai consumer) | P0 | 0.6 |
| Manifest privati e incompleti, peer React esatto, scope npm non verificato | P0 | G0: scope del maintainer; 0.6 verifica la proprietà e completa i manifest |
| Nessun posizionamento, dimensione o stile dei contenuti dentro la scena | P1 prodotto | 0.5 |
| Firme asset: SVG con prologo/commento/DOCTYPE rifiutati; testo UTF-8 troncato al byte 4096 rifiutato | P1 | 0.4.1 — **chiusa** |
| Digest SHA-256 dipendente da `crypto.subtle`: asset non caricabili su HTTP non-localhost | P1 | 0.4.1 — **chiusa** |
| Preview Studio che ricostruisce tutti i renderer e ricalcola i digest a ogni modifica; autosave che ricalcola e riscrive tutti gli asset | P1 | 0.4.1 — **chiusa** |
| Testi del player cablati in italiano, `lang` del documento non applicato, outline con sorgente Markdown/HTML grezzo | P1 | 0.4.1 — **chiusa** |
| CSP di produzione Studio con `connect-src ws:` | P1 | 0.4.1 — **chiusa** |
| Peso reale di un consumer con contenuti ricchi (142 KB gzip JS, 954 KB gzip CSS per font KaTeX `data:` triplicati), builtin caricati tutti subito, chunk Studio da 976 KB | P1 | 0.6 |
| `dist` pubblicati mai esercitati dagli E2E (app e test usano i sorgenti tramite alias) | P1 | 0.6 |
| Stili inline di KaTeX e CSP degli export | P1 | 0.6, decisione a inizio fase |
| `window.studio` esposto in produzione | P2 | 0.4.1 — **chiusa** |
| Store: serializzazione e congelamento dell'intero documento a ogni pubblicazione; un undo per ogni tasto nel titolo; render del player che scorre tutti i blocchi a ogni frame | P2 | 0.4.1 — **chiusa** |
| IndexedDB: `versionchange`/`blocked` rendono l'autosave inutilizzabile fino al reload; progetti non eliminabili; recupero proposto a ogni avvio | P2 | 0.4.1 — **chiusa** |
| Messaggio «supera 10 MiB» anche per archivi; `playsinline` assente sui video | P2 | 0.4.1 — **chiusa** |
| `check:bundle` riscrive un file tracciato; Actions non fissate per SHA; axe assente; coverage limitata al core e non eseguita in CI | P2 | 0.4.1 — **chiusa** in locale; esecuzione CI da verificare al primo push |
| Documentazione superata (stato CI, schema in AUTHORING, ambiente in DEVELOPMENT) | P2 | 0.4.1 — **chiusa** |
| Note private raggiungibili dai renderer plugin tramite il documento | P2 | 0.6, separazione dati pubblici |
| Plugin demo `org.spatialdeck.badge` nei builtin di produzione; API interne dell'editor tutte esportate | P2 | 0.6 |
| `writeArchive` sincrono e ricompresso sul thread principale; `readArchive` con memoria circa tripla dell'archivio | P2 | 0.6 |
| Presentazione Studio senza fullscreen | P2 | 0.6, con il presenter |
| Fuzzing di parser ZIP e policy di sanitizzazione; `navigator.onLine` come segnale offline dei plugin; embed sandbox inutilizzabile per embed con script | P2 | 1.0 |
| AVIF, FLAC, MOV non supportati; toolchain con Node/pnpm a versione esatta | P2 | 1.0, valutare |
| Documentazione solo in italiano; CHANGELOG, CONTRIBUTING, SECURITY assenti | P2 | G0: inglese; 1.0 |
| Testi predefiniti del player e interfaccia di Studio in italiano, lingua predefinita decisa in G0: inglese | P2 | 0.6 player (set italiano esportato come alternativa); 1.0 Studio |
| Link ai prompt validi solo in locale | Informativo | Scelta del maintainer, nessuna azione |

Le prove non eseguite già note (Safari reale, dispositivi mobili, screen reader, heap e benchmark controllati) restano gate della 1.0 e non sono riassegnate.

Le voci marcate **chiusa** sono state chiuse dalla 0.4.1 con un test che falliva sul codice 0.4 e passa dopo la correzione; dettagli, misure e limiti nel [rapporto 0.4.1](verification/phase-0.4.1.md).

## 13. Avanzamento Consolidamento 0.4.1 — 22 ottobre 2026

0.4.1 è implementata con schema 1.2.0, fixture e contratti invariati. Asset validi comuni accettati e digest calcolato anche fuori dai contesti sicuri; preview Studio incrementale con media pesanti (nessun digest né URL nuovo per modifica, p95 input→preview entro 100 ms sul runner locale dichiarato nei tre motori); testi del player sostituibili con `PlayerOptions.messages`, `lang` del documento e outline senza sorgente; Studio di produzione senza `ws:` né `window.studio`; IndexedDB v3 robusto a upgrade e blocchi, progetti e revisioni eliminabili, recupero proposto solo se diverso dal file salvato; axe e coverage estesa in CI, Actions fissate per SHA e nessun controllo che modifichi file tracciati. La CI aggiornata non è ancora stata eseguita: nessun push. Prerequisiti per 0.5: preview incrementale nel budget (verificata in locale) e conferma del punto 4 di G0 da parte del maintainer, ancora aperta.

## 14. Chiusura del gate G0 — 22 ottobre 2026

Il maintainer ha preso le quattro decisioni G0: licenza `GPL-3.0-or-later` per tutti i pacchetti, player incorporabile incluso; scope npm `@spatialdeck` di sua proprietà, con organizzazione da creare prima del publish e proprietà verificata in 0.6; inglese come lingua predefinita dell'interfaccia e della documentazione pubblica (player in 0.6, Studio e guide entro 1.0); modello di impaginazione 1.3.0 confermato senza modifiche. Dettagli e conseguenze nella [specifica, sezione 21](PROJECT_SPEC.md). I prerequisiti di 0.5 sono soddisfatti; la fase non è ancora avviata.
