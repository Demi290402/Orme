# Documentazione Tecnica - Architettura di Orme

Questa documentazione descrive le scelte tecnologiche, la struttura del database, le politiche di sicurezza (RLS) e l'organizzazione del codice sorgente dell'applicazione **Orme**.

---

## Stack Tecnologico

L'applicazione è sviluppata con un'architettura moderna di tipo **Serverless Single Page Application (SPA)**:

* **Frontend**:
  * **React 19**: Libreria di base per l'interfaccia utente.
  * **TypeScript**: Tipizzazione forte per garantire la manutenibilità e ridurre i bug di runtime.
  * **Vite**: Build tool veloce per lo sviluppo e l'impacchettamento dell'applicazione.
  * **Tailwind CSS v4.0**: Framework CSS utility-first per lo styling responsive e per la gestione nativa delle modalità chiara/scura (Dark Mode).
  * **Lucide React**: Set di icone vettoriali coerenti e leggere.
  * **XLSX (SheetJS)**: Libreria client per la lettura e l'esportazione di file Excel/CSV.
  * **jspdf / html2pdf.js / pdfmake**: Librerie utilizzate per la generazione dinamica dei PDF dei verbali direttamente sul client.

* **Backend / Database**:
  * **Supabase (PostgreSQL)**: Database relazionale, gestione dell'autenticazione degli utenti e storage dei file.
  * **Supabase Client SDK**: Utilizzato nel frontend per eseguire query in tempo reale e operazioni di autenticazione.

---

## Architettura del Database (Schema Supabase)

I dati sono strutturati su tabelle PostgreSQL ospitate su Supabase. Di seguito si descrivono le principali entità dello schema.

### 1. Tabella `users`
Contiene i profili utente dei capi scout. È collegata alla tabella di autenticazione nativa di Supabase (`auth.users`).

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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

### 2. Tabella `locations`
Registra le case e i terreni mappati.

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

### 3. Tabella `location_reviews`
Conserva le recensioni dei capi sui singoli luoghi.

```sql
CREATE TABLE location_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ombra INTEGER CHECK (ombra BETWEEN 1 AND 5),
    acqua_potabile INTEGER CHECK (acqua_potabile BETWEEN 1 AND 5),
    legna INTEGER CHECK (legna BETWEEN 1 AND 5),
    fuochi INTEGER CHECK (fuochi BETWEEN 1 AND 5),
    suolo INTEGER CHECK (suolo BETWEEN 1 AND 5),
    servizi INTEGER CHECK (servizi BETWEEN 1 AND 5),
    prezzo INTEGER CHECK (prezzo BETWEEN 1 AND 5),
    sicurezza INTEGER CHECK (sicurezza BETWEEN 1 AND 5),
    isolamento INTEGER CHECK (isolamento BETWEEN 1 AND 5),
    commento TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(location_id, user_id)
);
```

### 4. Tabella `lista_attesa`
Gestisce l'anagrafica dei bambini iscritti in lista d'attesa.

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
    stato TEXT NOT NULL DEFAULT 'In attesa', -- 'In attesa', 'Accettato', 'Rifiutato'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

### 5. Tabella `impostazioni_iscrizione`
Salva i testi di personalizzazione e la stringa in Base64 dell'immagine di copertina del form pubblico.

```sql
CREATE TABLE impostazioni_iscrizione (
    group_id TEXT PRIMARY KEY,
    form_title TEXT NOT NULL,
    welcome_title TEXT NOT NULL,
    description_text TEXT NOT NULL,
    footer_text TEXT NOT NULL,
    banner_url TEXT NOT NULL, -- Immagine del banner codificata in Base64
    success_title TEXT NOT NULL,
    success_message TEXT NOT NULL,
    disclaimer_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

---

## Sicurezza e RLS (Row Level Security)

Per garantire che i dati sensibili di un gruppo scout (es. contatti dei genitori, verbali interni, bilanci) non siano accessibili o modificabili da capi di altri gruppi, Supabase applica le politiche **RLS** basate sulla colonna `group_id`.

### Esempio 1: Isolamento del gruppo sulla lista d'attesa
```sql
ALTER TABLE lista_attesa ENABLE ROW LEVEL SECURITY;

-- Consente lettura, modifica ed eliminazione solo se l'utente appartiene allo stesso gruppo scout
CREATE POLICY "Group isolation on lista_attesa" ON lista_attesa
    FOR ALL USING (group_id = (SELECT group_id FROM users WHERE id = auth.uid()));

-- Consente l'inserimento pubblico a chiunque (necessario per consentire ai genitori non registrati di compilare il form d'iscrizione)
CREATE POLICY "Public insert on lista_attesa" ON lista_attesa
    FOR INSERT WITH CHECK (true);
```

### Esempio 2: Isolamento del gruppo per l'inventario e il bilancio
Tutte le query di inserimento e selezione per materiali e transazioni filtrano implicitamente su `group_id = currentUser.groupId`. In questo modo si realizza una logica di multi-tenancy robusta direttamente a livello database.

---

## Struttura del Codice Frontend

I file sorgente del frontend sono organizzati all'interno della cartella `src/`:

```
src/
├── components/          # Componenti condivisibili (Layout, Barra di Navigazione, ProtectedRoute)
├── context/             # React Context (Gestione del tema Dark Mode)
├── lib/                 # Logica di comunicazione con Supabase (API client)
│   ├── data.ts          # Gestione utenti e luoghi
│   ├── listaAttesa.ts   # Gestione liste d'attesa e impostazioni form
│   ├── supabase.ts      # Inizializzazione client Supabase
│   └── verbali.ts       # Gestione verbali e membri
├── pages/               # Pagine dell'applicazione
│   ├── ListaAttesa/     # Interfaccia capi per la lista d'attesa
│   ├── Public/          # Form di iscrizione pubblico per i genitori
│   ├── Verbali/         # Creazione, modifica, visualizzazione e statistiche dei verbali
│   ├── Bilancio.tsx     # Gestione entrate/uscite e cassa
│   ├── Inventario.tsx   # Gestione attrezzature e prestiti
│   ├── Calendario.tsx   # Gestione eventi
│   ├── Home.tsx         # Dashboard e ricerca luoghi
│   └── Profile.tsx      # Visualizzazione profilo e gamification
├── types/               # Interfacce di definizione TypeScript (index.ts)
├── App.tsx              # Router dell'applicazione e rotte
├── index.css            # Stili globali e configurazione Tailwind CSS v4.0
└── main.tsx             # Entry point di React
```

---

## Gestione dell'Importazione Excel (Deduplicazione in Batch)

Durante l'importazione di file `.xlsx` o `.csv` contenenti iscritti in lista d'attesa, l'applicazione attua una procedura di bonifica e caricamento in singola transazione (batch):

1. **Lettura file**: La libreria `XLSX` converte il foglio di calcolo in formato JSON.
2. **Mappatura**: L'utente associa le colonne del foglio di calcolo ai campi database.
3. **Normalizzazione e Validazione**:
   * Si normalizzano i dati testuali eliminando gli spazi bianchi iniziali e finali.
   * Le date di nascita e iscrizione vengono ripulite (anche se espresse in numeri seriali di Excel).
   * Vengono scartate le righe interamente vuote.
4. **Deduplicazione Client-Side**:
   * **Rimozione doppioni nel file**: Viene fatto un confronto incrociato campo per campo su tutte le righe del file.
   * **Rimozione rispetto al DB**: Si effettua una comparazione case-insensitive tra le righe del file e l'elenco `lista` già presente in memoria.
5. **Caricamento Batch**: I record unici rimanenti vengono passati ad `addIscrittiBatch(iscritti)`, che esegue un **singolo inserimento batch PostgreSQL** anziché eseguire chiamate asincrone singole ripetute. Questo previene rate-limiting e cadute di connessione.
