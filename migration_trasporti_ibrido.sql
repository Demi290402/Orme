-- ==========================================================
-- AGGIORNAMENTO DATABASE ORME: MODELLO IBRIDO TRASPORTI
-- Copia e incolla questo script nell'editor SQL di Supabase
-- ==========================================================

-- 1. Creazione della tabella privata per i preventivi di viaggio
CREATE TABLE IF NOT EXISTS preventivi_trasporto (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 2. Migrazione dei dati di preventivi esistenti dalla tabella servizi_trasporto
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='servizi_trasporto' AND column_name='base_price'
    ) THEN
        INSERT INTO preventivi_trasporto (company_id, group_id, departure_region, departure_commune, departure_address, base_price, km, numero_persone, notes, created_at)
        SELECT id, group_id, departure_region, departure_commune, departure_address, base_price, km, numero_persone, notes, created_at
        FROM servizi_trasporto
        WHERE base_price IS NOT NULL;
    END IF;
END $$;

-- 3. Rimuoviamo le colonne dei preventivi da servizi_trasporto per ripulire lo schema
-- (manteniamo le colonne di indirizzo/sede che rappresentano il deposito/sede della ditta)
ALTER TABLE servizi_trasporto DROP COLUMN IF EXISTS base_price;
ALTER TABLE servizi_trasporto DROP COLUMN IF EXISTS km;
ALTER TABLE servizi_trasporto DROP COLUMN IF EXISTS numero_persone;

-- 4. Abilitazione Row Level Security (RLS) sulle tabelle
ALTER TABLE servizi_trasporto ENABLE ROW LEVEL SECURITY;
ALTER TABLE preventivi_trasporto ENABLE ROW LEVEL SECURITY;

-- 5. RLS per servizi_trasporto (Le ditte sono pubbliche per la lettura e gestibili dai capi registrati)
DROP POLICY IF EXISTS "Group isolation on servizi_trasporto" ON servizi_trasporto;
DROP POLICY IF EXISTS "Public select on servizi_trasporto" ON servizi_trasporto;
CREATE POLICY "Public select on servizi_trasporto" ON servizi_trasporto
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated manage servizi_trasporto" ON servizi_trasporto;
CREATE POLICY "Authenticated manage servizi_trasporto" ON servizi_trasporto
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. RLS per preventivi_trasporto (I preventivi sono isolati per gruppo)
DROP POLICY IF EXISTS "Group isolation on preventivi_trasporto" ON preventivi_trasporto;
CREATE POLICY "Group isolation on preventivi_trasporto" ON preventivi_trasporto
    FOR ALL USING (group_id = (SELECT group_id FROM users WHERE id = auth.uid()));
