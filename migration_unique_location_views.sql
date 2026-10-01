-- ==========================================================
-- MIGRATION: Visualizzazioni Univoche per Luogo (Unique Location Views)
-- Esegui questo script nell'editor SQL della tua dashboard Supabase
-- ==========================================================

-- 1. Funzione per registrare ed aggiornare SOLO visualizzazioni univoche per utente
CREATE OR REPLACE FUNCTION record_unique_location_view(loc_id UUID, u_id UUID DEFAULT NULL)
RETURNS integer AS $$
DECLARE
    actual_user_id UUID;
    already_viewed boolean := false;
    current_count integer;
BEGIN
    -- Ricava l'ID dell'utente: dal parametro esplicito oppure dalla sessione attiva auth.uid()
    actual_user_id := COALESCE(u_id, auth.uid());

    IF actual_user_id IS NOT NULL THEN
        -- Controlla se questo utente ha già visualizzato la scheda in precedenza
        SELECT EXISTS (
            SELECT 1 FROM user_location_views
            WHERE location_id = loc_id AND user_id = actual_user_id
        ) INTO already_viewed;

        IF NOT already_viewed THEN
            -- Prima visualizzazione in assoluto dell'utente: registra il record
            INSERT INTO user_location_views (user_id, location_id, last_viewed_at)
            VALUES (actual_user_id, loc_id, timezone('utc'::text, now()))
            ON CONFLICT (user_id, location_id) DO UPDATE
            SET last_viewed_at = EXCLUDED.last_viewed_at;

            -- Incrementa il contatore delle visualizzazioni univoche
            UPDATE locations
            SET views_count = COALESCE(views_count, 0) + 1
            WHERE id = loc_id
            RETURNING views_count INTO current_count;
        ELSE
            -- Utente ha già visualizzato la scheda: aggiorna solo la data dell'ultima visita SENZA incrementare il contatore
            UPDATE user_location_views
            SET last_viewed_at = timezone('utc'::text, now())
            WHERE location_id = loc_id AND user_id = actual_user_id;

            SELECT COALESCE(views_count, 0) INTO current_count
            FROM locations
            WHERE id = loc_id;
        END IF;
    ELSE
        -- Visitatore non autenticato: restituisce il conteggio attuale
        SELECT COALESCE(views_count, 0) INTO current_count
        FROM locations
        WHERE id = loc_id;
    END IF;

    RETURN COALESCE(current_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Aggiorna la funzione legacy increment_location_views per renderla retrocompatibile e sicura
CREATE OR REPLACE FUNCTION increment_location_views(loc_id UUID)
RETURNS integer AS $$
BEGIN
    RETURN record_unique_location_view(loc_id, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Permessi di esecuzione per utenti autenticati e anonimi
GRANT EXECUTE ON FUNCTION record_unique_location_view(UUID, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION increment_location_views(UUID) TO authenticated, anon;

-- 4. Ricalcolo e allineamento di tutte le schede esistenti:
-- Corregge retroattivamente i conteggi gonfiati dalle visite ripetute dello stesso utente in giorni diversi,
-- impostando views_count esattamente pari al numero di utenti unici reali registrati nella tabella user_location_views.
UPDATE locations l
SET views_count = COALESCE((
    SELECT COUNT(DISTINCT ulv.user_id)
    FROM user_location_views ulv
    WHERE ulv.location_id = l.id
), 0);
