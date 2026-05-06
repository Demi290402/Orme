-- Eseguire questa migrazione in Supabase -> SQL Editor per aggiungere 
-- i contatori passivi per la Gamification e lo Storico Attività.

-- 1. Aggiungere le nuove colonne dei contatori alla tabella 'users'
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS verbali_read INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locations_searched INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS eventi_aggiunti INTEGER DEFAULT 0;
