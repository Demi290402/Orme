# 📘 Specifiche Funzionali di Prodotto (FSD) — Orme

**Prodotto**: Orme (Ecosistema Gestionale & Metodologico Scout)  
**Versione Documento**: 2.5.0  
**Data Rilascio**: Novembre 2026  
**Stato**: Approvato / In Produzione  
**Destinatari**: Comunità Capi, Sviluppatori, Product Manager, Responsabili di Gruppo e Formatori  

---

## 📑 Indice dei Contenuti
1. [Visione Strategica & Metodologia Scout](#1-visione-strategica--metodologia-scout)
2. [Modello di Governance, Ruoli & Gestione Accessi](#2-modello-di-governance-ruoli--gestione-accessi)
3. [Modulo 1: Mappatura Collaborativa & Scheda Luogo](#3-modulo-1-mappatura-collaborativa--scheda-luogo)
4. [Modulo 2: Verbali di Comunità Capi & Gestione Documentale](#4-modulo-2-verbali-di-comunit%C3%A0-capi--gestione-documentale)
5. [Modulo 3: Lista d'Attesa & Iscrizioni Pubbliche GDPR](#5-modulo-3-lista-dattesa--iscrizioni-pubbliche-gdpr)
6. [Modulo 4: Inventario, Attrezzature & Magazzino](#6-modulo-4-inventario-attrezzature--magazzino)
7. [Modulo 5: Calendario di Gruppo & Sincronizzazione iCal](#7-modulo-5-calendario-di-gruppo--sincronizzazione-ical)
8. [Modulo 6: Bilancio & Contabilità Multi-Cassa](#8-modulo-6-bilancio--contabilit%C3%A0-multi-cassa)
9. [Modulo 7: Rubrica Trasporti Privati & Calcolo Quote Viaggio](#9-modulo-7-rubrica-trasporti-privati--calcolo-quote-viaggio)
10. [Modulo 8: Gamification, Punti & Leaderboard Attiva](#10-modulo-8-gamification-punti--leaderboard-attiva)
11. [Modulo 9: Assistente Metodologico Intelligente Akela AI](#11-modulo-9-assistente-metodologico-intelligente-akela-ai)
12. [Modulo 10: Esperienza Smartwatch Dedicata (Orme Watch)](#12-modulo-10-esperienza-smartwatch-dedicata-orme-watch)
13. [Modulo 11: Centro Notifiche Ibrido & Impostazioni di Sistema](#13-modulo-11-centro-notifiche-ibrido--impostazioni-di-sistema)
14. [Modulo 12: Architettura Offline-First Reale (PWA)](#14-modulo-12-architettura-offline-first-reale-pwa)

---

## 1. Visione Strategica & Metodologia Scout

L'attività di un Gruppo Scout (Agesci, Fse, Cngei o indipendenti) richiede il coordinamento continuo di decine di capi volontari per educare centinaia di ragazzi distribuiti nelle tre branche metodologiche:
* **Branca Lupetti / Coccinelle (L/C)**: 8 - 11/12 anni (Ambiente fantastico della Giungla o del Bosco).
* **Branca Esploratori / Guide (E/G)**: 11/12 - 16 anni (Avventura, Squadriglia, Vita all'aperto, Tecniche di campo).
* **Branca Rover / Scolte (R/S)**: 16 - 20/21 anni (Strada, Comunità e Servizio).
* **Comunità Capi (Co.Ca.)**: Adulti responsabili del Progetto Educativo di Gruppo.

### Problemi Storici Risolti da Orme
1. **Perdita della Memoria Storica**: Il ricambio periodico dei capi unità causa la perdita di contatti di terreni, proprietari, condizioni logistiche e bilanci delle uscite passate.
2. **Frammentazione Informativa**: Dati gestiti su file Excel personali, chat WhatsApp, fogli volanti o drive privati che si perdono nel tempo.
3. **Rischi Privacy & GDPR**: La raccolta delle iscrizioni e dei contatti dei minori su carta o form non strutturati viola le normative europee di tutela della privacy.
4. **Isolamento Connettivo nei Boschi**: Le normali app cloud non funzionano sui monti o in zone di campeggio prive di campo telefonico.

Orme unifica l'intero ciclo di vita gestionale del gruppo in una piattaforma solida, moderna e conforme alla metodologia scout.

---

## 2. Modello di Governance, Ruoli & Gestione Accessi

Orme applica una struttura di sicurezza basata su isolamento rigoroso per **Gruppo Scout** (`groupId`).

### 2.1 Livelli Utente e Permessi
* **Capo Gruppo (CG)**: Accesso completo alla governance di CoCa, gestione membri attivi/storici, impostazioni del PIN di gruppo, personalizzazione del form di iscrizione, supervisione di tutte le casse di branca e cassa generale.
* **Capo / Membro CoCa Attivo**: Accesso a tutte le funzionalità operative del proprio gruppo: visualizzazione e censimento luoghi, redazione verbali, consultazione lista d'attesa, prelievo attrezzature da inventario, registrazione spese di branca, consultazione e creazione eventi a calendario.
* **Membro Storico / Servizio Concluso (Soft-Delete)**: Mantenimento dello storico nominativo nei vecchi verbali e presenze senza visibilità operativa nei consigli futuri.
* **Famiglie / Genitori (Esterni non autenticati)**: Accesso protetto e limitato esclusivamente al Form Pubblico di Iscrizione del gruppo scout.

### 2.2 Flusso di Registrazione & Ammissione alla Comunità Capi
Per evitare che utenti non autorizzati accedano ai dati riservati del gruppo, Orme implementa un doppio binario di ingresso:
1. **Accesso Immediato tramite PIN di Gruppo**: Il Capo Gruppo genera un codice PIN segreto. L'utente che inserisce il PIN corretto in fase di registrazione o cambio gruppo viene autenticato immediatamente come membro attivo.
2. **Accesso con Approvazione a Doppia Firma (Senza PIN)**: Se il nuovo capo non dispone del PIN, invia una richiesta di ammissione. L'ammissione richiede la convalida esplicita da parte di **almeno 2 capi attivi** già confermati nel gruppo.
3. **Mantenimento Storico Punti al Cambio Gruppo**: Quando un capo si trasferisce in una nuova Comunità Capi, i punti maturati nel gruppo precedente vengono archiviati nel suo storico personale (`groupPoints`), e la classifica nel nuovo gruppo riparte da zero per garantire equità meritocratica.

---

## 3. Modulo 1: Mappatura Collaborativa & Scheda Luogo

Il modulo Luoghi è il catalogo condiviso delle strutture per uscite, bivacchi, cacce e campi estivi/invernali.

### 3.1 Anatomia della Scheda Luogo (Redesign Human-Crafted)
La scheda luogo è organizzata in sezioni ergonomiche a gerarchia visiva ottimizzata:

1. **Header & Badge Intelligenti**:
   * **Badge Freschezza Dati**: Calcolato automaticamente dall'ultimo aggiornamento:
     - 🟢 *Dati recenti* (< 1 anno)
     - 🟡 *Da verificare* (1-2 anni)
     - 🔴 *Non recenti* (> 2 anni)
   * **Pill Rapidi Web & Social (Zero Footprint)**:
     - 🌐 **Sito Web**: Link diretto al portale ufficiale della struttura.
     - 📘 **Facebook**: Collegamento alla pagina ufficiale Facebook.
     - 📸 **Instagram**: Handle e link al profilo Instagram.
     - *Regola Zero Footprint*: Se questi campi sono `null` o vuoti, **nessun pill o placeholder vuoto viene renderizzato**.

2. **Geolocalizzazione, Mappa & Contatti d'Emergenza**:
   * Coordinate GPS decimali con copia rapida negli appunti per navigatori.
   * Collegamento dinamico a **Google Maps** e pulsante per avvio immediato della navigazione su smartphone.
   * Numeri utili di emergenza integrati: Medico di Guardia locale, Ospedale con Pronto Soccorso, Carabinieri e Corpo Forestale.

3. **Matrice Servizi & Risorse Logistiche**:
   * Spazio tende e capienza tende di squadriglia / tende di reparto.
   * Posti letto al coperto e numero di stanze.
   * Servizi igienici: numero bagni, presenza docce con acqua calda, scarico per acque reflue.
   * Presenza e portata di acqua potabile (sorgente, acquedotto, cisterne).
   * Allaccio all'energia elettrica e potenza disponibile.
   * Cucina attrezzata (fornelli industriali, frigoriferi, freezer, stoviglie).
   * Riscaldamento per uscite invernali (legna, gasolio, termosifoni, stufe).
   * Disponibilità di legna da ardere e pali per costruzioni di reparto.
   * Autorizzazione e regolamentazione per **fuochi a terra**.

4. **Attività Praticabili & Branche Consigliate**:
   * Tag visivi: *Uscita di Branco/Cerchio*, *Caccia*, *S. Giorgio*, *Campo Estivo di Reparto*, *Bivacco di Squadriglia*, *Hike / Route di Clan*, *San Paolo / Eventi CoCa*.

5. **Condizioni Economiche & Tariffe**:
   * Costo a persona a notte, quota forfait fissa, costo utenze (luce/acqua a consumo), caparra richiesta e modalità di disdetta.

6. **Avvertenze, Rischi Ambientali & Restrizioni**:
   * Presenza di zecche o focolai di leishmaniosi animale.
   * Zone ad alto traffico o pericoli naturali (scarpate, corsi d'acqua a piena rapida).
   * Regolamenti di parchi naturali o riserve protette.

7. **Esperienze della Community & Rating Multidimensionale "Orme"**:
   * Valutazione oggettiva da 1 a 5 impronte scout per:
     - 🌲 **Ombra**
     - 💧 **Acqua Potabile**
     - 🪵 **Legna da Costruzione**
     - 🔥 **Possibilità Fuochi**
     - ⛺ **Qualità del Suolo (picchettabilità)**
     - 🚿 **Stato dei Servizi Igienici**
     - 🏞️ **Isolamento & Esperienza di Natura**
   * Recensioni testuali descrittive con consigli pratici da capo a capo e caricamento foto.

### 3.2 Modifiche Istantanee & Tracciabilità (Audit Trail)
* Nessuna approvazione preliminare bloccante: ogni capo può correggere subito recapiti errati o aggiornare le tariffe.
* Ogni variazione genera una riga immutabile nella tabella `location_history` specificando: data, ora, autore e sintesi dei campi modificati.
* Un **badge rosso notifiche** evidenzia le novità non lette finché il capo non apre il dettaglio della scheda.
* Modalità di segnalazione rapida in caso di struttura chiusa o inagibile.

---

## 4. Modulo 2: Verbali di Comunità Capi & Gestione Documentale

Il modulo Verbali dematerializza e struttura le assemblee periodiche della Comunità Capi.

### 4.1 Struttura e Flusso di Redazione
1. **Intestazione Formale**:
   * Calcolo automatico dell'**Anno Scout** (es. *"2026 — 2027"* per attività avviate in autunno).
   * Numero progressivo del verbale con azzeramento o continuità per anno associativo.
   * Data, luogo della riunione, ora inizio e ora fine.
   * Selezione di **Presidente** dell'assemblea e **Segretario verbalizzante**.
2. **Registro Presenze Avanzato**:
   * **Presenti**, **Assenti Giustificati**, **Assenti Ingiustificati**, **Ritardi** (con orario) e **Uscite Anticipate** (con orario).
   * Inserimento di **Ospiti Esterni** (es. Assistente Ecclesiastico di Zona, IAB, Genitori invitati).
   * **Snapshot Immutabile (`presentiNomi`)**: All'atto del salvataggio, il sistema crea una fotografia immutabile dei nomi e ruoli di quel giorno. Se negli anni successivi un capo lascia il gruppo o modifica il proprio nominativo, il verbale storico resta legalmente integro e inalterato.
3. **Punti all'Ordine del Giorno (OdG) & Editor Rich-Text TipTap**:
   * Redazione per punti distinti con supporto a grassetto, elenchi, citazioni e **tabelle stile Microsoft Word** per la pianificazione dettagliata di orari e materiali.
4. **Posti d'Azione (Action Items)**:
   * Assegnazione formale di compiti a specifici capi con descrizione dell'azione (*"Chi fa cosa"*) e scadenza temporale perentoria (*"Entro quando"*).
5. **Movimenti di Cassa & Ritorno Economico**:
   * Registrazione di quote raccolte o rimborsi approvati durante il consiglio.
6. **Date Importanti**:
   * Scadenze e prossime uscite concordate in assemblea per l'invio al calendario di gruppo.

### 4.2 Motori di Esportazione Documentale
* **Generatore PDF A4 Professionale**: Genera un documento con impaginazione tipografica, testata del gruppo, tabella presenze, numerazione di pagina, spazio per la firma autografa di Presidente e Segretario, privo di emoji non stampabili.
* **Esportazione DOCX (OpenXML)**: File Word completamente modificabile, con tabelle formattate, bordi professionali e margini normalizzati.

### 4.3 Statistiche di Partecipazione & Soft-Delete Membri
* Grafici di frequenza alle riunioni per singolo capo e per staff di branca.
* Funzionalità di **soft-delete** per i capi che hanno concluso il servizio: non compaiono nei nuovi appelli ma mantengono l'integrità dei verbali passati con funzione di ripristino per "capi orfani".

---

## 5. Modulo 3: Lista d'Attesa & Iscrizioni Pubbliche GDPR

Gestione etica, trasparente e protetta delle richieste di ammissione di bambini e ragazzi nel Gruppo Scout.

### 5.1 Form Builder Visuale (`PersonalizzaFormIscrizione`)
I Capigruppo possono configurare l'esperienza visiva e informativa della pagina pubblica:
* Caricamento immagine di copertina (Banner) con compressione automatica client-side in Canvas per azzerare i consumi di banda.
* Titolo della pagina, messaggio di benvenuto e spiegazione del Progetto Educativo.
* Testo informativo per i genitori sulla lista d'attesa e sui criteri di accoglienza.
* **Disclaimer Privacy GDPR obbligatorio**: Spunta di consenso esplicito al trattamento dei dati personali del minore.
* Messaggio personalizzato di conferma invio richiesta.

### 5.2 Algoritmo di Deduplicazione Intelligente
Per evitare che genitori in ansia compilino il form più volte generando doppioni:
* L'algoritmo confronta in tempo reale: `nome_ragazzo`, `cognome_ragazzo`, `data_nascita`, `classe` e `telefono_genitore`.
* In presenza di corrispondenza, il sistema impedisce l'inserimento ridondante comunicando che la richiesta è già regolarmente acquisita con la data originaria.

### 5.3 Gestione Anagrafica Centralizzata per i Capi
* Elenco ordinato cronologicamente per data di inserimento della richiesta originale.
* **Calcolo Automatico dell'Età**: Mostrato in anni e mesi, con associazione automatica della branca di appartenenza (Lupetti/Coccinelle, Esploratori/Guide, Rover/Scolte).
* Nessun workflow burocratico bloccante: la lista funge da registro trasparente per le chiamate di inizio anno scout.
* **Importazione / Esportazione Massiva Excel**: Migrazione da vecchi elenchi cartacei o fogli di calcolo con pulizia istantanea dei duplicati.

---

## 6. Modulo 4: Inventario, Attrezzature & Magazzino

Tracciamento dei beni materiali di proprietà del Gruppo Scout.

### 6.1 Catalogazione e Anagrafica Articoli
* Categorie: *Tende di Squadriglia*, *Teloni & Bivacco*, *Pionieristica (pali, corde, carrucole)*, *Cambusa (fornelloni, bombole, pentolame)*, *Illuminazione & Elettricità*, *Materiale Sanitario / Pronto Soccorso*.
* Stato di Conservazione: **Ottimo**, **Buono**, **Da Riparare**, **Inutilizzabile / Da Dismettere**.
* Collocazione Fisica: Identificazione esatta dello spazio (es. *Sede Centrale - Armadio A*, *Container Campo*, *Ripostiglio Reparto*).

### 6.2 Gestione Movimentazioni & Prestiti
* Registrazione rapida del prelievo con associazione alla branca utilizzatrice (es. *Reparto per Corsa di San Giorgio*).
* Definizione della data prevista di restituzione con allarmi visivi in caso di ritardo.
* Restituzione con annotazione di danni o necessità di manutenzione (es. *paletto piegato, cerniera rotta*).
* **Funzione "Audit / Censimento Rapido"**: Check periodico dell'intero magazzino con attribuzione di punti gamification al capo verificatore.

---

## 7. Modulo 5: Calendario di Gruppo & Sincronizzazione iCal

Pianificazione annuale coordinata tra tutte le unità del gruppo.

### 7.1 Visualizzazione e Gestione Eventi
* Filtro per branca: Eventi di Branco/Cerchio, Reparto, Noviziato/Clan, Comunità Capi, Eventi di Gruppo, Assemblee Genitori.
* Dettagli evento: Titolo, data/ora inizio e fine, luogo di svolgimento, note organizzative e orari di ritrovo.
* Rilevamento automatico di sovrapposizioni tra eventi che condividono le medesime sedi o attrezzature.

### 7.2 Interoperabilità RFC 5545 (.ics)
* **Esportazione iCalendar**: Generazione di feed `.ics` standard compatibile con Google Calendar, Apple iCal e Microsoft Outlook.
* **Importazione Calendario Esterno**: Possibilità di caricare file `.ics` per integrare il calendario di zona o regionale con un click.

---

## 8. Modulo 6: Bilancio & Contabilità Multi-Cassa

Gestione economica conforme al principio scout di trasparenza e corretta amministrazione.

### 8.1 Architettura Multi-Cassa
Ciascun conto è isolato e indipendente:
* **Cassa di Gruppo** (gestita dai Capigruppo per quote censimento, sede e assicurazione).
* **Cassa Comunità Capi** (gestione cassa comune, formazioni e uscite CoCa).
* **Cassa Branco / Cerchio (L/C)**.
* **Cassa Reparto (E/G)**.
* **Cassa Noviziato / Clan (R/S)**.

### 8.2 Registrazione e Rendicontazione
* Tipologia di movimento: **Entrata** o **Uscita**.
* Categorie standard: *Quote Iscrizione / Censimenti*, *Cambusa*, *Trasporti*, *Materiale Tecnico*, *Affitto Terreni / Sedi*, *Attività & Uscite*, *Cassa di Solidarietà*.
* Calcolo in tempo reale del saldo per singola cassa e del saldo aggregato di gruppo.
* Esportazione del Libro Cassa in formato Excel (.xlsx) per la revisione contabile e la presentazione all'assemblea di gruppo.

---

## 9. Modulo 7: Rubrica Trasporti Privati & Calcolo Quote Viaggio

Semplificazione dei contatti e delle stime economiche per il noleggio di pullman e autobus privati.

### 9.1 Modello Ibrido Pubblico / Privato
* **Rubrica Ditte Pullman (Pubblica & Condivisa)**: L'anagrafica dei vettori (ragione sociale, recapito telefonico, email, capienza massima mezzi, comune e regione della sede/deposito) è visibile a tutti i gruppi scout, creando una rete collaborativa territoriale.
* **Preventivi di Spostamento (Privati & Riservati)**: I preventivi salvati per le specifiche tratte di campo sono accessibili esclusivamente ai capi del gruppo proprietario.

### 9.2 Calcolo Matematico Automatico Quota a Persona
All'inserimento del preventivo:
$$\text{Quota Individuale} = \frac{\text{Prezzo Totale Preventivato (€)}}{\text{Numero Partecipanti}}$$
* L'utente inserisce il costo totale, i km stimati e il numero di ragazzi previsti; il sistema mostra immediatamente la quota stimata a carico di ciascun ragazzo.
* Ricerca e filtro intelligente per **budget massimo pro-capite** (es. *mostra vettori sotto i 18 € a ragazzo*).

---

## 10. Modulo 8: Gamification, Punti & Leaderboard Attiva

Motore meritocratico per trasformare la manutenzione della banca dati in un'esperienza collaborativa stimolante.

### 10.1 Punteggi di Contribuzione
* Inserimento nuovo luogo: **+10 Punti**
* Aggiunta sito web o social: **+2 Punti**
* Aggiunta coordinate GPS precise: **+3 Punti**
* Inserimento tariffe e condizioni economiche: **+5 Punti**
* Aggiunta evento a calendario: **+3 Punti**
* Ricerca attiva nei luoghi (1 volta al giorno): **+1 Punto**
* Lettura di un verbale di CoCa (una tantum): **+5 Punti**
* Recensione o memoria storica di un luogo: **+10 Punti**
* Aggiornamento articolo in inventario: **+2 Punti**
* Audit / Censimento completo di magazzino: **+15 Punti**

### 10.2 Livelli Scout e Distintivi (Badge)
* **Livelli**: Da *Piede Tenero* (Livello 1) a *Esploratore*, *Pioniere*, *Trappeur*, fino a *Guida delle Orme* (Livello Massimo).
* **Badge Speciali**: Assegnati per traguardi significativi (es. *Geografo Esperto*, *Mastro di Cambusa*, *Custode della Memoria*, *Guardiano del Magazzino*).
* **Leaderboard Attiva**: Visualizza unicamente i capi attualmente in servizio nella CoCa.

---

## 11. Modulo 9: Assistente Metodologico Intelligente Akela AI

Assistente virtuale integrato direttamente nella schermata dell'app per supportare i capi nelle sfide educative e logistiche quotidiane.

### 11.1 Ambiti di Conoscenza Specializzata
* **Metodologia Scout**: Normative e progressione personale per Lupetti, Coccinelle, Esploratori, Guide, Rover e Scolte (Agesci, Fse, Cngei).
* **Pronto Soccorso di Campo**: Protocolli di primo intervento per punture di zecche, vipere, colpi di calore, distorsioni e ipotermia.
* **Pionieristica & Nodi**: Istruzioni passo-passo per nodi di ancoraggio, legature a croce/quadrata e calcolo della resistenza dei pali.
* **Cerimoniale & Canzoniere**: Testi e accordi dei canti scout, formule di promessa e cerimonie tradizionali di branca.
* **Input Vocale con Trascrizione**: Utilizzabile a mani libere durante le attività sul campo o attorno al fuoco.

---

## 12. Modulo 10: Esperienza Smartwatch Dedicata (Orme Watch)

Interfaccia ultraleggera ottimizzata per smartwatch circolari e quadrati (Samsung Galaxy Watch con Wear OS, Apple Watch).

### 12.1 Specifiche d'Uso Sul Campo
* **Safe-Area Circolare Dinamica**: I contenuti rimangono perfettamente leggibili senza tagli sui bordi rotondi.
* **Accesso Immediato d'Emergenza**: Consultazione istantanea del numero del custode del campo e dei numeri di soccorso senza estrarre lo smartphone con le mani sporche di fango o bagnate.
* **Consultazione Rapida Presenze & Task**: Verifica degli incarichi della giornata assegnati nell'ultimo verbale di CoCa.
* **Zero Overhead**: Akela AI ed editor pesanti vengono disattivati sulla vista orologio per garantire massima durata della batteria.

---

## 13. Modulo 11: Centro Notifiche Ibrido & Impostazioni di Sistema

Pannello unificato di controllo e personalizzazione utente.

### 13.1 Redesign Ergonomico (Windows 11 Desktop / iOS Mobile)
* **Desktop**: Layout a due colonne in stile *Impostazioni Windows 11*, con sidebar di navigazione fluida e breadcrumb.
* **Smartphone**: Layout a card raggruppate con chevron in stile *Impostazioni Apple iOS*.
* **Motore di Ricerca Integrato**: Ricerca immediata sia su desktop che su smartphone per raggiungere qualsiasi sottomenu in frazioni di secondo.

### 13.2 Matrice Granulare di Preferenza Canali Notifiche
L'utente può configurare indipendentemente il canale per ciascun evento:
| Evento | Opzioni Selezionabili | Default di Sistema |
| :--- | :--- | :--- |
| **Nuovo Verbale di Co.Ca.** | `entrambe`, `in_app`, `email`, `disattivo` | `entrambe` |
| **Richiesta Accesso in Co.Ca.** | `entrambe`, `in_app`, `email`, `disattivo` | `entrambe` |
| **Nuovo Iscritto in Lista d'Attesa** | `entrambe`, `in_app`, `email`, `disattivo` | `disattivo` |
| **Aggiornamento Scheda Luogo** | `entrambe`, `in_app`, `email`, `disattivo` | `disattivo` |

* **Feedback Sonoro**: Scelta del tono acustico di notifica all'arrivo di aggiornamenti in-app.
* **Canale Segnalazione Problemi**: Form integrato per l'invio istantaneo di bug report e log di sistema a `appormescout@gmail.com`.

---

## 14. Modulo 12: Architettura Offline-First Reale (PWA)

Garantisce la continuità operativa in assenza totale di segnale telefonico.

### 14.1 Meccanismo Operativo
1. **Cache di Lettura**: All'avvio dell'app online, tutti i dati di consultazione (luoghi, inventario, calendario, verbali, contatti) vengono memorizzati in locale.
2. **Coda Scritture Differite (`offline_write_queue`)**: Qualsiasi operazione di scrittura effettuata senza rete viene accodata localmente e applicata in tempo reale alla vista dell'utente (Optimistic UI).
3. **Risincronizzazione Automatica in Background**: Al riaggancio della connessione internet, il modulo esegue le transazioni in ordine cronologico FIFO verso Supabase.
4. **Indicatore di Stato & Ripristino Manuale**: Un badge nell'header informa l'utente sullo stato della connessione (Online, Offline, Sincronizzazione in corso), con pulsante di forzatura manuale in caso di timeout.
