-- ==========================================================
-- AGGIORNAMENTO MEMBRI STORICI E SNAPSHOT VERBALI
-- Esegui questo script nell'editor SQL di Supabase
-- ==========================================================

-- 1. Aggiunta colonna 'attivo' nella tabella 'membri' per soft-delete
ALTER TABLE membri 
ADD COLUMN IF NOT EXISTS attivo BOOLEAN DEFAULT true;

-- 2. Imposta a true tutti i membri esistenti senza valore
UPDATE membri 
SET attivo = true 
WHERE attivo IS NULL;

-- 3. Indice sulle prestazioni per filtrare rapidamente membri attivi vs storici
CREATE INDEX IF NOT EXISTS idx_membri_attivo ON membri(attivo);

-- 4. Aggiunta colonna 'presenti_nomi' nella tabella 'verbali' per snapshot storico immutabile
ALTER TABLE verbali 
ADD COLUMN IF NOT EXISTS presenti_nomi JSONB DEFAULT '{}'::jsonb;

-- 5. Commenti descrittivi
COMMENT ON COLUMN membri.attivo IS 'Indica se il membro e attivo nel censimento (true) oppure e un capo storico / servizio concluso (false) per preservare verbali e statistiche';
COMMENT ON COLUMN verbali.presenti_nomi IS 'Snapshot JSON immutabile dei nomi dei membri presenti/assenti al momento della compilazione del verbale';
