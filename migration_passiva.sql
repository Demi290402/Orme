-- Eseguire questa migrazione in Supabase -> SQL Editor per aggiungere 
-- i contatori passivi e la tabella Bacheca Annunci e Storico Attività.

-- 1. Aggiungere le nuove colonne dei contatori alla tabella 'users'
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS verbali_read INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locations_searched INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS eventi_aggiunti INTEGER DEFAULT 0;

-- 2. Creare la tabella per la Bacheca Annunci
CREATE TABLE IF NOT EXISTS annunci (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id TEXT NOT NULL,
    autore_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    testo TEXT NOT NULL,
    priorita TEXT DEFAULT 'normale', -- 'info', 'importante', 'urgente'
    scadenza DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policy per la tabella 'annunci' (chiusi per gruppo)
ALTER TABLE annunci ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_select_annunci" ON annunci
    FOR SELECT USING (group_id = (SELECT group_id FROM users WHERE id = auth.uid()));

CREATE POLICY "group_insert_annunci" ON annunci
    FOR INSERT WITH CHECK (group_id = (SELECT group_id FROM users WHERE id = auth.uid()));

CREATE POLICY "group_update_annunci" ON annunci
    FOR UPDATE USING (group_id = (SELECT group_id FROM users WHERE id = auth.uid()));

CREATE POLICY "group_delete_annunci" ON annunci
    FOR DELETE USING (group_id = (SELECT group_id FROM users WHERE id = auth.uid()));


-- 3. Aggiungere un nuovo type di notifica ('annuncio') se non gestito automaticamente in supabase come TEXT. (Nel codice è testuale, non serve SQL).
