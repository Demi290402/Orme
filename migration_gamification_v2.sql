-- ==========================================================
-- AGGIORNAMENTO GAMIFICATION: STORICO, VERBALI E ORME
-- ==========================================================

-- 1. Aggiornamento Tabella Users con nuovi tracciamenti points
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS verbali_read_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS storico_items_added INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reviews_added INTEGER DEFAULT 0;

-- 2. Commento per documentazione
COMMENT ON COLUMN users.verbali_read_ids IS 'Array di ID dei verbali già letti per evitare doppio accredito punti';
COMMENT ON COLUMN users.storico_items_added IS 'Contatore di memorie storiche aggiunte per badge';
COMMENT ON COLUMN users.reviews_added IS 'Contatore di orme (recensioni) lasciate nei luoghi';
