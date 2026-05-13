-- 1. Aggiunta delle colonne per i contatori di ricerca specifici per branca
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS searches_lc INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS searches_eg INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS searches_rs INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS searches_coca INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS searches_gruppo INTEGER DEFAULT 0;

-- 2. Aggiunta colonna updated_at alla tabella proposals (se non presente)
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 3. Trigger per aggiornare automaticamente updated_at nelle proposte
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_proposals_updated_at ON proposals;
CREATE TRIGGER update_proposals_updated_at
BEFORE UPDATE ON proposals
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- 4. Auto-eliminazione delle proposte approvate/rifiutate dopo 1 settimana
-- Assicurarsi che l'estensione pg_cron sia abilitata (solo per amministratori Supabase)
-- Se pg_cron non è disponibile, questa operazione va gestita via Edge Functions o manualmente.
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- SELECT cron.schedule('cleanup-expired-proposals', '0 0 * * *', $$
--   DELETE FROM proposals 
--   WHERE (status = 'approved' OR status = 'rejected') 
--   AND updated_at < NOW() - INTERVAL '7 days';
-- $$);

-- Nota: Poiché pg_cron richiede privilegi di superuser, lo script di eliminazione 
-- sopra è commentato. È possibile eseguirlo manualmente nel SQL Editor di Supabase 
-- oppure creare un pulsante "Pulisci proposte vecchie" riservato agli admin.
