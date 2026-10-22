# Creare una presentazione con Studio 0.3

Avvia `pnpm dev:studio` dalla root dopo l'installazione descritta nel README. Apri l'indirizzo locale stampato da Vite, normalmente `http://127.0.0.1:5174`. Tutto il lavoro avviene nel browser, senza account o backend.

## Scene e spazio

Usa **Nuova scena** per iniziare. La scena viene inserita dopo quella selezionata; **Duplica scena** crea una copia con identità nuove. L'elenco a sinistra e il percorso principale mantengono lo stesso ordine. Seleziona una scena nell'elenco o trascinala nella mappa XY. Trascina lo sfondo per spostare la mappa; rotella, pulsanti +/− e Centra controllano la vista. Questi controlli non modificano il documento.

L'inspector modifica X, Y e Z in pixel CSS, rotazioni in gradi, scala uniforme positiva e dimensioni. X va a destra, Y verso il basso, Z verso l'osservatore; pivot al centro e rotazione Rz × Ry × Rx. Conferma un numero con Invio, Tab o uscita dal campo. Numeri non finiti, scala zero e valori fuori limite mostrano un errore associato al campo e non si applicano.

L'anteprima usa il player reale e inquadra la scena selezionata. Le rotazioni risultano allineate alla camera, come nella presentazione; la mappa mostra la proiezione XY del rettangolo. **Testo** contiene testo semplice, anche quando scrivi tag HTML: non viene eseguito. **Note relatore** vengono salvate ma non appaiono nel player pubblico.

## Annullamento e riferimenti

**Annulla** e **Ripristina** funzionano su creazione, duplicazione, eliminazione e inspector. Un trascinamento completo equivale a un comando; Escape durante il drag ripristina la posizione originale. Una modifica dopo Annulla elimina la history di Ripristina. La history conserva fino a 100 comandi e 20 MiB di snapshot; i più vecchi vengono espulsi. Non viene salvata nel JSON.

**Elimina scena** chiede conferma e ricuce il principale; Annulla ripristina anche transizioni e ID originali. Se altri percorsi referenziano la scena, Studio indica l'impatto e rifiuta l'eliminazione. I documenti importati con principale diverso dall'ordine delle scene o visite ripetute restano apribili e modificabili nei contenuti/trasformazioni; le modifiche strutturali vengono rifiutate per conservarne i riferimenti.

## File e recupero

**Salva JSON** scarica una copia con schema 1.1.0, comprendente testi, note, parent, percorsi, camera, track/cue ed estensioni opache. **Apri JSON** legge il file come copia in memoria. Prima valida il candidato; JSON invalido lascia intatto il lavoro. Se ci sono modifiche da salvare, puoi annullare la sostituzione. Un file storico 1.0.0 viene validato e migrato in memoria; Salva JSON scarica una nuova copia 1.1.0. Nessuna operazione modifica direttamente il file aperto sul disco.

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

## Gerarchia, percorsi e camera

Apri **Gerarchia spaziale**, seleziona la scena e scegli **Parent della scena**. Il rettangolo resta nella stessa posizione nel mondo; le coordinate nell’inspector diventano relative al nuovo parent. I discendenti non sono selezionabili come parent. Riferimenti assenti, cicli, profondità oltre 32 e decomposizioni fuori range non vengono applicati. Anche il drag di una figlia agisce sul piano XY del mondo.

Apri **Percorsi e connessioni** nell’inspector. Puoi creare/nominare/eliminare percorsi, scegliere quello principale e il nodo iniziale, aggiungere visite della stessa scena e collegare nodi già presenti. **Aggiungi visita** crea anche una connessione dal nodo selezionato: nessun nodo irraggiungibile è salvabile. Scegli la visita per modificarne scena/sosta e la connessione per label, condizione, durata o track. Una label come “Approfondisci B” è il testo del pulsante di scelta pubblico.

Per un ciclo usa prima **Abilita loop manuale (3 visite)**: aggiunge la policy e rende manuali tutte le connessioni esistenti. Modifica il limite nell’apposito campo, quindi collega il ritorno. La condizione **Limite visite** restringe ulteriormente gli ingressi al target. Il player non ripete da solo: una connessione manuale richiede sempre una scelta esplicita. Puoi fermarti, tornare Indietro o cambiare percorso; al limite, il pulsante indica perché è disabilitato.

**Camera indipendente** imposta una posa mondo sul nodo, distinta dalla scena. In **Camera e timeline**, seleziona una connessione e usa **Crea track a tre keyframe**, oppure associa una track esistente. Modifica i tempi normalizzati 0..1, posizioni, Euler e zoom aprendo i singoli keyframe. Gli estremi devono restare 0 e 1 e l’ordine deve essere strettamente crescente. Puoi aggiungere punti e rimuovere quelli intermedi, scegliere Lineare/Catmull-Rom e un easing della track. L’easing della connessione vale solo senza track.

**Scrub camera** modifica la preview reale senza emettere cue o cambiare visita. **Termina ispezione camera** ripristina la posa registrata. La presentazione arriva all’ultimo keyframe, anche se diverso dal fit della scena. Dopo un’interruzione, il primo keyframe runtime parte dalla camera effettiva. Un giro oltre 180° richiede keyframe intermedi; quando punti arrivano sul/dietro il piano prospettico, il pannello mostra un avviso e la Vista testuale resta disponibile.

I **Cue dichiarativi** hanno nome namespaced (per esempio `presentation.mark`), tempo in millisecondi entro la durata e payload JSON. Sono dati ed eventi per un host; Studio non esegue codice dal progetto. Panoramica, pan e zoom nel menu Camera sono ispezione temporanea. Salvataggio e recupero includono tutti i dati nuovi, senza selezione, scrub o history UI.

Per provare il documento completo apri `examples/structure-branching/project.json` in Studio, oppure `/structure` nel playground. Da A scegli B o C, poi D; Indietro torna al ramo realmente percorso. B è figlia di A e il ramo B usa una track con endpoint indipendente. D permette un ritorno limitato e il percorso alternativo mostra la stessa scena in un itinerario distinto.
