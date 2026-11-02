# 🏕️ Orme — La Piattaforma Gestionale & Metodologica per i Gruppi Scout

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.x-61dafb.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38bdf8.svg)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e.svg)](https://supabase.com/)
[![PWA](https://img.shields.io/badge/PWA-Offline_First-orange.svg)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-Proprietary-scout_green.svg)](#licenza)

> **Orme** è un ecosistema software completo, collaborativo e *offline-first*, progettato su misura per rispondere a tutte le esigenze organizzative, logistiche, educative e amministrative dei **Gruppi Scout** e delle loro **Comunità Capi (Co.Ca.)**.

---

## 🌟 Visione & Valore di Prodotto

Nei gruppi scout la gestione delle attività risente storicamente di tre criticità ricorrenti:
1. **Dispersione della memoria storica**: Il turn-over naturale dei capi porta alla perdita di contatti di custodi, recensioni di case vacanze, terreni di campeggio e registri delle presenze.
2. **Frammentazione & Rischi Privacy (GDPR)**: Tabelle Excel personali, file Word disconnessi, chat WhatsApp e fogli volanti aumentano i rischi di violazione dei dati personali di ragazzi e famiglie.
3. **Mancanza di connettività sul campo**: Durante uscite, cacce, San Giorgio o campi estivi in zone boschive o montane isolate, gli strumenti cloud tradizionali diventano inutilizzabili.

**Orme** risolve queste problematiche centralizzando ogni flusso in una Progressive Web App sicura, multi-tenant per Comunità Capi, dotata di **funzionamento offline reale al 100%**, sincronizzazione automatica in background, intelligenza artificiale metodologica (**Akela AI**) e supporto dedicato per **Smartwatch**.

---

## 🚀 Panoramica dei Moduli & Funzionalità

| Modulo | Descrizione Funzionale |
| :--- | :--- |
| 📍 **Mappatura Luoghi** | Catalogo interattivo di terreni di campeggio, basi scout, case vacanze e bivacchi con 7 macro-sezioni, coordinate GPS, contatti d'emergenza, matrice servizi/logistica, pill e card per siti web e canali social ufficiali (Facebook, Instagram), rating multidimensionale *Orme* (1-5 stelle su Ombra, Acqua, Legna, Fuochi, Suolo, Servizi, Isolamento), cronologia modifiche con audit trail e badge novità non lette. |
| 📜 **Verbali di Co.Ca.** | Gestione completa delle assemblee di Comunità Capi: calcolo anno associativo scout, registro presenze/assenze/ritardi/uscite anticipate con snapshot immutabile dei nomi, editor rich-text con tabelle Word avanzate, OdG, posti d'azione con scadenze, delibere, movimenti di cassa, generazione instantanea di **PDF A4** formale e **DOCX Word**, e statistiche annuali di partecipazione. |
| 📋 **Lista d'Attesa & Iscrizioni** | Form Builder in stile Google Forms (`PersonalizzaFormIscrizione`) per creare moduli pubblici personalizzati con banner compresso client-side e disclaimer GDPR. Raccolta richieste via link o QR Code, algoritmo di deduplicazione intelligente anti-spam, calcolo automatico di età e branca (L/C, E/G, R/S) e import/export massivo Excel. |
| 📦 **Magazzino & Inventario** | Tracciamento di tende di squadriglia, cambusa, attrezzi pionieristica e materiali tecnici. Gestione collocazioni, stato di conservazione (Ottimo, Buono, Da riparare, Inutilizzabile), registro prestiti alle branche con scadenzario rientri e funzione "Audit / Censimento Rapido". |
| 📅 **Calendario & Attività** | Pianificazione integrata per tutte le branche (L/C, E/G, R/S, CoCa, Gruppo). Supporto allo standard universale **RFC 5545 (.ics)** con esportazione e importazione diretta per Google Calendar, Apple Calendar e Outlook. |
| 💰 **Bilancio & Multi-Cassa** | Gestione multi-cassa indipendente (Cassa di Gruppo, CoCa, Branco/Cerchio, Reparto, Noviziato/Clan). Registrazione entrate/uscite categorizzate, calcolo saldi in tempo reale ed esportazione dei rendiconti in Excel. |
| 🚌 **Rubrica Trasporti Privati** | Modello ibrido: elenco pubblico delle ditte di pullman condiviso tra gruppi della regione/zona per favorire la cooperazione territoriale; preventivi di viaggio e calcolo automatico della quota a persona (€/persona in base a km e passeggeri) strettamente privati per gruppo. |
| 🏆 **Gamification & Leaderboard** | Meccanismo incentivante di punti meritocratici per mantenere vivi i dati di luoghi, inventario e verbali. Classifica filtrata sui soli capi attivi, storico punti archiviato per gruppo in caso di cambio CoCa, livelli (da *Piede Tenero* a *Guida delle Orme*) e badge virtuali. |
| 🐺 **Akela AI Assistant** | Assistente virtuale conversazionale basato su intelligenza artificiale e specializzato in Metodo Scout, normativa associativa (Agesci, Fse, Cngei), primo soccorso, pionieristica, cerimoniale e canzoniere, con supporto vocale per l'uso sul campo. |
| ⌚ **Orme Watch (Smartwatch)** | Interfaccia dedicata e ultraleggera ottimizzata per display circolari e quadrati (Samsung Galaxy Watch, Apple Watch, Wear OS): consultazione rapida di contatti custode, emergenze e presenze senza estrarre il telefono. |
| 🔔 **Centro Notifiche Granulare** | Notifiche in-app ed email con preferenze dettagliate canale-per-canale (`entrambe`, `in_app`, `email`, `disattivo`) su 4 categorie (Verbali, Nuovi iscritti in Lista d'Attesa, Richieste accesso CoCa, Aggiornamenti Luoghi). |
| ⚙️ **Impostazioni Redesigned** | Nuova interfaccia ispirata a **Windows 11** su desktop e ad **Apple iOS** su smartphone, dotata di barra di ricerca reattiva universale, toni audio personalizzabili e form di segnalazione problemi collegato a `appormescout@gmail.com`. |
| 📶 **Offline-First Reale (PWA)** | Caching locale intelligente, coda scritture asincrone (`offline_write_queue`), aggiornamenti ottimistici della UI e risincronizzazione atomica bidirezionale al ripristino della connettività. |

---

## 🏗️ Architettura & Stack Tecnologico

Orme è sviluppata secondo i principi di una **Progressive Web Application (PWA) Serverless**, resiliente, scalabile e progettata per operare in ambienti a connettività intermittente.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Orme Client Application                         │
│   React 19 • TypeScript • Vite • Tailwind CSS v4 • Lucide Icons        │
└──────────────┬──────────────────────────┬──────────────────────────────┘
               │                          │
      (Online Sync / REST)       (Offline Storage)
               ▼                          ▼
┌──────────────────────────────┐ ┌───────────────────────────────────────┐
│     Supabase Cloud BaaS      │ │   Local Client Engine (IndexedDB/LS)  │
│  PostgreSQL 15+ (Multi-Tenant)│ │  • Service Worker & Workbox Caching   │
│  Row Level Security (RLS)    │ │  • offline_write_queue (FIFO Sync)    │
│  Supabase Auth & Storage     │ │  • Optimistic UI Updates              │
│  Transactional Triggers      │ │  • Client-side Image Compression      │
└──────────────────────────────┘ └───────────────────────────────────────┘
```

### Componenti Tecnologici Principali
- **Frontend Core**: [React 19](https://react.dev/), [TypeScript 5](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **UI & Styling**: [Tailwind CSS v4](https://tailwindcss.com/) con token grafici *Human-Crafted Scout Design* (colori forest green `#1B4931`, scout blue `#1877F2`, accenti cuoio e legno, piena conformità dark/light mode e accessibilità WCAG 2.2 AA).
- **Mappe & Geolocalizzazione**: [Leaflet](https://leafletjs.com/), [React Leaflet](https://react-leaflet.js.org/), OpenStreetMap Nominatim Geocoding, Leaflet MarkerCluster.
- **Editor Verbali & Documenti**: [TipTap Rich Text Editor](https://tiptap.dev/) con estensione tabelle stile Word, `jspdf`, `html2canvas`, `docx` (OpenXML standard) e `xlsx` (SheetJS).
- **Integrazioni Calendario**: Implementazione nativa RFC 5545 iCalendar (`ical.ts`).
- **Database & Backend**: [Supabase](https://supabase.com/) (PostgreSQL 15+) con politiche rigorose di isolamento multi-tenant basate su **Row Level Security (RLS)**.
- **PWA & Offline**: Plugin Vite PWA e Google Workbox per gestione del Service Worker e runtime caching.

---

## 📁 Struttura della Repository

```text
orme/
├── docs/                           # Documentazione ufficiale del software
│   ├── documentazione_funzionalita.md  # Specifiche Funzionali & Requisiti (FSD)
│   ├── documentazione_tecnica.md       # Specifiche Tecniche & Architettura (TDD)
│   ├── manuale_utente.md               # Manuale Utente Ufficiale
│   └── presentazione_slide.md          # Pitch & Presentazione per Comunità Capi
├── src/
│   ├── components/                 # Componenti UI modulari e riutilizzabili
│   │   ├── AkelaAssistant.tsx      # Assistente IA per capi scout
│   │   ├── InteractiveMap.tsx      # Mappa interattiva con Leaflet e filtri
│   │   ├── Layout.tsx              # Shell dell'app, navbar responsive e notifiche
│   │   ├── LocationCard.tsx        # Card luogo con badge novità e anteprima
│   │   ├── ReportProblemModal.tsx  # Segnalazione bug e feedback in-app
│   │   └── RichTextEditor.tsx      # Editor WYSIWYG avanzato con tabelle
│   ├── lib/                        # Moduli logici, servizi e integrazioni
│   │   ├── ai.ts & scoutKnowledge.ts  # Motore e base di conoscenza Akela AI
│   │   ├── autoExport.ts           # Esportazioni automatiche documentali
│   │   ├── data.ts                 # Servizi CRUD Luoghi, Recensioni e Storico
│   │   ├── duplicateDetection.ts   # Algoritmo deduplicazione lista d'attesa
│   │   ├── emailNotification.ts    # Template e dispatch email transazionali
│   │   ├── gamification.ts         # Logica livelli, punti e badge
│   │   ├── ical.ts                 # Parser e generatore RFC 5545 .ics
│   │   ├── listaAttesa.ts          # Servizio anagrafica iscrizioni
│   │   ├── notifications.ts        # Gestione notifiche in-app e dispatcher
│   │   ├── offline.ts              # Engine offline-first e coda di sincronizzazione
│   │   ├── supabase.ts             # Inizializzazione client Supabase
│   │   ├── trasporti.ts            # Servizio ditte e preventivi pullman
│   │   └── verbali.ts              # Servizio gestione verbali Co.Ca.
│   ├── pages/                      # Pagine e viste dell'applicazione
│   │   ├── AddLocation.tsx         # Wizard censimento e modifica luoghi
│   │   ├── Bilancio.tsx            # Gestione finanziaria multi-cassa
│   │   ├── Calendario.tsx          # Calendario multi-branca e sincronizzazione
│   │   ├── Home.tsx                # Dashboard principale e catalogo luoghi
│   │   ├── Inventario.tsx          # Gestione magazzino e registro prestiti
│   │   ├── Leaderboard.tsx         # Classifica meritocratica capi attivi
│   │   ├── LocationDetail.tsx      # Scheda informativa completa del luogo
│   │   ├── Profile.tsx             # Profilo capo e storico campi di formazione
│   │   ├── Settings.tsx            # Impostazioni stile Windows 11 / iOS
│   │   ├── ListaAttesa/            # Modulo lista d'attesa e form builder
│   │   ├── Verbali/                # Editor verbali, archivio e statistiche
│   │   └── Watch/                  # Vista ottimizzata per smartwatch
│   └── types/                      # Definizioni TypeScript e contratti dati
└── public/                         # Asset statici, icone PWA, audio feedback
```

---

## 🛠️ Guida all'Installazione & Sviluppo Locale

### Prerequisiti
- **Node.js**: versione `>= 18.0.0` (raccomandata v20 LTS o superiore)
- **npm**: versione `>= 9.0.0`
- Un'istanza o progetto attivo su [Supabase](https://supabase.com) con PostgreSQL

### 1. Clonazione del Progetto
```bash
git clone https://github.com/Demi290402/Orme.git
cd orme
```

### 2. Installazione delle Dipendenze
```bash
npm install
```

### 3. Configurazione delle Variabili d'Ambiente
Crea un file `.env` nella cartella radice del progetto:
```env
VITE_SUPABASE_URL=https://tuo-progetto.supabase.co
VITE_SUPABASE_ANON_KEY=tuo-anon-key-pubblico
```

### 4. Avvio del Server di Sviluppo
```bash
npm run dev
```
L'applicazione sarà accessibile localmente su `http://localhost:5173`.

### 5. Verifica della Tipizzazione e Build di Produzione
```bash
npm run build
```
Il comando esegue la validazione completa dei tipi TypeScript (`tsc -b`) e compila l'applicazione per la produzione tramite Vite PWA (`dist/`).

---

## 📱 Installazione come Progressive Web App (PWA)

### Su Smartphone Android (Chrome / Brave / Edge)
1. Apri il link dell'applicazione nel browser.
2. Tocca il banner **"Aggiungi ad Home"** che compare a fondo schermo, oppure tocca i tre puntini in alto a destra e seleziona **"Installa app"**.
3. L'icona di Orme apparirà tra le app del telefono, funzionando come un'app nativa anche senza connessione internet.

### Su Smartphone Apple iOS (Safari)
1. Apri il link dell'applicazione in **Safari** (non in Chrome o browser in-app).
2. Tocca il pulsante **Condividi** (quadrato con freccia verso l'alto).
3. Scorri verso il basso e tocca **"Aggiungi alla schermata Home"**.
4. Tocca **"Aggiungi"** in alto a destra.

### Su Smartwatch (Wear OS / Galaxy Watch / Apple Watch)
1. Apri il browser dello smartwatch o sincronizza il collegamento rapido alla vista `#/watch`.
2. L'interfaccia adatterà automaticamente il layout con safe-area circolare per consentire la lettura rapida di contatti custode, numeri di soccorso e presenze.

---

## 🔒 Sicurezza, RLS & Conformità GDPR

Orme adotta una rigorosa architettura **Privacy by Design**:
- **Multi-Tenancy Isolato**: Nessun dato riservato di un gruppo scout (bilanci, lista d'attesa, verbali, preventivi privati) è visibile a membri di altri gruppi grazie alle politiche di **Row Level Security (RLS)** su PostgreSQL.
- **Accesso alla Co.Ca. Controllato**: L'ingresso di un nuovo capo richiede o la conoscenza del **PIN di Gruppo** riservato, oppure l'approvazione esplicita a **doppia firma** da parte di due capi attivi già censiti.
- **Protezione Dati Minori**: I form di iscrizione pubblica raccolgono unicamente i dati necessari alla gestione dell'accoglienza scout e richiedono l'accettazione esplicita dell'informativa privacy GDPR.
- **Deduplicazione Automatica**: Protegge il database dal sovraccarico e da inserimenti doppi accidentali da parte dei genitori.

---

## 📚 Documentazione Dettagliata

Per approfondire ogni singolo aspetto del sistema, consulta i documenti dedicati nella cartella `docs/`:
- 📄 [**Specifiche Funzionali di Prodotto**](docs/documentazione_funzionalita.md) — Dettaglio esaustivo di tutti i flussi operativi, requisiti utente e logica metodologica.
- 📐 [**Specifiche Tecniche & Architettura**](docs/documentazione_tecnica.md) — Schema relazionale database Supabase, politiche RLS, architettura offline e motori di esportazione.
- 📖 [**Manuale Utente Ufficiale**](docs/manuale_utente.md) — Guida passo-passo illustrata per Capi Gruppo, Capi Unità, Segretari e famiglie.
- 📊 [**Presentazione Pitch per Comunità Capi**](docs/presentazione_slide.md) — Struttura slide pronta per presentare Orme alla tua assemblea di gruppo.

---

## 🤝 Supporto & Contatti

Per segnalazioni di bug, richieste di nuove funzionalità o supporto per il setup iniziale del tuo gruppo:
- 📧 **Email Ufficiale**: [appormescout@gmail.com](mailto:appormescout@gmail.com)
- 🐛 **Segnalazioni in-app**: Utilizza la voce *"Segnala un problema"* disponibile direttamente nel menu Impostazioni dell'applicazione.

---

## ⚖️ Licenza

Progetto proprietario sviluppato ad uso dei Gruppi Scout. Tutti i diritti riservati. Realizzato con passione e spirito di servizio per supportare il cammino educativo dei ragazzi e il servizio dei capi.
