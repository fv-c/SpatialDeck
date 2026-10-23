# Renderer e plugin 0.5

Il core contiene soltanto JSON, schema e semantica. Il player espone `RendererRegistry`, `ContentRenderer`, `ContentContext` e `AssetResolver`; non importa plugin, parser, React o editor. L’app registra esplicitamente i renderer. Il bundle minimo non include DOMPurify, marked, KaTeX o fflate.

```ts
import {
  createPlayer,
  createAssetResolver,
  RendererRegistry,
} from "@spatialdeck/player";
import { registerRich } from "@spatialdeck/plugins/rich";
import { registerMedia } from "@spatialdeck/plugins/media";
import { registerNavigation } from "@spatialdeck/plugins/navigation";
import { PluginHost } from "@spatialdeck/plugins";
import { samplePlugin } from "@spatialdeck/plugins/sample";
import "@spatialdeck/player/style.css";
import "@spatialdeck/plugins/style.css";

const registry = new RendererRegistry();
registerRich(registry);
registerMedia(registry);
registerNavigation(registry); // Nessuna origine embed autorizzata.
const plugins = new PluginHost();
plugins.register(samplePlugin());
plugins.attach(registry);
const player = createPlayer({
  registry,
  assets: createAssetResolver(project.assets, blobs), // Map<assetId, Blob>
  onContentEvent: (name, payload) => console.log(name, payload),
});
await player.mount(container, project);
// Alla chiusura dell’host:
player.destroy();
plugins.destroy();
```

Gli entrypoint `rich`, `media`, `navigation`, `sample`, `archive` e SDK sono separati. `builtins` fornisce `createBuiltinRegistry()` per la combinazione usata dalle due app, incluso il badge di esempio. Il CSS delle formule e i font sono locali; un consumer degli artefatti compilati deve importare il CSS plugin. La sua CSP deve permettere quei font incorporati (`font-src data:`) oppure trasformarli in file locali; Studio/playground compilano invece dai sorgenti con font su file e `assetsInlineLimit: 0`.

## Contratto SDK 1.0.0

`PluginDefinition` contiene `descriptor`, `renderer()`, eventuali `migrations` e `dispose()`. Il descriptor specifica `id` namespaced, versione del plugin, `apiVersion: "1.0.0"`, `capabilities: {offline,capture}` e `dataSchemas`. Ogni versione dati ha `{schema,validate}`: lo schema JSON è documentazione esportabile, il predicato è codice approvato dall’host. L’SDK non compila JSON Schema né codice del progetto a runtime. Le eventuali impostazioni documento hanno un registro `settingsSchemas` distinto. Non si inventa una migrazione se manca una versione: `migrations` viene invocato soltanto esplicitamente dal consumer.

Il renderer implementa `mount(host,context)`, `update(context)` e `destroy()`. Il contesto espone blocco, documento, ID per istanza, stato attivo/media, `signal`, i testi sostituibili `messages` (da 0.4.1; assenti solo se l'host costruisce il contesto da sé: usare `defaultMessages`) e servizi: resolver asset, navigazione, subscription agli eventi player, emissione namespaced e diagnostica. `services.on` viene automaticamente disiscritto all’abort, oltre al dispose esplicito del renderer. `services.emit` ammette soltanto `<pluginId>:<nome>`. Errori sincroni di factory/mount/update sono isolati nel blocco; un renderer con attività asincrona deve gestire le proprie Promise e rispettare il signal. Unregister/destroy dell’host abortiscono anche i renderer ancora montati.

Da 0.4.1 il player non rimonta un blocco a ogni `updateDocument`: se blocco, asset referenziati e impostazioni del plugin non cambiano, il renderer riceve il nuovo documento con `update(context)`. Un renderer che legge altre parti di `context.document` deve quindi aggiornarsi in `update`, non solo in `mount`. I builtin mostrano stati e placeholder con `context.messages` e marcano quei testi con `lang = messages.lang`.

Da 0.5 (schema 1.3.0) un blocco può avere `frame` e `style`, ma il renderer non li riceve: `context.block` contiene soltanto `{id,type,data}`. È il player a posizionare e dimensionare l’host con il frame (proprietà CSSOM calcolate dalla matematica core) e ad applicare i token di stile come classi allowlist sull’host; un renderer non deve impostare posizione, dimensione o trasformazioni dell’host né rimuovere le classi `sd-*`. Spostare, ridimensionare, ruotare o ristilizzare un blocco non rimonta il renderer: riceve soltanto `update()` con il nuovo documento, come per ogni aggiornamento in cui il suo blocco non cambia. In una scena canvas l’host ha dimensioni fisse e `overflow: hidden`, è un contenitore flex in colonna (l’allineamento verticale è un token); immagini, SVG, video e iframe figli diretti dell’host lo riempiono. API plugin, permessi e trust model restano invariati (API 1.0.0).

Plugin assenti, versioni dati non disponibili o payload/impostazioni non validi producono placeholder con dati intatti. Un’API plugin diversa da 1.0.0 è invece un errore dello schema documento. Un progetto non può scegliere URL, import o script. L’inspector di esempio è un entrypoint separato e restituisce payload; è lo store editor a validare e registrare il comando undo/redo. Gli altri plugin possono usare l’editor JSON generico.

`capture` è una dichiarazione per il futuro consumer della Distribuzione (0.6): fino alla 0.4.1 non esiste un export/capture implementato. Il badge dichiara `offline:true` e `capture:false`; i contenuti web non dichiarano disponibilità offline. Nessun MIDI o OSC viene registrato o richiesto.

## Trust model e minacce

Il documento è dati non fidati; HTML/Markdown/SVG sono markup non fidato; un plugin JavaScript installato dall’host è codice fidato con l’autorità della pagina. L’SDK non è una sandbox JavaScript. Non aprire progetti tramite eval, import dinamico o inserimento preventivo nel DOM.

`security.ts` è la sola pipeline utente: marked → DOMPurify per Markdown; DOMPurify per HTML/SVG, seguito da controllo degli URL/riferimenti. HTML ammette semantica/tabelle ma nessuno style, class, ID, form, media incorporato, script, handler, iframe, meta o object. Link assoluti HTTP(S), senza credenziali e con noopener/noreferrer, richiedono azione utente. SVG ammette forme statiche, gradienti e riferimenti locali riscritti per istanza; niente foreignObject, SMIL, CSS o href esterni. Le immagini SVG locali passano dalla medesima policy prima di creare un URL derivato.

KaTeX riceve sempre `trust:false`, `maxExpand:500`, `maxSize:20`, macro nuove e `output:"htmlAndMathml"`. Solo il markup generato dalla libreria fidata conserva gli style matematici; nessuna deroga per HTML dell’utente. La preview è lo stesso renderer e rimane muta quando la presentazione pubblica è attiva.

L’embed è off per default. Un consumer può passare `allowedOrigins` a `registerNavigation`; solo HTTPS senza credenziali, ulteriore consenso per ogni frame, `sandbox=""`, niente allow-same-origin o script, referrer eliminato e revoca esplicita. È impostato anche l’attributo `csp` restrittivo del frame; il suo enforcement non è uniforme nei motori, quindi il confine verificato è la sandbox senza script, non una garanzia universale sulle sottorisorse remote. Gli embed con script non sono supportati. La CSP Studio vieta tutti i frame. Offline rimane il fallback dichiarato.

## Asset e archivio

Il resolver crea URL di proprietà per lease; `release()` è idempotente e l’abort revoca la lease. Gli ID devono essere nel registro documento; file assente/codec incompatibile è uno stato recuperabile. MIME e firme minime sono verificati per PNG/JPEG/GIF/WebP/SVG, WAV/MP3/Ogg/WebM/MP4 e VTT; `text/plain` è UTF-8. Formati non riconosciuti non vengono renderizzati. La firma non certifica la decodificabilità: i renderer gestiscono separatamente l’errore del browser.

Da 0.4.1: un SVG può avere BOM, dichiarazione XML, istruzioni di elaborazione, commenti e un DOCTYPE `svg` (anche con internal subset) prima della radice; il prologo è saltato senza interpretare DTD o entità, e il markup passa comunque dalla pipeline di sanitizzazione. SVG, VTT e testo sono decodificati interamente in UTF-8 in streaming: un carattere diviso tra due blocchi è valido, byte UTF-8 invalidi sono rifiutati. Il digest usa `crypto.subtle` quando disponibile, altrimenti un SHA-256 locale: gli asset con digest si caricano anche su HTTP fuori da localhost. Verifica e digest sono memoizzati per Blob e metadati attesi. Gli errori del resolver sono `AssetError` (`missing`, `size`, `signature`, `digest`, `aborted`), che i renderer traducono con `messages.assetMissing` e `messages.assetInvalid`. Un resolver può implementare `revision(assetId)` per segnalare che la risorsa dietro un ID è cambiata pur con lo stesso record (per esempio un file associato dopo l’apertura): il player risolve di nuovo solo quei blocchi; senza `revision`, ritenta comunque i blocchi il cui asset non si era risolto.

`writeArchive`/`readArchive` sono in `@spatialdeck/plugins/archive`. Il formato ZIP ha `project.json`, `manifest.json` versione 1.0.0 e file `assets/<id>/<nome-normalizzato>`. Per asset, il manifest contiene `id,path,entry,mime,byteLength,sha256`: `path` resta quello canonico JSON, `entry` è il nome portabile nel ZIP. Tutti i digest SHA-256 e i CRC vengono controllati. Archivio privo di risorse richieste non sostituisce mai il progetto corrente. JSON puro conserva i path relativi e consente associazione manuale dei file mancanti; il resolver può essere fornito da qualunque host autorizzato.

Limiti: 50 MiB/file, 200 MiB totali decompressi incluse le entry JSON, 10 MiB per JSON, 10.000 entry. Directory esplicite, ZIP64, cifratura e archivi multidisco non sono supportati. Header locali/centrali devono coincidere e coprire i dati senza sovrapposizioni o file nascosti. Sono rifiutati traversal, backslash, path assoluti, percent encoding, nomi non NFC, duplicati e link simbolici. Inflate è incrementale con controllo dell’output effettivo; nessun file viene estratto sul filesystem.

IndexedDB (v3 da 0.4.1) mantiene revisioni e byte/MIME delle risorse nella medesima transazione. La lettura ricrea Blob, evitando il difetto WebKit macOS 14 nella clonazione di File-backed Blob. Le chiavi includono projectId, assetId e digest; i byte di una chiave già presente non vengono riletti né riscritti. La GC conta, tramite l’indice `assetKeys`, i riferimenti delle sole chiavi appartenute alle revisioni eliminate; undo conserva inoltre i Blob in memoria per la metadata precedente. Quota/conflitto non rendono il download dipendente dallo storage.

Dipendenze fissate e licenze: [DOMPurify 3.4.17](https://registry.npmjs.org/dompurify/3.4.17) MPL-2.0 OR Apache-2.0; [marked 18.1.1](https://registry.npmjs.org/marked/18.1.1), [KaTeX 0.19.0](https://registry.npmjs.org/katex/0.19.0) e [fflate 0.8.3](https://registry.npmjs.org/fflate/0.8.3) MIT. Le risorse originali della gallery hanno [dedica CC0](../examples/content-gallery/LICENSE.md). La licenza del repository non viene cambiata.
