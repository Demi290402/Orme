# Documentazione Tecnica - Architettura di Orme

Questa documentazione descrive le scelte tecnologiche, la struttura del database, le politiche di sicurezza (RLS) e l'organizzazione del codice sorgente dell'applicazione **Orme**.

---

## Stack Tecnologico

L'applicazione è sviluppata con un'architettura moderna di tipo **Serverless Single Page Application (SPA)** con supporto PWA (Progressive Web App) per l'installazione e il funzionamento offline reale:

* **Frontend**:
  * **React 19**: Libreria di base per l'interfaccia utente.
  * **TypeScript**: Tipizzazione forte per garantire la manutenibilità e ridurre i bug di runtime.
  * **Vite**: Build tool veloce per lo sviluppo e l'impacchettamento dell'applicazione.
  * **Tailwind CSS v4.0**: Framework CSS utility-first per lo styling responsive e per la gestione nativa delle modalità chiara/scura (Dark Mode).
  * **Lucide React**: Set di icone vettoriali coerenti e leggere.
  * **XLSX (SheetJS)**: Libreria client per la lettura e l'esportazione di file Excel/CSV.
  * **jspdf / html2pdf.js / pdfmake**: Librerie utilizzate per la generazione dinamica dei PDF dei verbali direttamente sul client.
  * **Workbox & Vite PWA Plugin**: Generazione del Service Worker per il caching degli asset statici in locale.

* **Backend / Database**:
  * **Supabase (PostgreSQL)**: Database relazionale, gestione dell'autenticazione degli utenti e storage dei file.
  * **Supabase Client SDK**: Utilizzato nel frontend per eseguire query in tempo reale e operazioni di autenticazione.

---

## Architettura del Database (Schema Supabase)

I dati sono strutturati su tabelle PostgreSQL ospitate su Supabase. Di seguito si descrivono le entità dello schema aggiornate.

### 1. Tabella `users`
Contiene i profili utente dei capi scout. È collegata alla tabella di autenticazione nativa di Supabase (`auth.users`). In fase di registrazione/modifica del profilo è possibile tracciare lo storico dei corsi di formazione scout.

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
    group_id TEXT NOT NULL, -- Identificativo numerico del gruppo scout
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
    formazione JSONB DEFAULT '[]', -- Contiene array di oggetti: { corso, anno, mese }
    has_nomina_capo BOOLEAN DEFAULT FALSE, -- Flag per la nomina formale a Capo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

### 2. Tabella `locations`
Registra i terreni e gli accantonamenti mappati. Le modifiche sono istantanee e salvate direttamente qui.

```sql
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    region TEXT NOT NULL,
    province TEXT NOT NULL,
    commune TEXT NOT NULL,
    address TEXT,
    google_maps_link TEXT,
    contacts JSONB, -- Mappa di contatti (telefono, email, referente)
    activities TEXT[], -- Attività possibili (bivacco, campo estivo, ecc.)
    quick_note TEXT,
    coordinates JSONB, -- Contiene lat e lng
    beds INTEGER DEFAULT 0,
    bathrooms INTEGER DEFAULT 0,
    has_tents BOOLEAN DEFAULT FALSE,
    has_refectory BOOLEAN DEFAULT FALSE,
    has_rover_service BOOLEAN DEFAULT FALSE,
    has_church BOOLEAN DEFAULT FALSE,
    has_green_space BOOLEAN DEFAULT FALSE,
    has_equipped_kitchen BOOLEAN DEFAULT FALSE,
    has_poles BOOLEAN DEFAULT FALSE,
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
    email TEXT,
    description TEXT,
    pricing JSONB, -- Contiene basePrice e note aggiuntive
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    last_updated_by UUID REFERENCES users(id),
    group_id TEXT,
    availability_status TEXT DEFAULT 'available',
    avg_rating NUMERIC DEFAULT 0,
    reviews_count INTEGER DEFAULT 0,
    price_category INTEGER DEFAULT 0
);
```

### 3. Tabella `location_history`
Traccia la cronologia storica delle modifiche apportate alle schede dei luoghi per la massima trasparenza e auditing.

```sql
CREATE TABLE location_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_nickname TEXT, -- Copia del nickname al momento della modifica
    action_description TEXT NOT NULL, -- Riassunto testuale delle variazioni apportate
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

### 4. Tabella `user_location_views`
Memorizza l'orario in cui ciascun utente visualizza per l'ultima volta una scheda. Utilizzata per calcolare la presenza di aggiornamenti non ancora letti.

```sql
CREATE TABLE user_location_views (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    last_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, location_id)
);
```

### 5. Tabella `lista_attesa`
Gestisce l'anagrafica centralizzata dei bambini in lista d'attesa. Rimosso ogni riferimento a stati di workflow.

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
```

### 6. Tabella `impostazioni_iscrizione`
Salva i testi di personalizzazione e l'immagine di copertina del form pubblico.

```sql
CREATE TABLE impostazioni_iscrizione (
    group_id TEXT PRIMARY KEY,
    form_title TEXT NOT NULL,
    welcome_title TEXT NOT NULL,
    description_text TEXT NOT NULL,
    footer_text TEXT NOT NULL,
    banner_url TEXT NOT NULL, -- Immagine del banner codificata in Base64 o URL
    success_title TEXT NOT NULL,
    success_message TEXT NOT NULL,
    disclaimer_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

### 7. Tabella `servizi_trasporto`
Contiene l'anagrafica delle ditte di pullman e bus privati (visibile a tutti i gruppi per collaborazione).

```sql
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
```

### 8. Tabella `preventivi_trasporto`
Contiene i preventivi di viaggio specifici salvati privatamente da ciascun gruppo scout.

```sql
CREATE TABLE preventivi_trasporto (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES servizi_trasporto(id) ON DELETE CASCADE,
    group_id TEXT NOT NULL,
    departure_region TEXT NOT NULL DEFAULT 'Puglia',
    departure_commune TEXT NOT NULL,
    departure_address TEXT,
    base_price NUMERIC NOT NULL, -- Preventivo totale
    km NUMERIC NOT NULL, -- Lunghezza corsa
    numero_persone INTEGER NOT NULL, -- Numero passeggeri
    notes TEXT, -- Note private del preventivo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

---

## Sicurezza e RLS (Row Level Security)

Per garantire che i dati sensibili di un gruppo scout non siano accessibili o modificabili da membri estranei, Supabase applica le politiche **RLS** basate sulla colonna `group_id`.

### 1. Tabella `lista_attesa`
```sql
ALTER TABLE lista_attesa ENABLE ROW LEVEL SECURITY;

-- Consente lettura, modifica ed eliminazione solo se l'utente appartiene allo stesso gruppo
CREATE POLICY "Group isolation on lista_attesa" ON lista_attesa
    FOR ALL USING (group_id = (SELECT group_id FROM users WHERE id = auth.uid()));

-- Consente l'inserimento pubblico (necessario per consentire ai genitori non autenticati di iscrivere i figli)
CREATE POLICY "Public insert on lista_attesa" ON lista_attesa
    FOR INSERT WITH CHECK (true);
```

### 2. Gestione Robusta delle Impostazioni Iscrizione (Risoluzione conflitti Upsert)
Nelle operazioni di salvataggio via client, l'utilizzo di `upsert` in Supabase è soggetto a fallimenti a causa del comportamento delle policy `FOR ALL` combinate. Per risolvere questo problema, le politiche sono separate in base all'operazione:
```sql
ALTER TABLE impostazioni_iscrizione ENABLE ROW LEVEL SECURITY;

-- Chiunque (anche non loggato) deve poter leggere il form
CREATE POLICY "Anyone can read impostazioni_iscrizione" ON impostazioni_iscrizione
    FOR SELECT USING (true);

-- Solo i capi loggati appartenenti al rispettivo gruppo possono inserire, modificare o eliminare
CREATE POLICY "Capi insert impostazioni_iscrizione" ON impostazioni_iscrizione
    FOR INSERT TO authenticated WITH CHECK (group_id = (SELECT group_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Capi update impostazioni_iscrizione" ON impostazioni_iscrizione
    FOR UPDATE TO authenticated USING (group_id = (SELECT group_id FROM users WHERE id = auth.uid())) WITH CHECK (group_id = (SELECT group_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Capi delete impostazioni_iscrizione" ON impostazioni_iscrizione
    FOR DELETE TO authenticated USING (group_id = (SELECT group_id FROM users WHERE id = auth.uid()));
```

### 3. Nuove tabelle di supporto
Per `location_history` e `user_location_views` si applica la medesima logica di isolamento del gruppo.
Le ditte bus in `servizi_trasporto` sono invece pubbliche per la lettura ed editabili da tutti i capi autenticati per favorire la collaborazione, mentre i relativi preventivi in `preventivi_trasporto` sono isolati per gruppo:

```sql
-- Ditte Trasporti Pubbliche (tutti le vedono e possono gestirle)
ALTER TABLE servizi_trasporto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public select on servizi_trasporto" ON servizi_trasporto
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated manage servizi_trasporto" ON servizi_trasporto
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Preventivi Privati (isolamento per gruppo scout)
ALTER TABLE preventivi_trasporto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Group isolation on preventivi_trasporto" ON preventivi_trasporto
    FOR ALL USING (group_id = (SELECT group_id FROM users WHERE id = auth.uid()));
```

---

## Architettura del Funzionamento Offline

Il modulo di funzionamento offline è governato da `src/lib/offline.ts` ed è integrato trasversalmente a tutti i servizi dati dell'applicazione:

1. **Rilevamento della connessione**:
   * Utilizza `navigator.onLine` accoppiato a listener per gli eventi `'online'` e `'offline'` su `window`.
2. **Caching Locale**:
   * Qualsiasi chiamata in SELECT (es. recupero luoghi o inventario) salva i dati scaricati da Supabase in `localStorage` sotto chiavi specifiche (es. `impostazioni_iscrizione_${groupId}`).
   * In assenza di connessione, le funzioni di recupero intercettano lo stato offline e caricano i dati direttamente dalla cache locale senza generare errori o crash.
3. **Gestione Scritture Offline (`offline_write_queue`)**:
   * Le scritture (insert, update, delete) effettuate offline non vengono perse, ma memorizzate in una coda locale (`offline_write_queue` in `localStorage`).
   * Tali modifiche vengono applicate temporaneamente alla cache di lettura locale per garantire che l'interfaccia utente rifletta immediatamente le variazioni effettuate dal capo (es. una spesa inserita in cambusa).
4. **Sincronizzazione Automatica**:
   * Al ripristino della rete (evento `'online'`), l'applicazione scorre la coda locale, esegue le query su Supabase in ordine cronologico e svuota la coda.
   * Se una transazione fallisce a causa di un errore persistente, lo stato viene evidenziato nell'header e l'utente può forzare manualmente la risincronizzazione tramite click sul pulsante "Riprova".
