-- ==========================================================
-- AGGIORNAMENTO DATABASE ORME: TABELLA LISTA D'ATTESA
-- Copia e incolla questo script nell'editor SQL di Supabase
-- ==========================================================

CREATE TABLE IF NOT EXISTS lista_attesa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id TEXT NOT NULL,
    nome_genitore TEXT NOT NULL,
    telefono_genitore TEXT NOT NULL,
    nome_ragazzo TEXT NOT NULL,
    cognome_ragazzo TEXT NOT NULL,
    data_nascita DATE NOT NULL,
    classe TEXT NOT NULL,
    data_iscrizione DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    stato TEXT NOT NULL DEFAULT 'In attesa', -- 'In attesa', 'Accettato', 'Rifiutato'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS
ALTER TABLE lista_attesa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Group isolation on lista_attesa" ON lista_attesa;
CREATE POLICY "Group isolation on lista_attesa" ON lista_attesa
    FOR ALL USING (group_id = (SELECT group_id FROM users WHERE id = auth.uid()));

-- Consentiamo l'inserimento pubblico per il form dei genitori (senza auth)
-- In questo modo chiunque può inserire un record, purché indichi un group_id valido
DROP POLICY IF EXISTS "Public insert on lista_attesa" ON lista_attesa;
CREATE POLICY "Public insert on lista_attesa" ON lista_attesa
    FOR INSERT WITH CHECK (true);
