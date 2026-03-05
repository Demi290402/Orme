-- ==========================================================
-- AGGIORNAMENTO DATABASE ORME: MULTI-TENANCY E VERBALI
-- Copia e incolla questo script nell'editor SQL di Supabase
-- ==========================================================

-- 1. Aggiornamento Tabella Users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS scout_zone TEXT,
ADD COLUMN IF NOT EXISTS group_name TEXT,
ADD COLUMN IF NOT EXISTS group_id TEXT;

-- 2. Aggiornamento Tabella Locations
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS group_id TEXT;

-- 3. Creazione Tabella Membri (CoCa)
CREATE TABLE IF NOT EXISTS membri (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id TEXT NOT NULL,
    nome TEXT NOT NULL,
    branca TEXT NOT NULL,
    ruoli TEXT[] DEFAULT '{}',
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Creazione Tabella Verbali
CREATE TABLE IF NOT EXISTS verbali (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id TEXT NOT NULL,
    numero INTEGER NOT NULL,
    titolo TEXT NOT NULL,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    luogo TEXT,
    ora_inizio TIME,
    ora_fine TIME,
    presenti UUID[] DEFAULT '{}', -- Array di ID membri
    assenti UUID[] DEFAULT '{}',
    ritardi UUID[] DEFAULT '{}',
    ospiti JSONB DEFAULT '[]',
    odg JSONB DEFAULT '[]',
    cassa JSONB DEFAULT '[]',
    ritorni JSONB DEFAULT '[]',
    date_importanti JSONB DEFAULT '[]',
    posti_azione JSONB DEFAULT '[]',
    prossimi_impegni JSONB DEFAULT '[]',
    varie TEXT,
    sezioni_attive TEXT[] DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Abilitazione RLS e Policy (Esempio Multi-tenancy)
-- Nota: Assicurati che RLS sia abilitato per tutte le tabelle nel dashboard

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE membri ENABLE ROW LEVEL SECURITY;
ALTER TABLE verbali ENABLE ROW LEVEL SECURITY;

-- Esempio di policy per isolamento (da adattare se necessario)
-- DROP POLICY IF EXISTS "Group isolation" ON locations;
-- CREATE POLICY "Group isolation" ON locations
--     FOR ALL USING (group_id = (SELECT group_id FROM users WHERE id = auth.uid()));

-- DROP POLICY IF EXISTS "Group isolation" ON verbali;
-- CREATE POLICY "Group isolation" ON verbali
--     FOR ALL USING (group_id = (SELECT group_id FROM users WHERE id = auth.uid()));
