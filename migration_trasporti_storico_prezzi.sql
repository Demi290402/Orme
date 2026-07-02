-- ==========================================================
-- AGGIORNAMENTO DATABASE ORME: STORICO PREZZI TRASPORTI
-- Copia e incolla questo script nell'editor SQL di Supabase
-- ==========================================================

-- 1. Creazione della tabella per lo storico prezzi condiviso
CREATE TABLE IF NOT EXISTS storico_prezzi_trasporto (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES servizi_trasporto(id) ON DELETE CASCADE,
    price_per_person NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Migrazione iniziale di prezzi esistenti da servizi_trasporto e preventivi_trasporto
-- Aggiungiamo i prezzi storici basati sui prezzi a persona standard già presenti
INSERT INTO storico_prezzi_trasporto (company_id, price_per_person, created_at)
SELECT id, price_per_person, created_at
FROM servizi_trasporto
WHERE price_per_person IS NOT NULL;

-- Aggiungiamo i prezzi storici basati sui preventivi passati (prezzo / passeggeri)
INSERT INTO storico_prezzi_trasporto (company_id, price_per_person, created_at)
SELECT company_id, (base_price / numero_persone), created_at
FROM preventivi_trasporto
WHERE base_price IS NOT NULL AND numero_persone IS NOT NULL AND numero_persone > 0;

-- 3. Abilitazione Row Level Security (RLS)
ALTER TABLE storico_prezzi_trasporto ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies per storico_prezzi_trasporto
DROP POLICY IF EXISTS "Public select on storico_prezzi_trasporto" ON storico_prezzi_trasporto;
CREATE POLICY "Public select on storico_prezzi_trasporto" ON storico_prezzi_trasporto
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated insert on storico_prezzi_trasporto" ON storico_prezzi_trasporto;
CREATE POLICY "Authenticated insert on storico_prezzi_trasporto" ON storico_prezzi_trasporto
    FOR INSERT TO authenticated WITH CHECK (true);
