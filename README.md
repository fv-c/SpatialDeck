# SpatialDeck 0.4 Contenuti

Motore TypeScript e player DOM/CSS 3D per presentazioni spaziali, senza React.
Studio React permette di creare scene annidate, percorsi con scelte e loop limitati, camera indipendente e track con timeline. Include undici tipi di blocco, asset locali, media, plugin host-approved, salvataggio JSON e archivio `.spatialdeck`. Schema corrente 1.2.0; i documenti 1.0.0 e 1.1.0 si aprono come copie migrate.

- [Architettura e contratto](docs/PROJECT_SPEC.md)
- [Roadmap](docs/ROADMAP.md)
- [Guida sviluppatori e API](docs/DEVELOPMENT.md)
- [Guida autore Studio](docs/AUTHORING.md)
- [Plugin, renderer e policy dei contenuti](docs/PLUGINS.md)
- [Verifica 0.4 e limiti](docs/verification/phase-0.4.md)
- [Verifica 0.3, migrazione, grafi e timeline](docs/verification/phase-0.3.md)
- [Verifica storica 0.2, roundtrip e screenshot](docs/verification/phase-0.2.md)
- [Verifica storica 0.1](docs/verification/phase-0.1.md)

## Avvio

Richiede **Node 24.22.0** e **pnpm 12.14.0**. Dipendenze e primo download dei browser richiedono rete; la demo in esecuzione non usa servizi remoti.

```sh
pnpm install --frozen-lockfile
pnpm dev:studio
```

Studio è su `http://127.0.0.1:5174` (o porta stampata da Vite). `pnpm dev:playground` avvia la demo vanilla separata. Entrambi i server usano i sorgenti e non richiedono una build preliminare.

Per la gallery aprire `/content` nel playground. Il pulsante **Scarica archivio gallery** produce un file riapribile con **Apri archivio** in Studio e con **Apri gallery locale** nel vanilla. È disponibile anche [l’archivio di esempio](examples/content-gallery/content-gallery.spatialdeck). Markdown, HTML, SVG, formule, immagine, WAV, H.264/VTT, link interno e badge locale funzionano senza servizi remoti dopo il caricamento dell’app. L’embed rimane disattivato. Usare **Abilita media** o **Riproduci** per avviare i media.

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

`test:e2e` compila e prova playground e Studio **production**. Su macOS 14 esegue Chromium e Firefox con Playwright **1.64.1**, poi WebKit con il runner dedicato **1.61.1**. Su Linux e macOS più recenti esegue tutti e tre con **1.64.1**. La suite è condivisa senza copie o skip; report e trace dei due runner sono separati.

`pnpm browsers:install` installa i browser delle versioni appropriate al sistema. Per provare soltanto WebKit su macOS 14:

```sh
pnpm test:e2e:webkit:macos14
```

La CI Linux è [verificata sul commit 07916cc](https://github.com/fv-c/SpatialDeck/actions/runs/39596586324) con Playwright 1.64.1: 85 unità e 30 E2E passati, zero skip, sui tre browser. Il runner locale di compatibilità WebKit resta verificato su macOS 14; Safari reale non è stato provato.

`LICENSE` originale GPL v3 conservata. I manifest restano privati e non fissano per deduzione GPL-3.0-only oppure GPL-3.0-or-later: la scelta SPDX va chiarita prima del packaging pubblico.
