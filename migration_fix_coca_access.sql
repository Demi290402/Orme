-- =========================================================================
-- MIGRAZIONE: ACCESSO COMUNITÀ CAPI, CODICE PIN E APPROVAZIONE 2 CAPI
-- Esegui questo script nell'editor SQL di Supabase
-- =========================================================================

-- 1. Aggiorna verify_group_pin per verificare sia tramite ID numerico che per nome gruppo
CREATE OR REPLACE FUNCTION public.verify_group_pin(target_group_id TEXT, pin_input TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    clean_pin TEXT;
    db_pin TEXT;
BEGIN
    IF pin_input IS NULL OR TRIM(pin_input) = '' OR target_group_id IS NULL OR TRIM(target_group_id) = '' THEN
        RETURN FALSE;
    END IF;

    clean_pin := UPPER(TRIM(pin_input));
    
    -- Cerca per ID numerico oppure per nome gruppo
    SELECT UPPER(TRIM(join_code)) INTO db_pin
    FROM public.gruppi_scout
    WHERE (id::TEXT = TRIM(target_group_id) OR UPPER(TRIM(group_name)) = UPPER(TRIM(target_group_id)))
    LIMIT 1;
    
    IF db_pin IS NOT NULL AND db_pin = clean_pin THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. submit_my_group_pin: Se l'utente in attesa inserisce il PIN corretto, diventa SUBITO 'attivo'
CREATE OR REPLACE FUNCTION public.submit_my_group_pin(pin_input TEXT)
RETURNS JSONB AS $$
DECLARE
    my_user RECORD;
    is_valid BOOLEAN;
BEGIN
    SELECT * INTO my_user FROM public.users WHERE id = auth.uid();
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Utente non trovato');
    END IF;

    is_valid := public.verify_group_pin(my_user.group_id, pin_input);
    IF NOT is_valid AND my_user.group_name IS NOT NULL THEN
        is_valid := public.verify_group_pin(my_user.group_name, pin_input);
    END IF;

    IF NOT is_valid THEN
        RETURN jsonb_build_object('success', false, 'message', 'Codice di accesso non corretto per questo gruppo');
    END IF;

    -- Con codice di accesso valido: ACCESSO IMMEDIATO SENZA ATTESA
    UPDATE public.users
    SET has_valid_pin = TRUE,
        membership_status = 'attivo'
    WHERE id = auth.uid();

    RETURN jsonb_build_object(
        'success', true,
        'has_valid_pin', true,
        'membership_status', 'attivo'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. vote_approve_member: Richiede 2 approvazioni di capi attivi del gruppo per i membri senza codice
CREATE OR REPLACE FUNCTION public.vote_approve_member(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    voter RECORD;
    target_user RECORD;
    active_count INT;
    required_count INT;
    new_approvals TEXT[];
    new_count INT;
    new_status TEXT;
BEGIN
    -- Verifica chi vota
    SELECT * INTO voter FROM public.users WHERE id = auth.uid();
    IF NOT FOUND OR voter.membership_status != 'attivo' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Solo i membri attivi della CoCa possono votare.');
    END IF;

    -- Verifica l'utente da approvare
    SELECT * INTO target_user FROM public.users WHERE id = target_user_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Utente da approvare non trovato.');
    END IF;

    -- Verifica appartenenza allo stesso gruppo (per ID o per nome)
    IF (voter.group_id IS DISTINCT FROM target_user.group_id) 
       AND (UPPER(TRIM(COALESCE(voter.group_name, ''))) != UPPER(TRIM(COALESCE(target_user.group_name, '')))) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Non puoi votare per un capo di un altro gruppo.');
    END IF;

    -- Aggiungi il voto se il capo non ha già votato
    new_approvals := COALESCE(target_user.coca_approvals, '{}');
    IF NOT (auth.uid()::TEXT = ANY(new_approvals)) THEN
        new_approvals := array_append(new_approvals, auth.uid()::TEXT);
    END IF;

    new_count := array_length(new_approvals, 1);
    IF new_count IS NULL THEN new_count := 0; END IF;

    -- Conta i membri attivi del gruppo
    SELECT COUNT(*) INTO active_count 
    FROM public.users 
    WHERE (group_id = target_user.group_id OR UPPER(TRIM(group_name)) = UPPER(TRIM(target_user.group_name)))
      AND membership_status = 'attivo';

    -- Soglia: 2 approvazioni di capi attivi (o 1 se c'è solo 1 membro attivo nel gruppo)
    required_count := LEAST(2, GREATEST(1, active_count));

    IF new_count >= required_count THEN
        new_status := 'attivo';
    ELSE
        new_status := 'in_attesa';
    END IF;

    UPDATE public.users
    SET coca_approvals = new_approvals,
        membership_status = new_status
    WHERE id = target_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'membership_status', new_status,
        'approvals_count', new_count,
        'required_count', required_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Funzione RPC get_group_coca_users: Restituisce in modo sicuro tutti i membri e le richieste del gruppo
CREATE OR REPLACE FUNCTION public.get_group_coca_users()
RETURNS SETOF public.users AS $$
DECLARE
    caller RECORD;
BEGIN
    SELECT * INTO caller FROM public.users WHERE id = auth.uid();
    IF NOT FOUND THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT * FROM public.users
    WHERE (
        (caller.group_id IS NOT NULL AND caller.group_id != '' AND group_id = caller.group_id)
        OR
        (caller.group_name IS NOT NULL AND caller.group_name != '' AND UPPER(TRIM(group_name)) = UPPER(TRIM(caller.group_name)))
        OR
        (caller.group_id IS NOT NULL AND caller.group_id != '' AND group_name = caller.group_id)
    )
    ORDER BY 
        CASE WHEN membership_status = 'in_attesa' THEN 0 ELSE 1 END,
        points DESC,
        created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Policy RLS sulla tabella users per consentire la lettura dei membri e delle richieste del proprio gruppo
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read members of own group" ON public.users;
CREATE POLICY "Users can read members of own group" ON public.users
FOR SELECT USING (
    auth.uid() = id
    OR
    (group_id IS NOT NULL AND group_id != '' AND group_id = (SELECT u.group_id FROM public.users u WHERE u.id = auth.uid()))
    OR
    (group_name IS NOT NULL AND group_name != '' AND UPPER(TRIM(group_name)) = (SELECT UPPER(TRIM(u.group_name)) FROM public.users u WHERE u.id = auth.uid()))
);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
FOR UPDATE USING (
    auth.uid() = id
);

-- 6. conclude_member_service: Permette ai capi attivi di rifiutare una richiesta o concludere un servizio
CREATE OR REPLACE FUNCTION public.conclude_member_service(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    caller RECORD;
    target_user RECORD;
BEGIN
    SELECT * INTO caller FROM public.users WHERE id = auth.uid();
    IF NOT FOUND OR caller.membership_status != 'attivo' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Non autorizzato.');
    END IF;

    SELECT * INTO target_user FROM public.users WHERE id = target_user_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Utente non trovato.');
    END IF;

    IF (caller.group_id IS DISTINCT FROM target_user.group_id) 
       AND (UPPER(TRIM(COALESCE(caller.group_name, ''))) != UPPER(TRIM(COALESCE(target_user.group_name, '')))) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Utente appartenente a un altro gruppo.');
    END IF;

    UPDATE public.users
    SET membership_status = 'uscito'
    WHERE id = target_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'Operazione completata con successo.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

