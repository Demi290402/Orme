-- ==========================================================
-- AGGIORNAMENTO DATABASE ORME: SCHEMA FORM PERSONALIZZATO
-- Copia e incolla questo script nell'editor SQL di Supabase
-- per abilitare il salvataggio dei blocchi personalizzati del form.
-- ==========================================================

-- 1. Aggiungi la colonna form_schema alla tabella impostazioni_iscrizione se non esiste
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'impostazioni_iscrizione' 
        AND column_name = 'form_schema'
    ) THEN 
        ALTER TABLE impostazioni_iscrizione 
        ADD COLUMN form_schema JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;
