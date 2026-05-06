-- Eseguire questa migrazione in Supabase -> SQL Editor per aggiungere 
-- la tabella dello Storico Attività al database.

CREATE TABLE IF NOT EXISTS storico_eventi (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id TEXT NOT NULL,
    anno_scout INTEGER NOT NULL,
    branca TEXT NOT NULL,
    tipo_evento TEXT NOT NULL,
    luogo_nome TEXT NOT NULL,
    data_inizio DATE NOT NULL,
    data_fine DATE,
    autore_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE storico_eventi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_select_storico" ON storico_eventi
    FOR SELECT USING (group_id = (SELECT group_id FROM users WHERE id = auth.uid()));

CREATE POLICY "group_insert_storico" ON storico_eventi
    FOR INSERT WITH CHECK (group_id = (SELECT group_id FROM users WHERE id = auth.uid()));

CREATE POLICY "group_update_storico" ON storico_eventi
    FOR UPDATE USING (group_id = (SELECT group_id FROM users WHERE id = auth.uid()));

CREATE POLICY "group_delete_storico" ON storico_eventi
    FOR DELETE USING (group_id = (SELECT group_id FROM users WHERE id = auth.uid()));
