-- ==========================================================
-- AGGIORNAMENTO DATABASE ORME: FIX POLICY RLS IMPOSTAZIONI ISCRIZIONE
-- Copia e incolla questo script nell'editor SQL di Supabase per
-- risolvere problemi di autorizzazione durante il salvataggio.
-- ==========================================================

-- 1. Verifica che la tabella esista con i tipi corretti
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

-- 2. Abilitazione RLS
ALTER TABLE impostazioni_iscrizione ENABLE ROW LEVEL SECURITY;

-- 3. Rimuovi le vecchie policy per evitare conflitti o accumuli
DROP POLICY IF EXISTS "Anyone can read impostazioni_iscrizione" ON impostazioni_iscrizione;
DROP POLICY IF EXISTS "Group isolation on impostazioni_iscrizione" ON impostazioni_iscrizione;
DROP POLICY IF EXISTS "Capi insert impostazioni_iscrizione" ON impostazioni_iscrizione;
DROP POLICY IF EXISTS "Capi update impostazioni_iscrizione" ON impostazioni_iscrizione;
DROP POLICY IF EXISTS "Capi delete impostazioni_iscrizione" ON impostazioni_iscrizione;

-- 4. Creazione Policy esplicite
-- Lettura pubblica (permetti a chiunque di compilare il form dal link esterno)
CREATE POLICY "Anyone can read impostazioni_iscrizione" ON impostazioni_iscrizione
    FOR SELECT USING (true);

-- Inserimento per i capi dello stesso gruppo (autenticati)
CREATE POLICY "Capi insert impostazioni_iscrizione" ON impostazioni_iscrizione
    FOR INSERT TO authenticated
    WITH CHECK (group_id = (SELECT group_id FROM users WHERE id = auth.uid()));

-- Aggiornamento per i capi dello stesso gruppo (autenticati)
CREATE POLICY "Capi update impostazioni_iscrizione" ON impostazioni_iscrizione
    FOR UPDATE TO authenticated
    USING (group_id = (SELECT group_id FROM users WHERE id = auth.uid()))
    WITH CHECK (group_id = (SELECT group_id FROM users WHERE id = auth.uid()));

-- Cancellazione per i capi dello stesso gruppo (autenticati)
CREATE POLICY "Capi delete impostazioni_iscrizione" ON impostazioni_iscrizione
    FOR DELETE TO authenticated
    USING (group_id = (SELECT group_id FROM users WHERE id = auth.uid()));
