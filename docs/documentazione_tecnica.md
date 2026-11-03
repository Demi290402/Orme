# 🛠️ Documentazione Tecnica & Architettura di Sistema (TDD) — Orme

**Prodotto**: Orme (Ecosistema Gestionale & Metodologico Scout)  
**Versione Tecnica**: 2.5.0  
**Data**: Novembre 2026  
**Autore**: Team Tecnico & Architettura Software Orme  
**Target**: Sviluppatori Senior, DevOps, Database Administrator, Security & Compliance Officer  

---

## 📑 Indice dei Contenuti
1. [Paradigma Architetturale & Blueprint di Sistema](#1-paradigma-architetturale--blueprint-di-sistema)
2. [Frontend Architecture & Component Design](#2-frontend-architecture--component-design)
3. [Backend Serverless & Database Schema DDL (Supabase / PostgreSQL)](#3-backend-serverless--database-schema-ddl-supabase--postgresql)
4. [Politiche di Sicurezza & Row Level Security (RLS)](#4-politiche-di-sicurezza--row-level-security-rls)
5. [Motore Notifiche Ibrido (In-App & Email Dispatcher)](#5-motore-notifiche-ibrido-in-app--email-dispatcher)
6. [Architettura Offline-First & Service Worker (PWA)](#6-architettura-offline-first--service-worker-pwa)
7. [Motori di Esportazione Client-Side (PDF, DOCX, iCal, XLSX)](#7-motori-di-esportazione-client-side-pdf-docx-ical-xlsx)
8. [Ottimizzazioni Prestazionali, Controllo Egress & Smartwatch Runtime](#8-ottimizzazioni-prestazionali-controllo-egress--smartwatch-runtime)
9. [Linee Guida di Build, CI/CD & Testing](#9-linee-guida-di-build-cicd--testing)

---

## 1. Paradigma Architetturale & Blueprint di Sistema

Orme adotta un'architettura **Serverless Single Page Application (SPA)** con modello **Offline-First Progressive Web App**.  
Il backend è decentralizzato su **Supabase BaaS (PostgreSQL 15+ Managed)**, con autenticazione JWT, storage ad oggetti per immagini e politiche di controllo degli accessi a livello di singola tupla (**Row Level Security - RLS**).

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                             CLIENT TIER                                │
 │  ┌─────────────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
 │  │      Desktop App        │  │   Mobile PWA    │  │  Orme Watch    │  │
 │  │  (Windows 11 Redesign)  │  │  (iOS Redesign) │  │  (Wear OS / WA)│  │
 │  └────────────┬────────────┘  └────────┬────────┘  └───────┬────────┘  │
 │               │                        │                   │           │
 │               ▼                        ▼                   ▼           │
 │  ┌──────────────────────────────────────────────────────────────────┐  │
 │  │                  React 19 / TypeScript / Vite Core               │  │
 │  │  • Context API (Auth, GroupGate, Theme, Notifications)           │  │
 │  │  • UI Design Tokens (Tailwind CSS v4 Human-Crafted)              │  │
 │  │  • Client Engines (TipTap, Leaflet, iCal, XLSX, jsPDF, DOCX)     │  │
 │  └──────────────────────────────┬───────────────────────────────────┘  │
 └─────────────────────────────────┼──────────────────────────────────────┘
                                   │
               ┌───────────────────┴───────────────────┐
               │                                       │
     (Online HTTPS / WSS)                  (Offline Interceptor)
               ▼                                       ▼
 ┌──────────────────────────────┐     ┌───────────────────────────────────┐
 │       CLOUD SERVICE TIER     │     │       OFFLINE RUNTIME TIER        │
 │  ┌────────────────────────┐  │     │  ┌─────────────────────────────┐  │
 │  │ Supabase Auth (JWT)    │  │     │  │ Service Worker (Workbox)    │  │
 │  ├────────────────────────┤  │     │  │ Precaching Asset Statici    │  │
 │  │ PostgreSQL 15 Database │  │     │  ├─────────────────────────────┤  │
 │  │ - Multi-Tenant RLS     │  │     │  │ Local Storage Caching       │  │
 │  │ - Relational Triggers  │  │     │  │ (Read-Mirroring)            │  │
 │  ├────────────────────────┤  │     │  ├─────────────────────────────┤  │
 │  │ Supabase Storage       │  │     │  │ offline_write_queue         │  │
 │  │ (Compressed Buckets)   │  │     │  │ (FIFO Sync Engine)          │  │
 │  ├────────────────────────┤  │     │  ├─────────────────────────────┤  │
 │  │ Transactional Email    │  │     │  │ Optimistic UI Layer         │  │
 │  └────────────────────────┘  │     │  └─────────────────────────────┘  │
 └──────────────────────────────┘     └───────────────────────────────────┘
```

---

## 2. Frontend Architecture & Component Design

### 2.1 Stack & Dipendenze Core
* **Libreria Core**: `React 19.x` con `TypeScript 5.x` in Strict Mode.
* **Build Tooling**: `Vite 7.x` configurato con manual chunks e code-splitting dinamico.
* **Styling & Design System**: `Tailwind CSS v4.0` con design tokens personalizzati:
  - `--color-scout-green`: `#1B4931` (foresta metodologica)
  - `--color-scout-blue`: `#1877F2` (cielo e avventura)
  - Supporto Dark/Light nativo con classi `dark:` e contrasto WCAG 2.2 AA su ogni elemento testuale.
* **Iconografia**: `lucide-react` ad albero scuotibile (tree-shakeable).
* **Mappe Geografiche**: `leaflet` con `react-leaflet` e plugin `leaflet.markercluster` per clustering efficiente di centinaia di punti GPS.

### 2.2 Albero Modulare dei Componenti
```text
src/
├── components/
│   ├── AkelaAssistant.tsx        # Chatbot metodologico IA con speech recognition
│   ├── ErrorBoundary.tsx         # Cattura e isolamento crash dei singoli componenti
│   ├── GroupAccessGate.tsx       # Blocco ammissione CoCa con verifica PIN o doppia firma
│   ├── InteractiveMap.tsx        # Mappa Leaflet full-screen con marker raggruppati
│   ├── Layout.tsx                # Guscio applicativo responsive, drawer e navbar
│   ├── LocationCard.tsx          # Card luogo con badge freschezza e pill novità
│   ├── NotificationBell.tsx      # Dropdown interattivo notifiche in-app con contatore
│   ├── ProtectedRoute.tsx        # Guard per rotte autenticate
│   ├── ReportProblemModal.tsx    # Dialog integrato di bug reporting verso email supporto
│   └── RichTextEditor.tsx        # Editor TipTap WYSIWYG con estensione tabelle Word
```

---

## 3. Backend Serverless & Database Schema DDL (Supabase / PostgreSQL)

Tutti i dati risiedono su PostgreSQL. Di seguito si riporta il DDL completo delle entità di produzione.

### 3.1 Tabella `users` (Profili Capi & Governance)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    nickname TEXT,
    profile_picture TEXT,
    cover_image TEXT,
    scout_code TEXT,
    region TEXT,
    scout_zone TEXT,
    group_name TEXT,
    group_id TEXT NOT NULL,
    points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    badges TEXT[] DEFAULT '{}',
    locations_added INTEGER DEFAULT 0,
    contributions_approved INTEGER DEFAULT 0,
    validations_given INTEGER DEFAULT 0,
    rs_locations_added INTEGER DEFAULT 0,
    pricing_info_added INTEGER DEFAULT 0,
    coordinate_info_added INTEGER DEFAULT 0,
    website_info_added INTEGER DEFAULT 0,
    verbali_read INTEGER DEFAULT 0,
    locations_searched INTEGER DEFAULT 0,
    eventi_aggiunti INTEGER DEFAULT 0,
    searches_lc INTEGER DEFAULT 0,
    searches_eg INTEGER DEFAULT 0,
    searches_rs INTEGER DEFAULT 0,
    searches_coca INTEGER DEFAULT 0,
    searches_gruppo INTEGER DEFAULT 0,
    verbali_read_ids TEXT[] DEFAULT '{}',
    storico_items_added INTEGER DEFAULT 0,
    reviews_added INTEGER DEFAULT 0,
    inventory_updates INTEGER DEFAULT 0,
    inventory_audits INTEGER DEFAULT 0,
    formazione JSONB DEFAULT '[]', -- [{ corso: 'CFM LC', anno: 2024, mese: 5 }]
    has_nomina_capo BOOLEAN DEFAULT FALSE,
    membership_status TEXT DEFAULT 'attivo' CHECK (membership_status IN ('attivo', 'in_attesa', 'uscito')),
    group_role TEXT DEFAULT 'capo' CHECK (group_role IN ('capo_gruppo', 'capo')),
    coca_approvals TEXT[] DEFAULT '{}',
    group_points JSONB DEFAULT '{}', -- { "Gruppo_A": 120, "Gruppo_B": 45 }
    notification_preferences JSONB DEFAULT '{"verbali": "entrambe", "richiesta_accesso": "entrambe", "lista_attesa": "disattivo", "aggiornamento_luoghi": "disattivo"}'::jsonb,
    notification_tone TEXT DEFAULT 'default',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

### 3.2 Tabella `locations` (Catalogo Luoghi Scout)
```sql
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    region TEXT NOT NULL,
    province TEXT NOT NULL,
    commune TEXT NOT NULL,
    address TEXT,
    google_maps_link TEXT,
    contacts JSONB DEFAULT '{}'::jsonb,
    activities TEXT[] DEFAULT '{}',
    quick_note TEXT,
    coordinates JSONB, -- { lat: 40.85, lng: 17.02 }
    beds INTEGER DEFAULT 0,
    accantonamento_capacity INTEGER DEFAULT 0,
    bathrooms INTEGER DEFAULT 0,
    has_tents BOOLEAN DEFAULT FALSE,
    has_refectory BOOLEAN DEFAULT FALSE,
    has_rover_service BOOLEAN DEFAULT FALSE,
    has_church BOOLEAN DEFAULT FALSE,
    has_green_space BOOLEAN DEFAULT FALSE,
    has_equipped_kitchen BOOLEAN DEFAULT FALSE,
    has_poles BOOLEAN DEFAULT FALSE,
    has_disabled_access BOOLEAN DEFAULT FALSE,
    has_heating BOOLEAN DEFAULT FALSE,
    has_water_points BOOLEAN DEFAULT FALSE,
    truck_distance TEXT,
    has_pastures BOOLEAN DEFAULT FALSE,
    has_insects BOOLEAN DEFAULT FALSE,
    has_diseases BOOLEAN DEFAULT FALSE,
    has_little_shade BOOLEAN DEFAULT FALSE,
    has_very_busy_area BOOLEAN DEFAULT FALSE,
    other_attention TEXT,
    other_logistics TEXT,
    rover_service_description TEXT,
    restrictions TEXT,
    other_restrictions TEXT,
    website TEXT,
    facebook TEXT,
    instagram TEXT,
    email TEXT,
    emails TEXT[] DEFAULT '{}',
    pricing JSONB DEFAULT '{}'::jsonb,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    last_updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    group_id TEXT,
    availability_status TEXT DEFAULT 'available',
    avg_rating NUMERIC DEFAULT 0,
    reviews_count INTEGER DEFAULT 0,
    price_category INTEGER DEFAULT 0
);
```

### 3.3 Tabella `location_history` & `user_location_views` (Audit Trail)
```sql
CREATE TABLE location_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_nickname TEXT,
    action_description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE user_location_views (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    last_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, location_id)
);
```

### 3.4 Tabella `reviews` (Rating Multidimensionale Orme)
```sql
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_nickname TEXT,
    text TEXT NOT NULL,
    rating_shade INTEGER CHECK (rating_shade BETWEEN 1 AND 5),
    rating_water INTEGER CHECK (rating_water BETWEEN 1 AND 5),
    rating_wood INTEGER CHECK (rating_wood BETWEEN 1 AND 5),
    rating_fire INTEGER CHECK (rating_fire BETWEEN 1 AND 5),
    rating_ground INTEGER CHECK (rating_ground BETWEEN 1 AND 5),
    rating_services INTEGER CHECK (rating_services BETWEEN 1 AND 5),
    rating_isolation INTEGER CHECK (rating_isolation BETWEEN 1 AND 5),
    photos TEXT[] DEFAULT '{}',
    verified_caretaker_contact JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

### 3.5 Tabella `verbali`, `membri_coca` & `impostazioni_verbali`
```sql
CREATE TABLE membri_coca (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id TEXT NOT NULL,
    nome TEXT NOT NULL,
    branca TEXT NOT NULL,
    branche_secondarie TEXT[] DEFAULT '{}',
    ruoli TEXT[] DEFAULT '{}',
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    attivo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE verbali (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id TEXT NOT NULL,
    numero INTEGER NOT NULL,
    anno_scout INTEGER NOT NULL,
    titolo TEXT NOT NULL,
    data DATE NOT NULL,
    luogo TEXT NOT NULL,
    ora_inizio TIME NOT NULL,
    ora_fine TIME NOT NULL,
    presenti TEXT[] DEFAULT '{}',
    assenti TEXT[] DEFAULT '{}',
    ritardi TEXT[] DEFAULT '{}',
    presenti_nomi JSONB DEFAULT '{}'::jsonb, -- Snapshot immutabile { "uuid": "Nome Cognome" }
    uscite_anticipate JSONB DEFAULT '[]'::jsonb,
    ospiti JSONB DEFAULT '[]'::jsonb,
    odg JSONB DEFAULT '[]'::jsonb,
    deliberazioni TEXT,
    posti_azione JSONB DEFAULT '[]'::jsonb,
    cassa_movimenti JSONB DEFAULT '[]'::jsonb,
    ritorni_coca JSONB DEFAULT '[]'::jsonb,
    date_importanti JSONB DEFAULT '[]'::jsonb,
    firme JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE impostazioni_verbali (
    group_id TEXT PRIMARY KEY,
    header_title TEXT,
    subheader TEXT,
    logo_url TEXT,
    footer_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

### 3.6 Tabella `lista_attesa` & `impostazioni_iscrizione`
```sql
CREATE TABLE lista_attesa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id TEXT NOT NULL,
    nome_genitore TEXT NOT NULL,
    telefono_genitore TEXT NOT NULL,
    nome_ragazzo TEXT NOT NULL,
    cognome_ragazzo TEXT NOT NULL,
    data_nascita DATE NOT NULL,
    classe TEXT NOT NULL,
    data_iscrizione DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE impostazioni_iscrizione (
    group_id TEXT PRIMARY KEY,
    form_title TEXT NOT NULL,
    welcome_title TEXT NOT NULL,
    description_text TEXT NOT NULL,
    footer_text TEXT NOT NULL,
    banner_url TEXT NOT NULL,
    success_title TEXT NOT NULL,
    success_message TEXT NOT NULL,
    disclaimer_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

### 3.7 Tabella `inventario`, `calendario`, `bilancio` e `trasporti`
```sql
CREATE TABLE inventario (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    condition TEXT DEFAULT 'Buono',
    location TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE eventi_calendario (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id TEXT NOT NULL,
    title TEXT NOT NULL,
    branca TEXT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    location TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE bilancio_movimenti (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id TEXT NOT NULL,
    cassa TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('Entrata', 'Uscita')),
    importo NUMERIC NOT NULL,
    categoria TEXT NOT NULL,
    causale TEXT NOT NULL,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE servizi_trasporto (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id TEXT NOT NULL,
    company_name TEXT NOT NULL,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    departure_region TEXT NOT NULL,
    departure_commune TEXT NOT NULL,
    departure_address TEXT,
    capacity INTEGER NOT NULL DEFAULT 50,
    price_per_person NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE preventivi_trasporto (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES servizi_trasporto(id) ON DELETE CASCADE,
    group_id TEXT NOT NULL,
    departure_region TEXT NOT NULL DEFAULT 'Puglia',
    departure_commune TEXT NOT NULL,
    departure_address TEXT,
    base_price NUMERIC NOT NULL,
    km NUMERIC NOT NULL,
    numero_persone INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE notifiche (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    link TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

---

## 4. Politiche di Sicurezza & Row Level Security (RLS)

Tutte le tabelle hanno RLS attivo (`ENABLE ROW LEVEL SECURITY`). L'isolamento previene accessi non autorizzati tra differenti gruppi scout.

### 4.1 Principio di Non-Ricorsione su `users`
Per evitare rallentamenti dovuti a sub-select ricorsive su `users`, l'estrazione del `group_id` dell'utente autenticato viene ottimizzata senza `auth.uid()` incrociato:

```sql
-- Isolamento verbali di gruppo
ALTER TABLE verbali ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Group isolation on verbali" ON verbali
    FOR ALL TO authenticated
    USING (group_id = (SELECT group_id FROM users WHERE id = auth.uid()));

-- Tabella lista_attesa: Lettura riservata al gruppo, inserimento aperto al pubblico
ALTER TABLE lista_attesa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public insert on lista_attesa" ON lista_attesa
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Group read and manage on lista_attesa" ON lista_attesa
    FOR ALL TO authenticated
    USING (group_id = (SELECT group_id FROM users WHERE id = auth.uid()));

-- Tabella impostazioni_iscrizione: Lettura pubblica, gestione riservata ai soli capi del gruppo
ALTER TABLE impostazioni_iscrizione ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public select on impostazioni_iscrizione" ON impostazioni_iscrizione
    FOR SELECT USING (true);
CREATE POLICY "Group manage on impostazioni_iscrizione" ON impostazioni_iscrizione
    FOR ALL TO authenticated
    USING (group_id = (SELECT group_id FROM users WHERE id = auth.uid()))
    WITH CHECK (group_id = (SELECT group_id FROM users WHERE id = auth.uid()));
```

---

## 5. Motore Notifiche Ibrido (In-App & Email Dispatcher)

Il routing delle notifiche è implementato nei moduli `src/lib/notifications.ts` ed `src/lib/emailNotification.ts`.

### 5.1 Matrice Canali & Risoluzione Utente
Quando un evento di sistema viene generato (es. `triggerNotification('verbali', ...)`) il dispatcher:
1. Recupera la lista dei capi appartenenti allo stesso `group_id`.
2. Legge per ciascun destinatario il campo `notification_preferences` dal database. Se nullo o incompleto, applica il fallback `DEFAULT_NOTIFICATION_PREFERENCES`:
   - `verbali`: `'entrambe'`
   - `richiesta_accesso`: `'entrambe'`
   - `lista_attesa`: `'disattivo'`
   - `aggiornamento_luoghi`: `'disattivo'`
3. In base alla scelta (`'entrambe'`, `'in_app'`, `'email'`, `'disattivo'`), instrada la notifica verso la tabella `notifiche` di Supabase e/o genera la chiamata transazionale email verso il servizio di posta con template HTML responsive e link sicuro.
4. **Self-Confirmation**: L'autore stesso dell'azione riceve la notifica come conferma visiva dell'avvenuta pubblicazione.

---

## 6. Architettura Offline-First & Service Worker (PWA)

Gestita congiuntamente da `vite-plugin-pwa`, `Workbox` e dal layer runtime in `src/lib/offline.ts`.

### 6.1 Strategie di Caching
* **Precache degli Asset Statici**: JS, CSS, icone SVG, audio di notifica precached al momento dell'installazione del Service Worker.
* **Cache-First per le Mappe**: I tile di OpenStreetMap vengono memorizzati nella cache IndexedDB per consentire la visualizzazione dei sentieri anche senza rete.
* **Stale-While-Revalidate per i Dati di Lettura**: `getLocations()`, `getVerbali()`, `getInventario()` salvano uno snapshot in `localStorage`. Se l'app rileva `navigator.onLine === false`, fornisce immediatamente i dati memorizzati senza visualizzare schermate di errore.

### 6.2 Coda di Scrittura `offline_write_queue`
* Ogni operazione CUD (Create, Update, Delete) tentata offline viene intercettata, codificata in un payload JSON e aggiunta in fondo a `offline_write_queue`.
* Un listener sull'evento `window.addEventListener('online', ...)` intercetta il ritorno della connettività e invoca `flushOfflineQueue()`, elaborando le transazioni sequenzialmente in modalità FIFO.

---

## 7. Motori di Esportazione Client-Side (PDF, DOCX, iCal, XLSX)

Orme non sovraccarica il server per la generazione dei documenti: tutti i motori operano sul browser del client.

1. **Esportazione PDF A4**: Sviluppata con `jspdf` e rendering vettoriale. Rimuove automaticamente caratteri non renderizzabili o emoji incompatibili con i font standard PDF, garantendo impaginazione con interlinea bilanciata e margini di stampa a norma.
2. **Esportazione Word DOCX (OpenXML)**: La libreria `docx` costruisce il pacchetto ZIP compresso conforme allo standard ISO/IEC 29500, inserendo tabelle con bordi normalizzati e margini conformi ad A4.
3. **Motore Calendario iCal (`src/lib/ical.ts`)**: Genera stringhe nel formato standard **RFC 5545**:
   ```text
   BEGIN:VCALENDAR
   VERSION:2.0
   PRODID:-//Orme//Scout Management//IT
   CALSCALE:GREGORIAN
   BEGIN:VEVENT
   UID:uuid-evento@orme.scout
   DTSTART:20261115T080000Z
   DTEND:20261115T180000Z
   SUMMARY:Uscita dei Passaggi Reparto
   DESCRIPTION:Ritrovo in sede con zaino pronto e uniforme.
   LOCATION:Bivacco Monte Cervati
   END:VEVENT
   END:VCALENDAR
   ```
4. **Esportazione Excel XLSX (`xlsx` / SheetJS)**: Costruzione di cartelle di lavoro con fogli multipli e formattazione numerica valuta (`€ #,##0.00`) per la cassa.

---

## 8. Ottimizzazioni Prestazionali, Controllo Egress & Smartwatch Runtime

1. **Compressione Immagini Client-Side (`src/lib/imageCompression.ts`)**:  
   I banner caricati per il form iscrizione o le foto dei luoghi vengono ridimensionati via HTML5 Canvas (max 1600px) e convertiti in WebP o JPEG con qualità 0.82 prima dell'invio a Supabase Storage, riducendo l'egress di rete di oltre l'85%.
2. **Watch Runtime View (`src/pages/Watch/WatchView.tsx`)**:  
   La vista smartwatch disattiva listener pesanti, WebSocket e TipTap editor, limitandosi a renderizzare dati statici in memoria con selettori DOM mirati a bassissimo consumo energetico.

---

## 9. Linee Guida di Build, CI/CD & Testing

### 9.1 Script di Compilazione
* `npm run dev`: Avvia il server locale con Hot Module Replacement (HMR).
* `npm run build`: Esegue in sequenza `tsc -b` (verifica tipizzazione completa) e `vite build` (bundle di produzione e generazione Service Worker).
* `npm run preview`: Avvia il server statico di anteprima del bundle compilato.

Tutti i commit diretti sul branch `main` devono superare con esito 0 il comando `npm run build` prima del push a GitHub.
