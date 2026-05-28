# Documentazione Ufficiale delle Funzionalità - Orme

**Orme** è un'applicazione web gestionale concepita su misura per le esigenze dei **Gruppi Scout** (in particolare della Comunità Capi). Questa documentazione illustra il valore d'uso, i flussi operativi e la logica metodologica sottostante a ciascuna funzionalità del sistema.

---

## Visione di Prodotto

Nei gruppi scout, la gestione logistica e documentale risente spesso di tre problemi principali:
1. **Perdita della memoria storica**: Le informazioni sui luoghi di campo o sull'inventario si disperdono con il normale avvicendamento dei capi nelle branche.
2. **Frammentazione dei dati**: Bilanci, liste d'attesa e contatti dei genitori sono distribuiti su file Excel personali, fogli di carta o chat, con rischi legati alla privacy (GDPR) e all'efficienza.
3. **Mancanza di collaborazione**: La burocrazia interna (es. redazione dei verbali o inventario) grava su pochi capi per via di strumenti poco accessibili.

Orme centralizza queste informazioni in un unico portale protetto e collaborativo, accessibile sia da smartphone che da PC, applicando logiche di **gamification** per stimolare la cooperazione tra i capi.

---

## Modulo 1: Mappatura Collaborativa dei Luoghi di Campo

Il cuore storico di Orme è il catalogo dei luoghi per le attività scout (terreni di campeggio, case vacanze di branco, bivacchi).

### Obiettivo Metodologico
Consentire ai capi di capitalizzare le esperienze dei campi passati, evitando di dover ripartire da zero ogni anno nella ricerca dei luoghi.

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
* **Flusso di Proposta e Approvazione (Proposals)**:
  * Qualsiasi capo può proporre l'aggiunta o la modifica di un luogo.
  * Per mantenere l'accuratezza dei dati, le proposte non vengono pubblicate immediatamente ma entrano in una coda di validazione.
  * I capi con ruolo di moderatore (es. i Capigruppo) approvano la proposta, che diventa così visibile a tutti.

---

## Modulo 2: Gamification e Leaderboard

Per incentivare i capi a inserire dati e mantenere aggiornato il catalogo dei luoghi, Orme implementa un sistema di gamification.

### Logica Incentivante
Ogni inserimento o aggiornamento genera un punteggio che permette al capo di scalare una classifica di zona o di gruppo e di sbloccare distintivi (Badge) virtuali.

### Assegnazione Punti
* **Inserimento Luogo Base**: +10 Punti.
* **Coordinate GPS precise**: +3 Punti (indispensabile per trovare i terreni nel bosco).
* **Fascia di prezzo o costo indicativo**: +5 Punti.
* **Sito Web o Link Maps**: +2 Punti.
* **Scrittura Recensione**: +5 Punti.

### Livelli e Badge
* I capi avanzano di livello (es. *Piede Tenero*, *Esploratore*, *Pioniere*, *Trappeur*, *Guida delle Orme*).
* I distintivi premiano la specializzazione (es. "Geografo" per chi inserisce coordinate precise, "Mastro di Cambusa" per chi recensisce cucine attrezzate).

---

## Modulo 3: Gestione Lista d'Attesa e Iscrizioni

Il flusso di iscrizione dei bambini che vogliono entrare negli scout è una delle attività più delicate a livello di pubbliche relazioni e di conformità alla privacy.

### Il Problema Risolto
Evitare la duplicazione delle richieste inviate su canali diversi e calcolare in modo equo i tempi di attesa basati sulla data di richiesta originale.

### Flusso Operativo
1. **Personalizzazione del Form Pubblico**: I Capigruppo configurano una pagina pubblica associata al proprio gruppo. Possono caricarvi il banner grafico del gruppo, inserire un testo di benvenuto, spiegare la politica di accoglienza e impostare un disclaimer sulla privacy.
2. **Raccolta Richieste**: I genitori compilano il modulo via web (utilizzando un link o scansionando un QR Code distribuito dal gruppo). Non è richiesta alcuna registrazione per il genitore.
3. **Deduplicazione Automatica (Data Quality)**: Se un genitore preme più volte il tasto di invio o carica due volte la richiesta per lo stesso figlio, il sistema confronta i campi chiave (Nome, Cognome, Data Nascita, Classe, Telefono Genitore) e ignora automaticamente il doppione, notificando l'avvenuta protezione dei dati.
4. **Importazione di Storici (Excel/CSV)**: Per i gruppi che passano a Orme da vecchi archivi, è presente un tool di importazione con mappatura flessibile delle colonne e pulizia istantanea dei duplicati sia interni al file che rispetto al database.
5. **Calcolo Dinamico dei Dati**: La dashboard dei capi mostra automaticamente:
   * L'età esatta del bambino calcolata sulla data odierna.
   * La classe frequentata (utile per capire in quale Branca inserirlo: L/C, E/G, R/S).
   * I giorni trascorsi in lista d'attesa (per gestire le priorità cronologiche).

---

## Modulo 4: Inventario e Materiali di Gruppo

Le tende di squadriglia, i teloni, i pali, le casse di cambusa e i generatori sono beni di valore che rischiano di andare perduti o di degradarsi per mancanza di manutenzione.

### Funzionalità Principali
* **Registro Consistenza**: Lista degli articoli con indicazione dello stato (Nuovo, Usato, Da riparare, Danneggiato).
* **Assegnazione Locazione**: Identificazione del punto esatto di stoccaggio (es. *Scaffale A della sede*, *Fondo del Container*).
* **Gestione Prestiti alle Branche**: 
  * Tracciamento di quale branca ha prelevato determinati materiali (es. *Reparto per l'Uscita di Pasqua*).
  * Data di prelievo e data prevista di rientro.
  * Storico delle riparazioni per tracciare la durata e l'usura dei materiali nel tempo.

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
5. **Firma e Approvazione**: I presenti possono "firmare" digitalmente confermando la lettura del verbale.
6. **Esportazione in PDF A4**: Generazione automatica di un documento pronto per la stampa o l'archiviazione formale, impaginato professionalmente.
7. **Statistiche di Presenza**: Grafici che mostrano l'andamento delle presenze dei capi ai consigli nel corso dell'anno scout, per monitorare la partecipazione e la salute metodologica del gruppo.
