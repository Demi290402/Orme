-- Script SQL per aggiornare le coordinate dei luoghi esistenti su Supabase
-- Esegui questo script nel tuo SQL Editor di Supabase per popolare la mappa!

UPDATE locations SET coordinates = '{"lat": 40.7583, "lng": 17.3375}' WHERE name = 'Masseria Odegitria';
UPDATE locations SET coordinates = '{"lat": 40.9167, "lng": 15.6167}' WHERE name = 'Base scout Monticchio';
UPDATE locations SET coordinates = '{"lat": 40.7833, "lng": 17.2333}' WHERE name = 'Base scout Alberobello';
UPDATE locations SET coordinates = '{"lat": 41.5167, "lng": 13.9167}' WHERE name = 'Valle Rotonda';
UPDATE locations SET coordinates = '{"lat": 45.7944, "lng": 8.3694}' WHERE name = 'Rifugio Madonna del Sasso';
UPDATE locations SET coordinates = '{"lat": 39.0250, "lng": 16.3500}' WHERE name = 'Comunità di Miceli';
UPDATE locations SET coordinates = '{"lat": 46.1333, "lng": 12.2167}' WHERE name = 'Casa Nazareth';
UPDATE locations SET coordinates = '{"lat": 40.7389, "lng": 14.6722}' WHERE name = 'Mater Domini';
UPDATE locations SET coordinates = '{"lat": 41.1611, "lng": 15.3306}' WHERE name = 'Bosco Paduli';
UPDATE locations SET coordinates = '{"lat": 40.8333, "lng": 17.3667}' WHERE name = 'Masseria Minoia';

-- Assegna coordinate di default temporanee a Roma per tutti gli altri luoghi privi di coordinate
UPDATE locations SET coordinates = '{"lat": 41.9028, "lng": 12.4964}' WHERE coordinates IS NULL;
