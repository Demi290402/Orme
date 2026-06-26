# Documentazione Ufficiale delle Funzionalità - Orme

**Orme** è un'applicazione web gestionale concepita su misura per le esigenze dei **Gruppi Scout** (in particolare della Comunità Capi). Questa documentazione illustra il valore d'uso, i flussi operativi e la logica metodologica sottostante a ciascuna funzionalità del sistema.

---

## Visione di Prodotto

Nei gruppi scout, la gestione logistica e documentale risente spesso di tre problemi principali:
1. **Perdita della memoria storica**: Le informazioni sui luoghi di campo, sull'inventario o sulla formazione dei capi si disperdono con il normale avvicendamento dei ruoli nelle branche.
2. **Frammentazione dei dati**: Bilanci, liste d'attesa e contatti dei genitori sono distribuiti su file Excel personali, fogli di carta o chat, con rischi legati alla privacy (GDPR) e all'efficienza.
3. **Mancanza di collaborazione**: La burocrazia interna (es. redazione dei verbali o inventario) grava su pochi capi per via di strumenti poco accessibili.

Orme centralizza queste informazioni in un unico portale protetto e collaborativo, accessibile sia da smartphone che da PC, applicando logiche di **gamification** per stimolare la cooperazione tra i capi, e garantendo un **funzionamento offline reale** per l'uso sul campo.

---

## Modulo 1: Mappatura Collaborativa dei Luoghi di Campo

Il cuore storico di Orme è il catalogo dei luoghi per le attività scout (terreni di campeggio, case vacanze di branco, bivacchi).

### Obiettivo Metodologico
Consentire ai capi di capitalizzare le esperienze dei campi passati, evitando di dover ripartire da zero ogni anno nella ricerca dei luoghi e prevenendo la ripetizione involontaria dello stesso posto negli anni successivi.

### Funzionalità nel Dettaglio
* **Database Condiviso**: Una lista ricercabile e filtrabile di terreni e accantonamenti.
* **Scheda Tecnica Dettagliata**: Ogni luogo contiene informazioni su:
  * Copertura cellulare e contatti di emergenza (medico locale, ospedale).
  * Risorse logistiche: posti letto, spazio per tende, disponibilità di pali e legna, bagni e docce, refettorio al coperto, allaccio elettrico, possibilità di accensione fuochi a terra.
  * Criticità ambientali: insetti, malattie endemiche (zecche/leishmaniosi), aree trafficate nelle vicinanze, zone scarsamente ombreggiate.
* **Valutazione con Parametri Metodologici ("Orme")**: I capi possono valutare un luogo compilando una recensione basata su criteri oggettivi:
  * **Ombra**: Essenziale per i campi estivi caldi.
  * **Acqua Potabile**: Presenza e stabilità delle sorgenti.
  * **Legna**: Disponibilità per le costruzioni di reparto.
  * **Fuochi**: Possibilità regolamentata di cucinare a legna.
  * **Suolo**: Pendenza e rocciosità del terreno (fondamentale per piantare i picchetti).
  * **Servizi**: Stato dei bagni/cucine.
  * **Isolamento**: Distanza da strade asfaltate o centri abitati per garantire l'avventura scout.
* **Modifiche Istantanee e Registro Storico (Tracciabilità)**:
  * Al fine di incentivare la massima flessibilità e immediatezza operativa, ogni modifica o inserimento apportato da un capo è **istantaneo** e subito visibile a tutti. Non c'è alcun collo di bottiglia dovuto ad approvazioni preventive.
  * Per garantire la trasparenza e l'accuratezza delle informazioni, ad ogni modifica viene registrata una riga nella cronologia storica del luogo, specificando autore (totem o nickname), orario e descrizione dei campi modificati.
  * Un **badge rosso pulsante** sulla scheda in Home avvisa l'utente se un luogo ha subito modifiche dall'ultima volta che lo ha visualizzato, assicurando che nessuna novità logistica vada persa.

---

## Modulo 2: Gamification e Leaderboard

Per incentivare i capi a inserire dati e mantenere aggiornato il catalogo dei luoghi e l'inventario del magazzino, Orme implementa un sistema di gamification.

### Logica Incentivante
Ogni inserimento o aggiornamento genera un punteggio che permette al capo di scalare una classifica di gruppo e di sbloccare distintivi (Badge) virtuali sul proprio profilo.

### Assegnazione Punti
* **Aggiunta Nuovo Luogo**: +10 Punti.
* **Aggiunta Sito Web**: +2 Punti.
* **Aggiunta Indirizzo/Maps/GPS**: +3 Punti.
* **Inserimento Prezzi e Tariffe**: +5 Punti.
* **Aggiunta Evento a Calendario**: +3 Punti.
* **Ricerca nei Luoghi (1 al giorno)**: +1 Punto.
* **Lettura di un Verbale (una tantum)**: +5 Punti.
* **Aggiunta Memoria Storica/Recensione**: +5 Punti.
* **Lasciare un'Orma (Recensione Luogo)**: +10 Punti.
* **Controllo/Aggiornamento Attrezzi (Magazzino)**: +2 Punti.
* **Censimento Rapido di un Luogo (Audit Magazzino)**: +15 Punti.

### Livelli e Badge
* I capi avanzano di livello (es. *Piede Tenero*, *Esploratore*, *Pioniere*, *Trappeur*, *Guida delle Orme*).
* I distintivi premiano la specializzazione (es. "Geografo" per chi inserisce coordinate precise, "Mastro di Cambusa" per chi recensisce cucine attrezzate).

---

## Modulo 3: Gestione Lista d'Attesa e Iscrizioni

Il flusso di iscrizione dei bambini che vogliono entrare negli scout è una delle attività più delicate a livello di pubbliche relazioni e di conformità alla privacy.

### Il Problema Risolto
Evitare la duplicazione delle richieste inviate su canali diversi, prevenire la perdita di foglietti cartacei o file locali disconnessi, e monitorare in modo equo i tempi di attesa basati sulla data di richiesta originale.

### Flusso Operativo Semplificato
1. **Personalizzazione del Form Pubblico**: I Capigruppo configurano una pagina pubblica associata al proprio gruppo, caricando il banner grafico, inserendo un testo di benvenuto, spiegando la politica di accoglienza e impostando un disclaimer sulla privacy GDPR.
2. **Raccolta Richieste**: I genitori compilano il modulo via web (utilizzando un link o scansionando un QR Code distribuito dal gruppo). Non è richiesta alcuna registrazione per il genitore.
3. **Deduplicazione Automatica (Data Quality)**: Se un genitore carica due volte la richiesta per lo stesso figlio, il sistema confronta i campi chiave (Nome, Cognome, Data Nascita, Classe, Telefono Genitore) e ignora automaticamente il duplicato.
4. **Anagrafica Centralizzata e Consultabile**: Rimosso ogni flusso di workflow decisionale (accettazione/rifiuto). La lista d'attesa funge da semplice registro centralizzato e ordinato degli interessati, dove i capi possono ordinare o filtrare per branca di destinazione (L/C, E/G, R/S) e visualizzare l'età calcolata e i giorni trascorsi in attesa.
5. **Importazione di Storici (Excel/CSV)**: Per i gruppi che passano a Orme da vecchi archivi, è presente un tool di importazione con mappatura flessibile delle colonne e pulizia istantanea dei duplicati sia interni al file che rispetto al database.

---

## Modulo 4: Inventario e Materiali di Gruppo

Le tende di squadriglia, i teloni, i pali, le casse di cambusa e i generatori sono beni di valore che rischiano di andare perduti o di degradarsi per mancanza di manutenzione.

### Funzionalità Principali
* **Registro Consistenza**: Lista degli articoli con indicazione dello stato (Nuovo, Usato, Da riparare, Inutilizzabile).
* **Assegnazione Locazione**: Identificazione del punto esatto di stoccaggio (es. *Sede - Ripostiglio 1*, *Container*).
* **Gestione Prestiti alle Branche**: 
  * Tracciamento di quale branca ha prelevato determinati materiali (es. *Reparto per l'Uscita di Pasqua*).
  * Data di prelievo e data prevista di rientro.
  * Storico delle riparazioni per tracciare la durata e l'usura dei materiali nel tempo.
* **Censimento Rapido (Audit)**: Permette ai capi di catalogare i materiali direttamente durante i sopralluoghi nei luoghi di campo.

---

## Modulo 5: Contabilità e Cassa (Bilancio)

Una gestione finanziaria sana è alla base di ogni attività scout. Il modulo Bilancio permette una gestione multi-cassa.

### Struttura delle Casse
L'applicazione gestisce una cassa indipendente per ogni branca e una cassa generale di gruppo:
* **Branca L/C** (Branco/Cerchio)
* **Branca E/G** (Reparto)
* **Branca R/S** (Noviziato/Clan)
* **Comunità Capi** (CoCa)
* **Cassa di Gruppo** (gestita dai Capigruppo)

### Operazioni
* Registrazione rapida di **Entrate** e **Uscite**.
* Assegnazione a categorie standardizzate (Cambusa, Materiale Tecnico, Trasporti, Quote di iscrizione, Sede/Affitto).
* Calcolo in tempo reale del saldo complessivo e del saldo per singola cassa.
* Esportazione del foglio di cassa in formato Excel per facilitare il lavoro del tesoriere di gruppo in fase di bilancio consuntivo.

---

## Modulo 6: Verbali di Comunità Capi

La Comunità Capi (CoCa) si riunisce periodicamente per prendere decisioni metodologiche e logistiche. Il modulo Verbali dematerializza e struttura questo processo.

### Flusso di Lavoro
1. **Redazione Digitale**: Il segretario redige il verbale inserendo Data, Luogo, Presidente e Segretario.
2. **Appello Presenze**: Selezione dei capi presenti, assenti giustificati e assenti ingiustificati (collegata all'anagrafica dei membri della CoCa).
3. **Ordine del Giorno (OdG)**: Suddivisione dei temi discussi in punti chiari.
4. **Deliberazioni e Incarichi**: 
   * Possibilità di evidenziare decisioni formali prese dall'assemblea.
   * Assegnazione di compiti specifici (Action Items) ai singoli capi con scadenze temporali.
5. **Esportazione in PDF A4**: Generazione automatica di un documento pronto per la stampa o l'archiviazione formale, impaginato professionalmente.
6. **Notifiche Automatiche**: Alla pubblicazione, viene inviata una notifica in-app e una notifica e-mail automatica a tutti i membri del gruppo. Per garantire la massima trasparenza e conferma visiva, le notifiche vengono recapitate anche all'autore stesso del verbale.
7. **Statistiche di Presenza**: Grafici che mostrano l'andamento delle presenze dei capi ai consigli nel corso dell'anno scout, per monitorare la partecipazione e la salute metodologica del gruppo.

---

## Modulo 7: Rubrica e Preventivi Trasporti Privati

La logica degli spostamenti per campi e uscite di gruppo richiede contatti frequenti con ditte di autobus e pullman privati.

### Funzionalità Chiave
* **Modello Ibrido Collettivo/Privato**:
  - **Ditte Pullman (Pubblico)**: La rubrica dei contatti delle ditte (nome, telefono, email, capacità bus e comune/regione della Sede/Deposito) è pubblica e condivisa tra tutti i gruppi scout che utilizzano l'applicazione. Questo favorisce la collaborazione territoriale (es. i gruppi della stessa zona scout condividono lo stesso archivio di ditte consigliate). L'operatività territoriale è desumibile dall'indirizzo e città della sede del deposito.
  - **Preventivi di Viaggio (Privato)**: I preventivi specifici salvati per una tratta (prezzo preventivato, chilometri, numero persone e note del preventivo) sono privati e isolati per ciascun gruppo scout. Capi di gruppi diversi che visualizzano la stessa ditta vedranno esclusivamente i preventivi registrati dal proprio gruppo.
* **Calcolo Quota Stimata**: Permette di inserire l'importo totale del **Preventivo**, associandolo obbligatoriamente al **Chilometraggio (km)** e al **Numero di Persone**.
* **Visualizzazione Chiara**: Calcola in tempo reale la quota stimata a persona per ciascuna ditta nella rubrica, semplificando la stima dei costi del viaggio e la pianificazione del bilancio dell'uscita.
* **Filtro Intelligente**: Consente di filtrare la ditta inserendo il budget massimo riferito alla *quota a persona* (es. ditte che costano meno di 30€ a ragazzo) invece che al prezzo totale, rendendo la ricerca incredibilmente efficiente.

---

## Modulo 8: Funzionamento Offline Reale (PWA)

I campi scout e le uscite si svolgono spesso in zone montane o boschive prive di copertura internet. Orme risponde a questa problematica con un funzionamento offline reale a 360 gradi.

### Logica Operativa
* **Cache di Lettura locale**: Tutti i moduli principali (Luoghi, Inventario, Calendario, Verbali, Lista d'Attesa, Trasporti) vengono memorizzati nella memoria locale dello smartphone (`localStorage`) in fase di navigazione online. Se la connessione cade, l'app continua a mostrare i dati storici salvati.
* **Coda Scritture Offline (`offline_write_queue`)**: Qualsiasi inserimento o modifica effettuato offline (es. aggiornamento dello stato di una tenda o aggiunta di una spesa nel bosco) viene registrato localmente e applicato istantaneamente alla cache locale. La UI dell'utente si aggiorna subito come se fosse online.
* **Sincronizzazione in Background**: Non appena lo smartphone si riconnette a Internet, l'app avvia in background una sincronizzazione automatica delle transazioni accumulate, inviandole a Supabase in ordine cronologico.
* **Indicatore di Rete**: Un indicatore visivo nell'header mostra se l'app è Offline (con il numero di modifiche pendenti) o in fase di sincronizzazione. In caso di fallimento persistente, un pulsante rosso consente all'utente di tentare manualmente l'invio con un click.
