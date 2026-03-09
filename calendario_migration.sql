-- Calendario CoCa: tabella eventi
-- Eseguire su Supabase SQL Editor

CREATE TABLE IF NOT EXISTS eventi_calendario (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id TEXT NOT NULL,
    titolo TEXT NOT NULL,
    data_inizio DATE NOT NULL,
    data_fine DATE,
    ora_inizio TIME,
    ora_fine TIME,
    luogo TEXT DEFAULT '',
    note TEXT DEFAULT '',
    branca TEXT DEFAULT 'CoCa',
    colore TEXT DEFAULT '#4CAF50',
    creato_da UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sorgente TEXT DEFAULT 'manuale',  -- 'manuale' | 'verbale'
    verbale_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE eventi_calendario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_select_calendario" ON eventi_calendario
    FOR SELECT USING (
        group_id = (SELECT group_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "group_insert_calendario" ON eventi_calendario
    FOR INSERT WITH CHECK (
        group_id = (SELECT group_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "group_update_calendario" ON eventi_calendario
    FOR UPDATE USING (
        group_id = (SELECT group_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "group_delete_calendario" ON eventi_calendario
    FOR DELETE USING (
        group_id = (SELECT group_id FROM users WHERE id = auth.uid())
    );

-- Dual branche for membri: add branche_secondarie column
ALTER TABLE membri ADD COLUMN IF NOT EXISTS branche_secondarie TEXT[] DEFAULT '{}';
