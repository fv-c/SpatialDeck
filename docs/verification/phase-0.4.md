# Verifica SpatialDeck 0.4 Contenuti

22 ottobre 2026. Schema **1.2.0**, migrazioni in copia, renderer condivisi e asset locali implementati. **233 unità + 120 E2E = 353 test passati**, zero fail/skip nell’ultima suite completa. Nessun commit, push, deploy, publish, tag o fase Distribuzione.

## Baseline e file

Checkout iniziale già modificato dalla fase 0.3, con prompt non tracciati. Letti README, PROJECT_SPEC, ROADMAP, DEVELOPMENT, rapporti 0.1/0.2/0.3, API/schema e lifecycle reali. Nessun AGENTS su disco applicabile oltre alle istruzioni della chat. Baseline corrente misurata: **187 unità e 90 E2E passati**, prima di implementare i contenuti. Log `.tools/content-baseline-unit.log` e `content-baseline-e2e.log`; diff tracciato iniziale conservato in `.tools/content-baseline.patch`. La baseline ha rigenerato le proprie evidenze 0.3; report, LICENSE e fixture storiche restano conservati. Le prove successive scrivono in `content-*`/`content-regressions/`.

Principali aggiunte: schema 1.2.0 e `document/contents.ts`; player `assets/` e `content/`; pacchetto `plugins` con SDK/rich/media/navigation/sample/archive e pipeline `security.ts`; editor ContentPanel/AssetPanel e storage asset/archivio; gallery con JSON, SVG/WAV/MP4/VTT e archivio portabile; test core/asset/SDK/ZIP e suite `contents.spec.ts`. Estesi generatore, migrazioni/semantica, eventi, player, Studio, CSP/alias/build e confini/bundle. Manifest applicativi 0.4.0 e lockfile aggiornati soltanto con le dipendenze della fase.

## Ambiente e avvio

[Ambiente e metadati verificati](content-environment.json): macOS 14.8.7/Darwin 23.6.0 arm64, Apple M3 Max, 64 GiB; Node **24.22.0**, pnpm **12.14.0**. DOMPurify **3.4.17**, marked **18.1.1**, KaTeX **0.19.0**, fflate **0.8.3**, registry HTTP 200, peer/licenze confermati e installazione strict/frozen. Nessuna CDN, installazione globale o servizio ausiliario.

Browser effettivi: Chromium **156.0.8078.4** e Firefox **157.0**, Playwright **1.64.1**; WebKit **26.5**, runner macOS 14 **1.61.1** già presente. Sono prove locali; nessuna nuova CI Linux o prova Safari installato.

```sh
export PATH="$PWD/.tools/node_modules/.bin:$PATH" # soltanto se necessario sull’host
pnpm install --frozen-lockfile
pnpm dev:playground
pnpm dev:studio
```

Aprire `/content` nel playground. Undici scene coprono text, Markdown, HTML, SVG, LaTeX, image, audio, video, link, embed e plugin. Due player indipendenti; **Abilita media** autorizza autoplay nell’istanza corrente. **Scarica archivio gallery** produce un archivio reale; [content-gallery.spatialdeck](../../examples/content-gallery/content-gallery.spatialdeck) è anche incluso e convalidato in Node dopo lettura/scrittura. Si apre con **Apri archivio** in Studio e **Apri gallery locale** nel vanilla. Testo sorgente, note e dati plugin restano nel JSON canonico.

Gli avvii dev sono stati provati realmente sulle porte libere **5183/5184**, preservando gli eventuali server preesistenti: [smoke dev](content-dev-smoke.json), zero page error, due player vanilla e una preview Studio, nessun overflow a 1440/768/390/320 px. [Gallery LaTeX](content-dev-gallery.png) e [Studio](content-dev-studio.png) aperti e ispezionati: frazione/integrale corretti, pannelli leggibili, preview condivisa e risorse visibili. Le scene adiacenti rimangono visibili ai margini come previsto dal player spaziale.

## Contratti e sicurezza dimostrati

Tre schemi esportati e validatori standalone; tipi generati dalla stessa union. 1.0.0/1.1.0 validati prima della migrazione, copie correnti senza perdita di text/note/estensioni; pluginSettings vuoto aggiunto alle copie migrate. Rifiuto atomico di riferimenti asset/link inesistenti, dati builtin extra/mancanti, sorgenti oltre limite e API/versioni sintatticamente invalide. Le versioni dati plugin sconosciute restano opache con placeholder; nessun caricamento dal JSON. Capacità blocks richiesta soltanto quando rich content o impostazioni plugin la usano.

Pipeline unica DOMPurify per HTML/SVG, marked prima della stessa pipeline; testo via textContent. Test browser su mount, updateDocument e update diretto del renderer: script/onerror/javascript e URL mascherati, SVG foreignObject/SMIL/href esterni, CSS attivo, HTML Markdown, `</script>` e prototype keys rimangono inerti. Assert sul DOM consentito, marker globale assente e nessuna richiesta ostile. ID SVG riscritti per istanza e immagini SVG asset sanitizzate prima del nuovo URL.

KaTeX reale con MathML, font locali, `trust:false`, maxExpand 500/maxSize 20 e macro per render. Formule reali renderizzate e ispezionate; macro definite in un blocco non compaiono nel successivo; ricorsione ed estensioni trust producono fallback senza rete. Gli style generati da KaTeX sono distinti dal source utente, i cui style sono sempre rimossi.

ZIP: header centrali/locali coerenti, CRC e SHA-256, inflate incrementale con limite effettivo, entry registrate senza sovrapposizioni o file nascosti. Test negativi per traversal, slash/backslash, percent encoding, path assoluti, Unicode non canonico, duplicati, symlink, entry count, file/JSON/totale e dimensioni false dopo inflate, MIME/digest errati, risorse mancanti, file extra e CRC corrotto. Apertura fallita lascia il lavoro corrente intatto. Manifest separa `path` originale e `entry` portabile sotto `assets/<id>/`, mantenendo JSON affiancati senza riscrittura dei path. Limiti 50 MiB/file, 200 MiB totali decompressi, 10 MiB/JSON e 10.000 entry. ZIP64/cifratura/multidisco/directory esplicite sono rifiutati.

## Media, plugin e persistenza

[Prove media Chromium](content-media-chromium.json), [Firefox](content-media-firefox.json), [WebKit](content-media-webkit.json): WAV e H.264 locali avanzano davvero; video 320×180, controlli nativi, poster SVG e captions VTT. Play rifiutato mostra azione utile; `mediaerror` espone scena/blocco/asset e diagnostica. Un MP4 locale corrotto provoca un errore reale del decoder e l’evento tipizzato, senza dispatch sintetico. Uscita stop azzera, pause conserva il tempo; seconda istanza resta ferma. Destroy ferma load/media, abortisce e revoca le lease. Test strumentato: zero URL Blob residui dopo teardown dei renderer media nelle due istanze. La preview editor è muta.

Queste sono prove di controllo/riproduzione browser, **non ascolto uditivo** o sincronizzazione audio al campione. Il decoder può rifiutare altri file/codec: MIME e sniffing minimo non certificano il contenitore completo; il fallback è esplicito.

Plugin SDK 1.0.0, registry host locale, schemi dati/settings con predicati fidati, servizi e signal. Badge originale offline con inspector separato. Factory/mount/update che lanciano sono isolati; abort/unregister rimuovono subscription; dispose/destroy difettosi non impediscono gli altri teardown. Eventi namespaced verificati e plugin mancante/incompatibile preservato nel roundtrip. Il codice plugin JS ha autorità della pagina ed è fidato, senza sandbox. Migrations dati sono funzioni esplicite dell’host, mai automatiche se un plugin manca. Capture rimane false nel sample: non esiste un export 0.4.

Embed off di default; origine HTTPS autorizzata e ulteriore consenso, sandbox vuota senza allow-same-origin/script, attributo CSP restrittivo e revoca. I test verificano consenso, sandbox e assenza di esecuzione. **L’enforcement dell’attributo CSP del frame non è uniforme tra i browser**: il confine verificato è la sandbox senza script; non si garantisce l’isolamento universale di sottorisorse passive remote. Studio vieta tutti i frame. Nessun embed con script, MIDI o OSC è supportato o richiesto.

[Storage Chromium](content-storage-chromium.json), [Firefox](content-storage-firefox.json), [WebKit](content-storage-webkit.json): revisioni e byte/MIME asset nello stesso commit IDB v2. Le letture ricreano Blob. Risorsa rimossa resta nelle revisioni precedenti; solo dopo espulsione da tutte le ultime dieci revisioni viene raccolta. Quota iniettata su assets.put annulla anche documents/recovery; nessuna revisione parziale. Restano attive regressioni storage negato, conflitti tra due tab e recovery. Associazione manuale di una risorsa mancante, reload e recupero sono provati dalla UI.

## Comandi finali

[Comandi ed exit code](content-checks.json), [120 esiti browser e runner](content-e2e-results.json), [coverage core](content-coverage.json), [bundle](content-bundle.json). Log `.tools/content-final-*.log`; trace/report locali sotto `test-results/`.

| Comando                          |    Exit | Risultato                                                          |
| -------------------------------- | ------: | ------------------------------------------------------------------ |
| `pnpm install --frozen-lockfile` |       0 | 8 workspace, peer strict, lockfile invariato                       |
| `pnpm typecheck`                 |       0 | TS strict, core ES-only, app e test                                |
| `pnpm lint`                      |       0 | ESLint/hooks                                                       |
| `pnpm format:check`              |       0 | Prettier, prompt preservati                                        |
| `pnpm test`                      |       0 | **233 pass**, 13 file, zero fail/skip                              |
| `pnpm test:coverage`             |       0 | **94,50% statements / 89,78% branches** core                       |
| `pnpm build`                     |       0 | Core/player/plugins/editor e due app, JS/tipi/CSS/font             |
| `pnpm test:e2e`                  |       0 | **120 pass**: 40 Chromium + 40 Firefox + 40 WebKit, zero fail/skip |
| `pnpm check:boundaries`          |       0 | Nessuna dipendenza inversa core/player; plugin opzionali           |
| `pnpm check:bundle`              |       0 | **46 353 B JS / 932 B CSS gzip**, limiti 102 400 / 20 480 B        |
| dev Studio/playground            | 0 avvio | Smoke Chromium e quattro viewport                                  |
| `git diff --check`               |       0 | Whitespace dei file tracciati                                      |

233 unità includono le 187 della baseline e 46 nuove; 120 E2E includono le 90 precedenti e 30 nuove. Eventuali ripetizioni mirate non sono sommate. [Roundtrip Chromium](content-roundtrip-chromium.json), [Firefox](content-roundtrip-firefox.json), [WebKit](content-roundtrip-webkit.json): ogni builtin modificato da Studio, undo/redo, JSON e archivio realmente scaricati, nuovo browser context vanilla e confronto integrale del modello. Gallery con rete disabilitata dopo il caricamento: nessuna dipendenza remota per i contenuti supportati.

## Errori corretti, limiti e handoff

Difetti emersi e corretti: SVG incorporato/minificato da Vite con digest diverso e conseguente poster/captions interrotti; font inline incompatibili con CSP Studio; WebKit IDB UnknownError e transazione sospesa durante clonazione diretta Blob/File (byte/MIME persistiti invece); teardown plugin che poteva interrompersi su eccezione; evento pubblico mediaerror mancante; completamento del poster che cancellava un errore di decoding già emesso (ora persistente fino a successo o cambio sorgente). Le prime esecuzioni fallite sono diagnostiche. I test ora attendono metadati prima del gesto media, conclusione dell’import e risorse caricate prima di strumentare le lease, anziché assumere tempi di caricamento identici nei browser.

Le risorse gallery sono originali sintetiche, [CC0](../../examples/content-gallery/LICENSE.md). DOMPurify MPL-2.0 OR Apache-2.0; marked/KaTeX/fflate MIT, metadati e licenze reali consultati. Nessuna modifica a LICENSE o deduzione dello SPDX del progetto.

Non eseguiti: Safari/Chrome/Edge installati, dispositivi mobili fisici, screen reader reale, ascolto uditivo, hardware MIDI, OSC, heap dopo GC e benchmark p95. La CI Linux precedente resta prova solo di 0.1. Studio con tutti i renderer genera un warning Vite per chunk >500 kB: il bundle minimo core/player passa il proprio budget, ma non si dichiara raggiunto il budget prestazionale dell’app completa. Offline qui significa app già servita da host locale e contenuti disponibili: nessuna PWA/cache shell o HTML standalone anticipata.

Per 0.5 preservare schema 1.2.0, sorgenti/asset canonici, migrazioni, pipeline e regressioni. Implementare allora profili/capture/export e manifest di output, senza dedurre supporto PDF/video/HTML autonomo dalla sola riproduzione browser. Nessuna fase successiva avviata.
