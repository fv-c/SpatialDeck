# Creare una presentazione con Studio 0.2

Avvia `pnpm dev:studio` dalla root dopo l'installazione descritta nel README. Apri l'indirizzo locale stampato da Vite, normalmente `http://127.0.0.1:5174`. Tutto il lavoro avviene nel browser, senza account o backend.

## Scene e spazio

Usa **Nuova scena** per iniziare. La scena viene inserita dopo quella selezionata; **Duplica scena** crea una copia con identità nuove. L'elenco a sinistra e il percorso principale mantengono lo stesso ordine. Seleziona una scena nell'elenco o trascinala nella mappa XY. Trascina lo sfondo per spostare la mappa; rotella, pulsanti +/− e Centra controllano la vista. Questi controlli non modificano il documento.

L'inspector modifica X, Y e Z in pixel CSS, rotazioni in gradi, scala uniforme positiva e dimensioni. X va a destra, Y verso il basso, Z verso l'osservatore; pivot al centro e rotazione Rz × Ry × Rx. Conferma un numero con Invio, Tab o uscita dal campo. Numeri non finiti, scala zero e valori fuori limite mostrano un errore associato al campo e non si applicano.

L'anteprima usa il player reale e inquadra la scena selezionata. Le rotazioni risultano allineate alla camera, come nella presentazione; la mappa mostra la proiezione XY del rettangolo. **Testo** contiene testo semplice, anche quando scrivi tag HTML: non viene eseguito. **Note relatore** vengono salvate ma non appaiono nel player pubblico.

## Annullamento e riferimenti

**Annulla** e **Ripristina** funzionano su creazione, duplicazione, eliminazione e inspector. Un trascinamento completo equivale a un comando; Escape durante il drag ripristina la posizione originale. Una modifica dopo Annulla elimina la history di Ripristina. La history conserva fino a 100 comandi e 20 MiB di snapshot; i più vecchi vengono espulsi. Non viene salvata nel JSON.

**Elimina scena** chiede conferma e ricuce il principale; Annulla ripristina anche transizioni e ID originali. Se altri percorsi referenziano la scena, Studio indica l'impatto e rifiuta l'eliminazione. I documenti importati con principale diverso dall'ordine delle scene o visite ripetute restano apribili e modificabili nei contenuti/trasformazioni; le modifiche strutturali vengono rifiutate per conservarne i riferimenti.

## File e recupero

**Salva JSON** scarica una copia con schema 1.0.0, comprendente testi, note, trasformazioni, percorsi ed estensioni opache. **Apri JSON** legge il file come copia in memoria. Prima valida il candidato; JSON invalido lascia intatto il lavoro. Se ci sono modifiche da salvare, puoi annullare la sostituzione. Nessuna operazione modifica direttamente il file aperto sul disco.

L'autosave locale scrive in IndexedDB dopo 750 ms e conserva le ultime dieci revisioni per progetto. Al reload propone il recupero con titolo, revisione, data e numero di scene; puoi annullare. Il pulsante **Recupero** permette di scegliere anche una revisione precedente. Salva il risultato come JSON per conservarlo fuori dal browser.

L'autosave **non è un backup**: cancellare dati del browser o cambiare origine/porta può rendere indisponibili le revisioni. Storage negato, quota e revisioni concorrenti in due schede producono un avviso; il documento attivo rimane in memoria e Salva JSON resta disponibile. La scheda in conflitto deve salvare una copia del proprio lavoro; non esiste sincronizzazione collaborativa.

## Tastiera, piccoli schermi e presentazione

Tutti i pulsanti e campi sono raggiungibili con Tab; attivali con Invio/Spazio. I pannelli Scene e Inspector sono richiudibili dal titolo. Le coordinate numeriche offrono un'alternativa completa al drag. Con focus sulla mappa, le frecce spostano la vista ed Escape annulla il gesto.

- Ctrl/Cmd+S: salva JSON, includendo il testo del campo attivo.
- Ctrl/Cmd+O: apri il selettore di file.
- Ctrl/Cmd+Z e Ctrl/Cmd+Shift+Z: annulla/ripristina fuori dai campi di testo.
- Canc/Backspace fuori dai campi: conferma eliminazione della scena selezionata.
- **Presenta**: apre un'istanza dello stesso player; frecce/PageUp/PageDown/Spazio navigano quando il player ha focus. Escape o **Torna all'editor** ripristinano il focus e mantengono il modello.

La preferenza di sistema per movimento ridotto è rispettata. Vista testuale e Riduci movimento sono disponibili nel player. Tablet/mobile mantengono file, scene, inspector e presentazione; la mappa di precisione è pensata soprattutto per desktop. Le prove automatiche a 768, 390 e 320 px non equivalgono a una prova su dispositivi fisici.
