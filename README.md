# SpatialDeck 0.1 Core

Motore TypeScript e player DOM/CSS 3D per presentazioni spaziali, senza React.
Questa fase supporta scene piatte con testo e percorsi lineari; non include Studio.

- [Architettura e contratto](docs/PROJECT_SPEC.md)
- [Roadmap](docs/ROADMAP.md)
- [Guida sviluppatori e API](docs/DEVELOPMENT.md)
- [Verifica 0.1, screenshot e limiti](docs/verification/phase-0.1.md)

## Avvio

Richiede **Node 24.22.0** e **pnpm 12.14.0**. Dipendenze e primo download dei browser richiedono rete; la demo in esecuzione non usa servizi remoti.

```sh
pnpm install --frozen-lockfile
pnpm dev:playground
```

Aprire `/core` all'indirizzo locale stampato da Vite. La pagina contiene due player indipendenti, tre scene, controlli API, scorciatoie locali, vista testuale e riduzione del movimento.

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
pnpm check:boundaries
pnpm check:bundle
pnpm browsers:install
pnpm test:e2e
```

`test:e2e` compila e prova la demo **production**. Su macOS 14 esegue Chromium e Firefox con Playwright **1.64.1**, poi WebKit con il runner dedicato **1.61.1**. Su Linux e macOS più recenti esegue tutti e tre con **1.64.1**. La suite è condivisa senza copie o skip; report e trace dei due runner sono separati.

`pnpm browsers:install` installa i browser delle versioni appropriate al sistema. Per provare soltanto WebKit su macOS 14:

```sh
pnpm test:e2e:webkit:macos14
```

La CI Linux è [verificata sul commit 07916cc](https://github.com/fv-c/SpatialDeck/actions/runs/39596586324) con Playwright 1.64.1: 85 unità e 30 E2E passati, zero skip, sui tre browser. Il runner locale di compatibilità WebKit resta verificato su macOS 14; Safari reale non è stato provato.

`LICENSE` originale GPL v3 conservata. I manifest restano privati e non fissano per deduzione GPL-3.0-only oppure GPL-3.0-or-later: la scelta SPDX va chiarita prima del packaging pubblico.
