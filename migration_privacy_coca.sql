-- =========================================================================
-- MIGRAZIONE PRIVACY COMUNITÀ CAPI: PIN, VOTO MULTI-MEMBRO, USCITE E TRASFERIMENTI
-- Esegui questo script nell'editor SQL di Supabase
-- =========================================================================

-- 1. Aggiungi PIN di gruppo a gruppi_scout
ALTER TABLE IF EXISTS public.gruppi_scout 
ADD COLUMN IF NOT EXISTS join_code TEXT;

-- Genera un PIN casuale (6 caratteri maiuscoli/numeri) per tutti i gruppi che non lo hanno
UPDATE public.gruppi_scout
SET join_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT) FROM 1 FOR 6))
WHERE join_code IS NULL OR join_code = '';

-- Assicuriamoci che join_code non sia nullo per i futuri inserimenti
ALTER TABLE public.gruppi_scout 
ALTER COLUMN join_code SET DEFAULT UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));

-- 2. Aggiorna la tabella users con i campi di appartenenza alla CoCa
ALTER TABLE IF EXISTS public.users
ADD COLUMN IF NOT EXISTS membership_status TEXT DEFAULT 'attivo',
ADD COLUMN IF NOT EXISTS group_role TEXT DEFAULT 'capo',
ADD COLUMN IF NOT EXISTS coca_approvals TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS has_valid_pin BOOLEAN DEFAULT FALSE;

-- Garantisci che tutti gli utenti già registrati abbiano stato 'attivo' per non bloccare nessuno
UPDATE public.users
SET membership_status = 'attivo'
WHERE membership_status IS NULL OR membership_status = '';

UPDATE public.users
SET group_role = 'capo'
WHERE group_role IS NULL OR group_role = '';

-- Se un gruppo ha utenti ma nessun capo_gruppo designato, rendi capo_gruppo il primo utente creato nel gruppo
WITH first_users AS (
    SELECT DISTINCT ON (group_id) id, group_id
    FROM public.users
    WHERE group_id IS NOT NULL AND group_id != ''
    ORDER BY group_id, created_at ASC
)
UPDATE public.users u
SET group_role = 'capo_gruppo'
FROM first_users fu
WHERE u.id = fu.id;

-- 3. Funzione RPC per verificare il PIN del gruppo
CREATE OR REPLACE FUNCTION public.verify_group_pin(target_group_id TEXT, pin_input TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    clean_pin TEXT;
    db_pin TEXT;
BEGIN
    clean_pin := UPPER(TRIM(pin_input));
    
    SELECT UPPER(TRIM(join_code)) INTO db_pin
    FROM public.gruppi_scout
    WHERE id::TEXT = TRIM(target_group_id);
    
    IF db_pin IS NOT NULL AND db_pin = clean_pin THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Funzione RPC per sbloccare/validare il PIN per l'utente corrente in attesa
CREATE OR REPLACE FUNCTION public.submit_my_group_pin(pin_input TEXT)
RETURNS JSONB AS $$
DECLARE
    my_user RECORD;
    is_valid BOOLEAN;
    active_count INT;
    required_count INT;
    new_status TEXT;
    current_approvals_count INT;
BEGIN
    SELECT * INTO my_user FROM public.users WHERE id = auth.uid();
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Utente non trovato');
    END IF;

    is_valid := public.verify_group_pin(my_user.group_id, pin_input);
    IF NOT is_valid THEN
        RETURN jsonb_build_object('success', false, 'message', 'PIN non corretto');
    END IF;

    -- Conta i capi attivi nel gruppo
    SELECT COUNT(*) INTO active_count 
    FROM public.users 
    WHERE group_id = my_user.group_id AND membership_status = 'attivo';

    -- Soglia con PIN: 2 approvazioni (oppure tutti i membri se ce ne sono meno di 2)
    required_count := LEAST(2, GREATEST(1, active_count));
    current_approvals_count := array_length(COALESCE(my_user.coca_approvals, '{}'), 1);
    IF current_approvals_count IS NULL THEN current_approvals_count := 0; END IF;

    IF current_approvals_count >= required_count THEN
        new_status := 'attivo';
    ELSE
        new_status := 'in_attesa';
    END IF;

    UPDATE public.users
    SET has_valid_pin = TRUE,
        membership_status = new_status
    WHERE id = auth.uid();

    RETURN jsonb_build_object(
        'success', true,
        'has_valid_pin', true,
        'membership_status', new_status,
        'approvals_count', current_approvals_count,
        'required_count', required_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Funzione RPC per approvare un membro (voto da parte di un capo attivo)
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

    -- Verifica l'utente bersaglio
    SELECT * INTO target_user FROM public.users WHERE id = target_user_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Utente da approvare non trovato.');
    END IF;

    -- Stesso gruppo?
    IF voter.group_id != target_user.group_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Non puoi votare per un capo di un altro gruppo.');
    END IF;

    -- Aggiungi il voto se non presente
    new_approvals := COALESCE(target_user.coca_approvals, '{}');
    IF NOT (auth.uid()::TEXT = ANY(new_approvals)) THEN
        new_approvals := array_append(new_approvals, auth.uid()::TEXT);
    END IF;

    new_count := array_length(new_approvals, 1);
    IF new_count IS NULL THEN new_count := 0; END IF;

    -- Quanti membri attivi ci sono nel gruppo?
    SELECT COUNT(*) INTO active_count 
    FROM public.users 
    WHERE group_id = target_user.group_id AND membership_status = 'attivo';

    -- Soglia: 2 se ha PIN valido, 4 se senza PIN (limitato dal numero totale di membri attivi)
    IF target_user.has_valid_pin THEN
        required_count := LEAST(2, GREATEST(1, active_count));
    ELSE
        required_count := LEAST(4, GREATEST(1, active_count));
    END IF;

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

-- 6. Funzione RPC per concludere il servizio (uscita dalla CoCa)
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

    IF caller.group_id != target_user.group_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Utente appartenente a un altro gruppo.');
    END IF;

    UPDATE public.users
    SET membership_status = 'uscito'
    WHERE id = target_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'Servizio concluso con successo.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Funzione RPC per rigenerare il PIN di gruppo
CREATE OR REPLACE FUNCTION public.regenerate_group_pin(target_group_id TEXT)
RETURNS JSONB AS $$
DECLARE
    caller RECORD;
    new_pin TEXT;
BEGIN
    SELECT * INTO caller FROM public.users WHERE id = auth.uid();
    IF NOT FOUND OR caller.membership_status != 'attivo' OR caller.group_id != target_group_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Non autorizzato a rigenerare il PIN per questo gruppo.');
    END IF;

    new_pin := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6));

    UPDATE public.gruppi_scout
    SET join_code = new_pin
    WHERE id::TEXT = target_group_id;

    RETURN jsonb_build_object('success', true, 'pin', new_pin);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
