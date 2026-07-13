-- Migration to add disabled accessibility flag to locations table
ALTER TABLE locations ADD COLUMN IF NOT EXISTS has_disabled_access BOOLEAN DEFAULT false;
