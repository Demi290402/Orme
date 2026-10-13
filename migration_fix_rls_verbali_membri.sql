-- =========================================================================
-- RISOLUZIONE: FIX POLICY RLS SU USERS, VERBALI E MEMBRI DELLA COMUNITÀ CAPI
-- Esegui questo script nell'editor SQL di Supabase
-- =========================================================================

-- 1. Helper SECURITY DEFINER: restituiscono group_id e group_name dell'utente autenticato
-- Senza innescare ricorsione infinita nella valutazione delle policy RLS
CREATE OR REPLACE FUNCTION public.get_auth_user_group_id()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT group_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_auth_user_group_name()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT group_name FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

-- 2. Rimozione policy ricorsive e ripristino policy pulita su USERS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read members of own group" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can read profiles of own group" ON public.users;

CREATE POLICY "Users can read profiles of own group" ON public.users
FOR SELECT USING (
    -- Accesso al proprio profilo
    auth.uid() = id
    OR
    -- Accesso ai capi del proprio gruppo scout (tramite ID gruppo)
    (
        public.get_auth_user_group_id() IS NOT NULL 
        AND public.get_auth_user_group_id() != '' 
        AND (
            group_id = public.get_auth_user_group_id() 
            OR group_name = public.get_auth_user_group_id()
        )
    )
    OR
    -- Accesso ai capi del proprio gruppo scout (tramite Nome gruppo)
    (
        public.get_auth_user_group_name() IS NOT NULL 
        AND public.get_auth_user_group_name() != '' 
        AND (
            UPPER(TRIM(group_name)) = UPPER(TRIM(public.get_auth_user_group_name())) 
            OR UPPER(TRIM(group_id)) = UPPER(TRIM(public.get_auth_user_group_name()))
        )
    )
);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
FOR UPDATE USING (
    auth.uid() = id
);

-- 3. Policy su MEMBRI COCA: supporta sia group_id numerico che nome gruppo storico
ALTER TABLE public.membri ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Group isolation" ON public.membri;
DROP POLICY IF EXISTS "Membri access policy" ON public.membri;
DROP POLICY IF EXISTS "Membri group access policy" ON public.membri;

CREATE POLICY "Membri access policy" ON public.membri
    FOR ALL USING (
        auth.role() = 'authenticated' AND (
            (
                public.get_auth_user_group_id() IS NOT NULL 
                AND public.get_auth_user_group_id() != '' 
                AND (
                    group_id = public.get_auth_user_group_id() 
                    OR group_id = public.get_auth_user_group_name()
                )
            )
            OR
            (
                public.get_auth_user_group_name() IS NOT NULL 
                AND public.get_auth_user_group_name() != '' 
                AND (
                    UPPER(TRIM(group_id)) = UPPER(TRIM(public.get_auth_user_group_name())) 
                    OR UPPER(TRIM(group_id)) = UPPER(TRIM(public.get_auth_user_group_id()))
                )
            )
        )
    )
    WITH CHECK (
        auth.role() = 'authenticated'
    );

-- 4. Policy su VERBALI: supporta autore, group_id numerico e nome gruppo
ALTER TABLE public.verbali ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Group isolation" ON public.verbali;
DROP POLICY IF EXISTS "Verbali group and author policy" ON public.verbali;
DROP POLICY IF EXISTS "Verbali access policy" ON public.verbali;

CREATE POLICY "Verbali access policy" ON public.verbali
    FOR ALL USING (
        auth.role() = 'authenticated' AND (
            created_by = auth.uid() 
            OR
            (
                public.get_auth_user_group_id() IS NOT NULL 
                AND public.get_auth_user_group_id() != '' 
                AND (
                    group_id = public.get_auth_user_group_id() 
                    OR group_id = public.get_auth_user_group_name()
                )
            )
            OR
            (
                public.get_auth_user_group_name() IS NOT NULL 
                AND public.get_auth_user_group_name() != '' 
                AND (
                    UPPER(TRIM(group_id)) = UPPER(TRIM(public.get_auth_user_group_name())) 
                    OR UPPER(TRIM(group_id)) = UPPER(TRIM(public.get_auth_user_group_id()))
                )
            )
        )
    )
    WITH CHECK (
        auth.role() = 'authenticated'
    );

-- 5. Policy su IMPOSTAZIONI_VERBALI
ALTER TABLE public.impostazioni_verbali ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Group isolation" ON public.impostazioni_verbali;
DROP POLICY IF EXISTS "Impostazioni verbali access policy" ON public.impostazioni_verbali;

CREATE POLICY "Impostazioni verbali access policy" ON impostazioni_verbali
    FOR ALL USING (
        auth.role() = 'authenticated' AND (
            (
                public.get_auth_user_group_id() IS NOT NULL 
                AND public.get_auth_user_group_id() != '' 
                AND (
                    group_id = public.get_auth_user_group_id() 
                    OR group_id = public.get_auth_user_group_name()
                )
            )
            OR
            (
                public.get_auth_user_group_name() IS NOT NULL 
                AND public.get_auth_user_group_name() != '' 
                AND (
                    UPPER(TRIM(group_id)) = UPPER(TRIM(public.get_auth_user_group_name())) 
                    OR UPPER(TRIM(group_id)) = UPPER(TRIM(public.get_auth_user_group_id()))
                )
            )
        )
    )
    WITH CHECK (
        auth.role() = 'authenticated'
    );

-- 6. Allineamento status utenti storici (imposta attivo se null o vuoto)
UPDATE public.users 
SET membership_status = 'attivo' 
WHERE membership_status IS NULL OR membership_status = '';
