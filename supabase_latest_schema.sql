-- ==========================================================
-- SCRIPT SQL AGGIORNAMENTO COMPLETO DATABASE ORME (SUPABASE)
-- Data: Settembre 2026
-- Istruzioni: Copia e incolla questo script nel tuo SQL Editor su Supabase ed eseguilo (Run).
-- Lo script è completamente idempotente: non sovrascrive né cancella dati esistenti.
-- ==========================================================

-- 1. Estensione UUID (se non già attiva)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Aggiornamento Tabella LOCATIONS
-- Aggiunta di tutte le nuove colonne introdotte nelle ultime funzionalità
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS google_maps_link TEXT,
ADD COLUMN IF NOT EXISTS coordinates JSONB,
ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS emails TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS facebook TEXT,
ADD COLUMN IF NOT EXISTS instagram TEXT,
ADD COLUMN IF NOT EXISTS has_heating BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_water_points BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS truck_distance TEXT,
ADD COLUMN IF NOT EXISTS accantonamento_capacity INTEGER,
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pricing JSONB,
ADD COLUMN IF NOT EXISTS other_attention TEXT,
ADD COLUMN IF NOT EXISTS has_pastures BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_insects BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_diseases BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_little_shade BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_very_busy_area BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS other_restrictions TEXT,
ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'available',
ADD COLUMN IF NOT EXISTS group_id TEXT,
ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
ADD COLUMN IF NOT EXISTS last_updated_by UUID REFERENCES auth.users(id);

-- 3. Indici per prestazioni e prevenzione duplicati su Locations
CREATE INDEX IF NOT EXISTS idx_locations_commune ON locations(commune);
CREATE INDEX IF NOT EXISTS idx_locations_name ON locations(name);
CREATE INDEX IF NOT EXISTS idx_locations_group_id ON locations(group_id);

-- 4. Creazione Tabella LOCATION_HISTORY (Cronologia modifiche schede)
CREATE TABLE IF NOT EXISTS location_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    author_name TEXT,
    details TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE location_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'location_history' AND policyname = 'Allow read for all users on location_history'
    ) THEN
        CREATE POLICY "Allow read for all users on location_history" ON location_history
            FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'location_history' AND policyname = 'Allow insert for authenticated users on location_history'
    ) THEN
        CREATE POLICY "Allow insert for authenticated users on location_history" ON location_history
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- 5. Creazione Tabella USER_LOCATION_VIEWS (Tracciamento notifiche Nuove modifiche)
CREATE TABLE IF NOT EXISTS user_location_views (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    last_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, location_id)
);

ALTER TABLE user_location_views ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_location_views' AND policyname = 'Users can manage their own location views'
    ) THEN
        CREATE POLICY "Users can manage their own location views" ON user_location_views
            FOR ALL USING (user_id = auth.uid());
    END IF;
END $$;

-- 6. Funzione per incremento automatico visite / visualizzazioni univoche per scheda
CREATE OR REPLACE FUNCTION record_unique_location_view(loc_id UUID, u_id UUID DEFAULT NULL)
RETURNS integer AS $$
DECLARE
    actual_user_id UUID;
    already_viewed boolean := false;
    current_count integer;
BEGIN
    actual_user_id := COALESCE(u_id, auth.uid());

    IF actual_user_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM user_location_views
            WHERE location_id = loc_id AND user_id = actual_user_id
        ) INTO already_viewed;

        IF NOT already_viewed THEN
            INSERT INTO user_location_views (user_id, location_id, last_viewed_at)
            VALUES (actual_user_id, loc_id, timezone('utc'::text, now()))
            ON CONFLICT (user_id, location_id) DO UPDATE
            SET last_viewed_at = EXCLUDED.last_viewed_at;

            UPDATE locations
            SET views_count = COALESCE(views_count, 0) + 1
            WHERE id = loc_id
            RETURNING views_count INTO current_count;
        ELSE
            UPDATE user_location_views
            SET last_viewed_at = timezone('utc'::text, now())
            WHERE location_id = loc_id AND user_id = actual_user_id;

            SELECT COALESCE(views_count, 0) INTO current_count
            FROM locations
            WHERE id = loc_id;
        END IF;
    ELSE
        SELECT COALESCE(views_count, 0) INTO current_count
        FROM locations
        WHERE id = loc_id;
    END IF;

    RETURN COALESCE(current_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_location_views(loc_id UUID)
RETURNS integer AS $$
BEGIN
    RETURN record_unique_location_view(loc_id, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION record_unique_location_view(UUID, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION increment_location_views(UUID) TO authenticated, anon;

-- ==========================================================
-- 7. RLS e Policy per Verbali, Membri e Impostazioni CoCa
-- Garantisce che un utente possa sempre visualizzare i verbali
-- del proprio Gruppo Scout OPPURE quelli da lui stesso creati,
-- evitando problemi di disallineamento gruppo tra PC e telefono.
-- ==========================================================

-- 7.1 Colonne Verbali
ALTER TABLE verbali ADD COLUMN IF NOT EXISTS anno_scout INTEGER;

-- Indici prestazioni
CREATE INDEX IF NOT EXISTS idx_verbali_group_id ON verbali(group_id);
CREATE INDEX IF NOT EXISTS idx_verbali_created_by ON verbali(created_by);
CREATE INDEX IF NOT EXISTS idx_verbali_anno_scout ON verbali(anno_scout);
CREATE INDEX IF NOT EXISTS idx_membri_group_id ON membri(group_id);

-- Abilitazione RLS
ALTER TABLE verbali ENABLE ROW LEVEL SECURITY;
ALTER TABLE membri ENABLE ROW LEVEL SECURITY;
ALTER TABLE impostazioni_verbali ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Pulizia policy preesistenti su verbali
    DROP POLICY IF EXISTS "Group isolation" ON verbali;
    DROP POLICY IF EXISTS "Verbali group and author policy" ON verbali;
    DROP POLICY IF EXISTS "Verbali access policy" ON verbali;

    -- Policy su VERBALI: un utente autenticato può accedere se autore del verbale
    -- o se appartiene al gruppo scout associato al verbale
    CREATE POLICY "Verbali access policy" ON verbali
        FOR ALL USING (
            auth.role() = 'authenticated' AND (
                created_by = auth.uid() 
                OR group_id = (SELECT group_id FROM users WHERE id = auth.uid())
            )
        )
        WITH CHECK (
            auth.role() = 'authenticated'
        );

    -- Pulizia e policy su MEMBRI COCA
    DROP POLICY IF EXISTS "Group isolation" ON membri;
    DROP POLICY IF EXISTS "Membri access policy" ON membri;
    CREATE POLICY "Membri access policy" ON membri
        FOR ALL USING (
            auth.role() = 'authenticated' AND (
                group_id = (SELECT group_id FROM users WHERE id = auth.uid())
            )
        )
        WITH CHECK (
            auth.role() = 'authenticated'
        );

    -- Pulizia e policy su IMPOSTAZIONI VERBALI
    DROP POLICY IF EXISTS "Group isolation" ON impostazioni_verbali;
    DROP POLICY IF EXISTS "Impostazioni verbali access policy" ON impostazioni_verbali;
    CREATE POLICY "Impostazioni verbali access policy" ON impostazioni_verbali
        FOR ALL USING (
            auth.role() = 'authenticated' AND (
                group_id = (SELECT group_id FROM users WHERE id = auth.uid())
            )
        )
        WITH CHECK (
            auth.role() = 'authenticated'
        );
END $$;

-- ==========================================================
-- Fine Script - Schema DB allineato a tutte le ultime modifiche
-- ==========================================================
