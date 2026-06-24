-- Aggiornamento tabella servizi_trasporto: aggiunta campi chilometraggio (km) e numero persone (numero_persone)
ALTER TABLE servizi_trasporto ADD COLUMN IF NOT EXISTS km NUMERIC;
ALTER TABLE servizi_trasporto ADD COLUMN IF NOT EXISTS numero_persone INTEGER;
