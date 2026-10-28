-- ====================================================================
-- ORME MIGRATION: Preferenze Notifiche e Suoni Utente (v3)
-- Esegui questo script nel SQL Editor di Supabase.
-- ====================================================================

-- 1. Aggiungi colonne per preferenze canali (in-app / email) e tono suoni alla tabella users
ALTER TABLE IF EXISTS public.users
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"verbali":"entrambe","lista_attesa":"entrambe","richiesta_accesso":"entrambe","aggiornamento_luoghi":"entrambe"}'::jsonb,
ADD COLUMN IF NOT EXISTS notification_tone TEXT DEFAULT 'default';

-- 2. Aggiorna gli utenti esistenti con i valori predefiniti
UPDATE public.users
SET notification_preferences = '{"verbali":"entrambe","lista_attesa":"entrambe","richiesta_accesso":"entrambe","aggiornamento_luoghi":"entrambe"}'::jsonb
WHERE notification_preferences IS NULL;

UPDATE public.users
SET notification_tone = 'default'
WHERE notification_tone IS NULL OR notification_tone = '';

-- 3. Assicura che la tabella notifications accetti i nuovi tipi
-- (La colonna type è TEXT, quindi supporta 'verbale_saved', 'lista_attesa', 'location_added', 'proposal', 'richiesta_accesso', 'nuovo_capo', 'generic')
