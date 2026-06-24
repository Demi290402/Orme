-- ==========================================================
-- MIGRATION: Aggiornamenti Giugno 2026
-- Copia e incolla questo script nell'editor SQL di Supabase
-- ==========================================================

-- 1. Aggiornamento Tabella Users: Aggiunta formazione e nomina a capo
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS formazione JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS has_nomina_capo BOOLEAN DEFAULT false;

-- 2. Eliminazione vecchio modulo proposals
DROP TABLE IF EXISTS proposals CASCADE;

-- 3. Creazione Tabella location_history
CREATE TABLE IF NOT EXISTS location_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    author_name TEXT,
    details TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE location_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Group isolation on location_history" ON location_history;
CREATE POLICY "Group isolation on location_history" ON location_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM locations l
            WHERE l.id = location_id
            AND (l.group_id = (SELECT group_id FROM users WHERE id = auth.uid()) OR l.group_id IS NULL)
        )
    );

-- 4. Creazione Tabella user_location_views
CREATE TABLE IF NOT EXISTS user_location_views (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    last_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, location_id)
);

ALTER TABLE user_location_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own location views" ON user_location_views;
CREATE POLICY "Users can manage their own location views" ON user_location_views
    FOR ALL USING (user_id = auth.uid());

-- 5. Creazione Tabella servizi_trasporto
CREATE TABLE IF NOT EXISTS servizi_trasporto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id TEXT NOT NULL,
    company_name TEXT NOT NULL,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    departure_region TEXT NOT NULL,
    departure_province TEXT,
    departure_commune TEXT NOT NULL,
    departure_address TEXT,
    capacity INTEGER NOT NULL DEFAULT 50,
    price_per_person NUMERIC,
    base_price NUMERIC,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE servizi_trasporto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Group isolation on servizi_trasporto" ON servizi_trasporto;
CREATE POLICY "Group isolation on servizi_trasporto" ON servizi_trasporto
    FOR ALL USING (group_id = (SELECT group_id FROM users WHERE id = auth.uid()));
