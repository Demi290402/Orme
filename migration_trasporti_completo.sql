-- ==========================================================
-- SCRIPT COMPLETO MIGRAZIONE TRASPORTI (ORME)
-- Copia e incolla questo script nell'editor SQL di Supabase
-- ==========================================================

-- 1. Allineamento Tabella ditte (servizi_trasporto)
CREATE TABLE IF NOT EXISTS servizi_trasporto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id TEXT NOT NULL,
    company_name TEXT NOT NULL,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    departure_region TEXT NOT NULL DEFAULT 'Puglia',
    departure_province TEXT,
    departure_commune TEXT NOT NULL,
    departure_address TEXT,
    capacity INTEGER NOT NULL DEFAULT 50,
    price_per_person NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Rilascio colonne obsolete per modello ibrido
ALTER TABLE servizi_trasporto DROP COLUMN IF EXISTS base_price;
ALTER TABLE servizi_trasporto DROP COLUMN IF EXISTS km;
ALTER TABLE servizi_trasporto DROP COLUMN IF EXISTS numero_persone;

-- 2. Creazione della tabella privata per i preventivi di viaggio
CREATE TABLE IF NOT EXISTS preventivi_trasporto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES servizi_trasporto(id) ON DELETE CASCADE,
    group_id TEXT NOT NULL, -- Ciascun gruppo gestisce i propri preventivi privatamente
    departure_region TEXT NOT NULL DEFAULT 'Puglia',
    departure_commune TEXT NOT NULL,
    departure_address TEXT,
    base_price NUMERIC NOT NULL, -- Prezzo totale preventivato
    km NUMERIC NOT NULL, -- Lunghezza in chilometri
    numero_persone INTEGER NOT NULL, -- Numero di partecipanti
    notes TEXT, -- Note specifiche del preventivo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Tabella pubblica per lo storico dei prezzi a persona per le stime
CREATE TABLE IF NOT EXISTS storico_prezzi_trasporto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES servizi_trasporto(id) ON DELETE CASCADE,
    price_per_person NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Abilitazione Row Level Security (RLS) sulle tabelle
ALTER TABLE servizi_trasporto ENABLE ROW LEVEL SECURITY;
ALTER TABLE preventivi_trasporto ENABLE ROW LEVEL SECURITY;
ALTER TABLE storico_prezzi_trasporto ENABLE ROW LEVEL SECURITY;

-- 5. RLS per servizi_trasporto (Ditte)
DROP POLICY IF EXISTS "Group isolation on servizi_trasporto" ON servizi_trasporto;
DROP POLICY IF EXISTS "Public select on servizi_trasporto" ON servizi_trasporto;
CREATE POLICY "Public select on servizi_trasporto" ON servizi_trasporto
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated manage servizi_trasporto" ON servizi_trasporto;
CREATE POLICY "Authenticated manage servizi_trasporto" ON servizi_trasporto
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. RLS per preventivi_trasporto (Preventivi privati)
DROP POLICY IF EXISTS "Group isolation on preventivi_trasporto" ON preventivi_trasporto;
CREATE POLICY "Group isolation on preventivi_trasporto" ON preventivi_trasporto
    FOR ALL USING (group_id = (SELECT group_id FROM users WHERE id = auth.uid()));

-- 7. RLS per storico_prezzi_trasporto (Storico prezzi condiviso)
DROP POLICY IF EXISTS "Public select on storico_prezzi_trasporto" ON storico_prezzi_trasporto;
CREATE POLICY "Public select on storico_prezzi_trasporto" ON storico_prezzi_trasporto
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated insert on storico_prezzi_trasporto" ON storico_prezzi_trasporto;
CREATE POLICY "Authenticated insert on storico_prezzi_trasporto" ON storico_prezzi_trasporto
    FOR INSERT TO authenticated WITH CHECK (true);
