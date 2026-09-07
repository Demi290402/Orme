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

-- ==========================================================
-- Fine Script - Schema DB allineato a tutte le ultime modifiche
-- ==========================================================
