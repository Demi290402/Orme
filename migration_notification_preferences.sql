-- ====================================================================
-- ORME MIGRATION: Preferenze Notifiche e Suoni Utente (v3 - Default Aggiornati)
-- Esegui questo script nel SQL Editor di Supabase.
-- ====================================================================

-- 1. Aggiungi colonne per preferenze canali (in-app / email) e tono suoni alla tabella users
-- (Default: 'verbali' e 'richiesta_accesso' attive su ENTRAMBE, 'lista_attesa' e 'aggiornamento_luoghi' DISATTIVO)
ALTER TABLE IF EXISTS public.users
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"verbali":"entrambe","richiesta_accesso":"entrambe","lista_attesa":"disattivo","aggiornamento_luoghi":"disattivo"}'::jsonb,
ADD COLUMN IF NOT EXISTS notification_tone TEXT DEFAULT 'default';

-- Aggiorna il DEFAULT della colonna per le future registrazioni se la colonna esisteva già
ALTER TABLE IF EXISTS public.users 
ALTER COLUMN notification_preferences SET DEFAULT '{"verbali":"entrambe","richiesta_accesso":"entrambe","lista_attesa":"disattivo","aggiornamento_luoghi":"disattivo"}'::jsonb;

-- 2. Aggiorna gli utenti che hanno notification_preferences non impostato
UPDATE public.users
SET notification_preferences = '{"verbali":"entrambe","richiesta_accesso":"entrambe","lista_attesa":"disattivo","aggiornamento_luoghi":"disattivo"}'::jsonb
WHERE notification_preferences IS NULL;

UPDATE public.users
SET notification_tone = 'default'
WHERE notification_tone IS NULL OR notification_tone = '';

-- 3. Assicura che la tabella notifications esista con i campi necessari
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    group_id TEXT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indici per performance query notifiche
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_group_id ON public.notifications(group_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
