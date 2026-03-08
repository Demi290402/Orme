-- ==========================================================
-- MIGRATION: Tabella Gruppi Scout per registrazione a cascata
-- Copia e incolla nell'editor SQL di Supabase
-- ==========================================================

-- 1. Creazione tabella gruppi_scout con ID numerico auto-incrementale
CREATE TABLE IF NOT EXISTS gruppi_scout (
    id SERIAL PRIMARY KEY,                          -- numerico auto-increment: 1, 2, 3...
    region TEXT NOT NULL,                           -- Regione (es: Puglia)
    scout_zone TEXT NOT NULL,                       -- Zona (es: Bari Sud)
    group_name TEXT NOT NULL,                       -- Nome gruppo (es: Turi 1)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(region, scout_zone, group_name)          -- nessun duplicato
);

-- 2. Seed: inserisce il gruppo Turi 1 com ID = 1
-- Usa INSERT ... ON CONFLICT per garantire idempotenza (si può eseguire più volte)
INSERT INTO gruppi_scout (id, region, scout_zone, group_name)
VALUES (1, 'Puglia', 'Bari Sud', 'Turi 1')
ON CONFLICT (region, scout_zone, group_name) DO NOTHING;

-- Resetta la sequenza affinché il prossimo gruppo inserito abbia ID = 2
SELECT setval('gruppi_scout_id_seq', (SELECT MAX(id) FROM gruppi_scout));

-- 3. Abilita Row Level Security
ALTER TABLE gruppi_scout ENABLE ROW LEVEL SECURITY;

-- 4. Policy: chiunque può leggere i gruppi (necessario in fase di registrazione, prima del login)
DROP POLICY IF EXISTS "Anyone can read gruppi_scout" ON gruppi_scout;
CREATE POLICY "Anyone can read gruppi_scout"
    ON gruppi_scout FOR SELECT
    USING (true);

-- 5. Policy: solo utenti autenticati possono inserire nuovi gruppi
DROP POLICY IF EXISTS "Authenticated can insert gruppi_scout" ON gruppi_scout;
CREATE POLICY "Authenticated can insert gruppi_scout"
    ON gruppi_scout FOR INSERT
    WITH CHECK (true);
