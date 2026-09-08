-- ==========================================================
-- AGGIORNAMENTO VERBALI: ANNO ASSOCIATIVO SCOUT
-- Esegui questo script nell'editor SQL di Supabase
-- ==========================================================

-- 1. Aggiunta della colonna anno_scout (es. 2024 per l'anno scout 2024 — 2025)
ALTER TABLE verbali 
ADD COLUMN IF NOT EXISTS anno_scout INTEGER;

-- 2. Creazione indice per velocizzare raggruppamento e filtri per anno
CREATE INDEX IF NOT EXISTS idx_verbali_anno_scout ON verbali(anno_scout);

-- 3. Popolamento automatico per i verbali già esistenti in archivio
-- Regola scout: Ottobre-Dicembre appartengono all'anno in corso;
-- Gennaio-Settembre appartengono all'anno precedente.
UPDATE verbali
SET anno_scout = CASE 
    WHEN EXTRACT(MONTH FROM data) >= 10 THEN EXTRACT(YEAR FROM data)::INTEGER
    ELSE EXTRACT(YEAR FROM data)::INTEGER - 1
END
WHERE anno_scout IS NULL;

-- 4. Commento esplicativo per la colonna
COMMENT ON COLUMN verbali.anno_scout IS 'Anno iniziale dell''anno associativo scout (es. 2024 indica l''anno scout 2024 — 2025 che va da Ottobre 2024 a Settembre 2025)';
