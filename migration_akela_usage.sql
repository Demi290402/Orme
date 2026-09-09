-- Migrazione per la gestione dei token e quota giornaliera di Akela Assistant
CREATE TABLE IF NOT EXISTS public.akela_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    request_count INTEGER NOT NULL DEFAULT 1,
    last_request_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT akela_usage_user_date_unique UNIQUE (user_id, usage_date)
);

-- Indici per ricerche veloci
CREATE INDEX IF NOT EXISTS idx_akela_usage_user_date ON public.akela_usage(user_id, usage_date);

-- Abilitazione Row Level Security (RLS)
ALTER TABLE public.akela_usage ENABLE ROW LEVEL SECURITY;

-- Policy per consentire la lettura e scrittura tramite service_role (usato dalla Edge Function)
-- e lettura per l'utente stesso dei propri consumi
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'akela_usage' AND policyname = 'Utenti possono vedere il proprio consumo di Akela'
    ) THEN
        CREATE POLICY "Utenti possono vedere il proprio consumo di Akela"
            ON public.akela_usage
            FOR SELECT
            USING (auth.uid()::text = user_id OR auth.role() = 'service_role');
    END IF;
END $$;
