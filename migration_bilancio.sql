-- ==========================================================
-- MIGRATION: Gestione Bilancio & Cybersecurity Enhancements
-- Copia e incolla questo script nell'editor SQL di Supabase
-- ==========================================================

-- 1. Helper Function di Sicurezza per prevenire la ricorsione RLS
-- Esegue la query con privilegi SECURITY DEFINER (eludendo momentaneamente la RLS per leggere la tabella users)
CREATE OR REPLACE FUNCTION get_my_group_id()
RETURNS TEXT SECURITY DEFINER AS $$
    SELECT group_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql;

-- 2. Creazione Tabella Bilancio
CREATE TABLE IF NOT EXISTS bilancio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id TEXT NOT NULL,                          -- multi-tenancy: id del gruppo scout
    titolo TEXT NOT NULL,                            -- descrizione del movimento (es: "Corda reparto", "Quota campo")
    importo NUMERIC(10,2) NOT NULL,                  -- importo monetario (es: 15.50)
    tipo TEXT NOT NULL CHECK (tipo IN ('entrata', 'uscita')),
    branca TEXT NOT NULL CHECK (branca IN ('L/C', 'E/G', 'R/S', 'Gruppo', 'CoCa')),
    categoria TEXT DEFAULT 'Altro',                  -- categoria di spesa/entrata (es: 'Attrezzatura', 'Trasporti')
    data DATE NOT NULL DEFAULT CURRENT_DATE,         -- data dell'operazione
    note TEXT,                                       -- note aggiuntive opzionali
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL, -- autore del movimento
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Abilitazione RLS per la tabella bilancio
ALTER TABLE bilancio ENABLE ROW LEVEL SECURITY;

-- 4. Creazione Policy di Sicurezza RLS per isolamento gruppo
DROP POLICY IF EXISTS "group_select_bilancio" ON bilancio;
CREATE POLICY "group_select_bilancio" ON bilancio
    FOR SELECT USING (group_id = get_my_group_id());

DROP POLICY IF EXISTS "group_insert_bilancio" ON bilancio;
CREATE POLICY "group_insert_bilancio" ON bilancio
    FOR INSERT WITH CHECK (group_id = get_my_group_id());

DROP POLICY IF EXISTS "group_update_bilancio" ON bilancio;
CREATE POLICY "group_update_bilancio" ON bilancio
    FOR UPDATE USING (group_id = get_my_group_id());

DROP POLICY IF EXISTS "group_delete_bilancio" ON bilancio;
CREATE POLICY "group_delete_bilancio" ON bilancio
    FOR DELETE USING (group_id = get_my_group_id());


-- ==========================================================
-- ESEMPI E RACCOMANDAZIONI DI SICUREZZA PER ALTRE TABELLE (FACOLTATIVE MA CONSIGLIATE)
-- Puoi scommentare ed eseguire queste query per proteggere le altre tabelle usando l'helper sicuro get_my_group_id()
-- ==========================================================

-- -- A. RLS per la tabella 'users' (Evita ricorsioni e garantisce isolamento gruppo)
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- 
-- DROP POLICY IF EXISTS "Users can read profiles of the same group" ON public.users;
-- CREATE POLICY "Users can read profiles of the same group" ON public.users
--     FOR SELECT USING (group_id = get_my_group_id());
-- 
-- DROP POLICY IF EXISTS "Users can update only their own profile" ON public.users;
-- CREATE POLICY "Users can update only their own profile" ON public.users
--     FOR UPDATE USING (id = auth.uid());
-- 
-- DROP POLICY IF EXISTS "Users can delete only their own profile" ON public.users;
-- CREATE POLICY "Users can delete only their own profile" ON public.users
--     FOR DELETE USING (id = auth.uid());


-- -- B. RLS per la tabella 'verbali' (Isolamento completo CoCa)
-- ALTER TABLE public.verbali ENABLE ROW LEVEL SECURITY;
-- 
-- DROP POLICY IF EXISTS "Group isolation on verbali" ON public.verbali;
-- CREATE POLICY "Group isolation on verbali" ON public.verbali
--     FOR ALL USING (group_id = get_my_group_id());


-- -- C. RLS per la tabella 'membri'
-- ALTER TABLE public.membri ENABLE ROW LEVEL SECURITY;
-- 
-- DROP POLICY IF EXISTS "Group isolation on membri" ON public.membri;
-- CREATE POLICY "Group isolation on membri" ON public.membri
--     FOR ALL USING (group_id = get_my_group_id());
