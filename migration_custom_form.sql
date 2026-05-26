-- ==========================================================
-- AGGIORNAMENTO DATABASE ORME: TABELLA IMPOSTAZIONI ISCRIZIONE
-- Copia e incolla questo script nell'editor SQL di Supabase
-- ==========================================================

CREATE TABLE IF NOT EXISTS impostazioni_iscrizione (
    group_id TEXT PRIMARY KEY,
    form_title TEXT NOT NULL DEFAULT 'Modulo richiesta inserimento negli scout',
    welcome_title TEXT NOT NULL DEFAULT '🎉 Benvenuti nel grande gioco dello scoutismo! 🌲⛺',
    description_text TEXT NOT NULL DEFAULT 'Ciao! Siamo felici che tu stia pensando di far vivere a tuo/a figlio/a l’avventura più bella di tutte: quella scout! 🐾

Compilando questo modulo ci aiuterai a raccogliere le informazioni necessarie per organizzare al meglio le iscrizioni e per conoscerci un po’ prima di iniziare il cammino insieme.

Lo scoutismo è un mondo fatto di amicizia, natura, sorrisi e crescita personale — e non vediamo l’ora di accogliervi nella nostra grande famiglia! 💚✨',
    footer_text TEXT NOT NULL DEFAULT 'Pronti a partire?
👉 Compila il modulo e... Buona Caccia! 🦊',
    banner_url TEXT NOT NULL DEFAULT '/scout_banner.png',
    success_title TEXT NOT NULL DEFAULT 'Iscrizione Ricevuta!',
    success_message TEXT NOT NULL DEFAULT 'Grazie per aver espresso la volontà di iscrivere {nomeRagazzo} {cognomeRagazzo} nel gruppo {groupName}.',
    disclaimer_text TEXT NOT NULL DEFAULT 'Inviando questo modulo, acconsenti al trattamento dei dati personali forniti al fine di gestire l''inserimento del minore nella lista d''attesa del gruppo scout indicato, in conformità con le policy di privacy vigenti.',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS
ALTER TABLE impostazioni_iscrizione ENABLE ROW LEVEL SECURITY;

-- Consentiamo a chiunque (pubblico) di leggere le impostazioni per caricare il form
DROP POLICY IF EXISTS "Anyone can read impostazioni_iscrizione" ON impostazioni_iscrizione;
CREATE POLICY "Anyone can read impostazioni_iscrizione" ON impostazioni_iscrizione
    FOR SELECT USING (true);

-- Consentiamo ai capi del rispettivo gruppo di fare qualsiasi operazione (insert, update, delete)
DROP POLICY IF EXISTS "Group isolation on impostazioni_iscrizione" ON impostazioni_iscrizione;
CREATE POLICY "Group isolation on impostazioni_iscrizione" ON impostazioni_iscrizione
    FOR ALL USING (group_id = (SELECT group_id FROM users WHERE id = auth.uid()));
