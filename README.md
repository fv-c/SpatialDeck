# SpatialDeck 0.5 Impaginazione

Motore TypeScript e player DOM/CSS 3D per presentazioni spaziali, senza React.
Studio React permette di creare scene annidate, percorsi con scelte e loop limitati, camera indipendente e track con timeline. Include undici tipi di blocco, asset locali, media, plugin host-approved, salvataggio JSON e archivio `.spatialdeck`. Schema corrente 1.3.0; i documenti 1.0.0, 1.1.0 e 1.2.0 si aprono come copie migrate, con la stessa resa.

La 0.5 aggiunge l'impaginazione: nelle scene **canvas** ogni contenuto ha un frame (posizione, dimensione, rotazione, livello) e i contenuti possono stare affiancati, sovrapposti o ruotati; il documento ha un tema (palette, font locali, scala tipografica), ogni scena un aspetto (card o semplice, sfondo, titolo visibile o nascosto) e ogni blocco uno stile a token. Nessun campo è CSS. In Studio la modalità **Impagina** mette maniglie sopra la preview del player condiviso, con un comando annullabile per gesto, frecce, campi numerici, allinea/distribuisci, griglia, livelli, ordine di lettura e diagnostica di testo tagliato e contrasto. L'ordine di lettura resta l'ordine dei contenuti, indipendente dal livello visivo.

- [Architettura e contratto](docs/PROJECT_SPEC.md)
- [Roadmap](docs/ROADMAP.md)
- [Guida sviluppatori e API](docs/DEVELOPMENT.md)
- [Guida autore Studio](docs/AUTHORING.md)
- [Plugin, renderer e policy dei contenuti](docs/PLUGINS.md)
- [Verifica 0.5, misure e limiti](docs/verification/phase-0.5.md)
- [Verifica 0.4.1, misure e limiti](docs/verification/phase-0.4.1.md)
- [Verifica 0.4 e limiti](docs/verification/phase-0.4.md)
- [Verifica 0.3, migrazione, grafi e timeline](docs/verification/phase-0.3.md)
- [Verifica storica 0.2, roundtrip e screenshot](docs/verification/phase-0.2.md)
- [Verifica storica 0.1](docs/verification/phase-0.1.md)

## Prossime fasi

Dopo l’audit pre-distribuzione del 22 ottobre 2026 il piano è: **0.4.1 Consolidamento** (implementata: correzioni di asset, prestazioni dello Studio, testi e lingua del player; schema 1.2.0 invariato), **0.5 Impaginazione** (implementata: schema 1.3.0, contenuti posizionati, dimensionati e stilizzati nella scena), **0.6 Distribuzione** (CLI, pacchetti, HTML, PDF, video, presenter) e **1.0 Stabilizzazione**. Il gate decisionale G0 è chiuso: licenza `GPL-3.0-or-later`, scope npm `@spatialdeck`, inglese come lingua predefinita e modello di impaginazione confermato. Dettagli nella [roadmap](docs/ROADMAP.md) e nella [specifica, sezioni 19 e 21](docs/PROJECT_SPEC.md).

## Avvio

Richiede **Node 24.22.0** e **pnpm 12.14.0**. Dipendenze e primo download dei browser richiedono rete; la demo in esecuzione non usa servizi remoti.

```sh
pnpm install --frozen-lockfile
pnpm dev:studio
```

Studio è su `http://127.0.0.1:5174` (o porta stampata da Vite). `pnpm dev:playground` avvia la demo vanilla separata. Entrambi i server usano i sorgenti e non richiedono una build preliminare. In sviluppo Studio espone `window.studio` per debug e la CSP ammette il websocket di Vite; la build di produzione non ha né `ws:` né `window.studio`, salvo apertura esplicita con `?studio-debug` nell’URL (usata dagli E2E).

Per la gallery aprire `/content` nel playground. Il pulsante **Scarica archivio gallery** produce un file riapribile con **Apri archivio** in Studio e con **Apri gallery locale** nel vanilla. È disponibile anche [l’archivio di esempio](examples/content-gallery/content-gallery.spatialdeck). Markdown, HTML, SVG, formule, immagine, WAV, H.264/VTT, link interno e badge locale funzionano senza servizi remoti dopo il caricamento dell’app. L’embed rimane disattivato. Usare **Abilita media** o **Riproduci** per avviare i media.

Per l'impaginazione aprire `/layout`: due player dello stesso documento con titolo nascosto, immagine e testo affiancati, un timbro sovrapposto e ruotato, una nota ruotata, una scena flow con aspetto semplice e una scena figlia ruotata con colonne e collegamento, su un tema non predefinito con il font locale Atkinson Hyperlegible (SIL OFL 1.1, scaricato solo se usato). **Apri progetto locale** apre JSON o archivi salvati da Studio. Lo stesso esempio è in `examples/layout-canvas/` (`project.json` e `layout-canvas.spatialdeck`, apribile in Studio, dove **Impagina** attiva l'editor di scena).

Per la demo struttura aprire `/structure`: due istanze indipendenti, rami A→B→D / A→C→D, ritorno sulla visita effettiva, loop manuale limitato a due visite e camera track a tre keyframe. Il documento è in `examples/structure-branching/project.json`, apribile anche in Studio. Panoramica e Camera controllano l’ispezione temporanea.

Per la demo storica vanilla aprire `/core` all'indirizzo locale stampato da Vite. La pagina contiene due player indipendenti, tre scene, controlli API, scorciatoie locali, vista testuale e riduzione del movimento.

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm test:coverage
pnpm build
pnpm check:boundaries
pnpm check:bundle
pnpm browsers:install
pnpm test:e2e
```

`test:e2e` compila e prova playground e Studio **production**, inclusi i controlli axe. Su macOS 14 esegue Chromium e Firefox con Playwright **1.64.1**, poi WebKit con il runner dedicato **1.61.1**. Su Linux e macOS più recenti esegue tutti e tre con **1.64.1**. La suite è condivisa senza copie o skip; report e trace dei due runner sono separati. Nessun comando modifica file tracciati: evidenze E2E, misure di bundle e coverage finiscono in `test-results/` (ignorata) e i rapporti in `docs/verification/` si aggiornano a mano.

`pnpm browsers:install` installa i browser delle versioni appropriate al sistema. Per provare soltanto WebKit su macOS 14:

```sh
pnpm test:e2e:webkit:macos14
```

La CI Linux è verde sul commit 0.4 ([run 39730492795](https://github.com/fv-c/SpatialDeck/actions/runs/39730492795): 233 unità e 120 E2E sui tre browser). 0.4.1 e 0.5 sono verificate in locale; la CI aggiornata (Actions fissate per SHA, coverage estesa, axe) non è ancora stata eseguita perché nulla è stato inviato al remoto. Il runner locale di compatibilità WebKit resta verificato su macOS 14; Safari reale non è stato provato.

`LICENSE` originale GPL v3 conservata. Identificatore SPDX deciso dal maintainer: `GPL-3.0-or-later` per tutti i pacchetti, player compreso. I manifest restano privati; il campo `license` arriva con il packaging pubblico in 0.6.
