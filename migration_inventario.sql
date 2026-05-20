-- ==========================================================
-- MIGRATION: Inventario Attrezzi e Gestione Luoghi per Orme
-- Copia e incolla questo script nell'editor SQL di Supabase
-- ==========================================================

-- 1. Creazione tabella luoghi dell'inventario (es: Sede, Magazzino)
CREATE TABLE IF NOT EXISTS inventario_luoghi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id TEXT NOT NULL,                          -- numeric group id as string (e.g. "1")
    name TEXT NOT NULL,                              -- nome del luogo (es: "Sede", "Magazzino 1")
    description TEXT,                                -- descrizione opzionale del luogo
    color TEXT NOT NULL DEFAULT '#4CAF50',           -- codice colore hex per styling personalizzato
    icon TEXT NOT NULL DEFAULT 'MapPin',             -- nome dell'icona Lucide (es: 'MapPin', 'Home', 'Warehouse')
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Creazione tabella attrezzi dell'inventario
CREATE TABLE IF NOT EXISTS inventario_attrezzi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id TEXT NOT NULL,                          -- multi-tenancy: a quale gruppo appartiene
    name TEXT NOT NULL,                              -- nome dell'attrezzo/elemento
    category TEXT NOT NULL DEFAULT 'Generico',       -- Categoria (es: Pioneering, Campeggio, Cucina, Sicurezza, Cancelleria)
    description TEXT,                                -- descrizione o note dell'elemento
    tags TEXT[] DEFAULT '{}',                        -- tags di ricerca (es: ['tenda', 'ferrino', 'reparto'])
    status TEXT NOT NULL DEFAULT 'disponibile',      -- disponibile, danneggiato, in_manutenzione, perso
    luogo_id UUID REFERENCES inventario_luoghi(id) ON DELETE SET NULL, -- localizzazione attuale
    image_url TEXT,                                  -- percorso/link dell'immagine salvata nello storage
    quantity INTEGER NOT NULL DEFAULT 1,             -- quantità posseduta
    is_dangerous BOOLEAN NOT NULL DEFAULT false,     -- indica se è un attrezzo pericoloso (es: sega, piccone)
    is_consumable BOOLEAN NOT NULL DEFAULT false,    -- indica se è cancelleria/materiale di consumo
    last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()), -- data ultimo censimento
    last_checked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,             -- chi ha fatto l'ultimo controllo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Abilitazione RLS per le tabelle
ALTER TABLE inventario_luoghi ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_attrezzi ENABLE ROW LEVEL SECURITY;

-- 4. Creazione Policy di Sicurezza RLS (Isolamento Gruppo / Comunità Capi)
-- Assicura che ciascun utente veda solo i dati associati al proprio group_id.

DROP POLICY IF EXISTS "Group isolation on inventario_luoghi" ON inventario_luoghi;
CREATE POLICY "Group isolation on inventario_luoghi" ON inventario_luoghi
    FOR ALL USING (
        group_id = (SELECT group_id FROM users WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Group isolation on inventario_attrezzi" ON inventario_attrezzi;
CREATE POLICY "Group isolation on inventario_attrezzi" ON inventario_attrezzi
    FOR ALL USING (
        group_id = (SELECT group_id FROM users WHERE id = auth.uid())
    );

-- 5. Creazione Storage Bucket per le immagini dell'inventario
-- Nota: Istruzioni per attivare il bucket tramite SQL (richiede estensioni attive)
-- In alternativa, il bucket 'inventario_immagini' può essere creato manualmente dal pannello Supabase.

INSERT INTO storage.buckets (id, name, public) 
VALUES ('inventario_immagini', 'inventario_immagini', true)
ON CONFLICT (id) DO NOTHING;

-- Policy di storage per isolamento gruppo
-- Consenti l'accesso in lettura a tutti gli utenti autenticati (oppure isola per gruppo se inserito nel path)
DROP POLICY IF EXISTS "Allow authenticated read images" ON storage.objects;
CREATE POLICY "Allow authenticated read images" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'inventario_immagini');

DROP POLICY IF EXISTS "Allow authenticated upload images" ON storage.objects;
CREATE POLICY "Allow authenticated upload images" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'inventario_immagini'
    );

DROP POLICY IF EXISTS "Allow authenticated delete images" ON storage.objects;
CREATE POLICY "Allow authenticated delete images" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'inventario_immagini');

-- 6. Aggiunta campi per Gamification correlata all'inventario nella tabella users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS inventory_updates INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS inventory_audits INTEGER DEFAULT 0;

-- 7. Creazione tabella di associazione Evento-Attrezzi (Prelevamento per attività)
CREATE TABLE IF NOT EXISTS inventario_evento_attrezzi (
    evento_id UUID NOT NULL REFERENCES eventi_calendario(id) ON DELETE CASCADE,
    attrezzo_id UUID NOT NULL REFERENCES inventario_attrezzi(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    checked_out BOOLEAN NOT NULL DEFAULT false,          -- se prelevato per l'attività
    checked_in BOOLEAN NOT NULL DEFAULT false,           -- se riconsegnato al rientro
    PRIMARY KEY (evento_id, attrezzo_id)
);

ALTER TABLE inventario_evento_attrezzi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Group isolation on inventario_evento_attrezzi" ON inventario_evento_attrezzi;
CREATE POLICY "Group isolation on inventario_evento_attrezzi" ON inventario_evento_attrezzi
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM eventi_calendario e
            WHERE e.id = evento_id
            AND e.group_id = (SELECT group_id FROM users WHERE id = auth.uid())
        )
    );

