-- Script SQL per aggiornare le coordinate precise dei luoghi scout
-- Esegui questo script nel tuo SQL Editor di Supabase.

-- Luogo: "Masseria Odegitria" (OSM Nome+Comune)
UPDATE locations SET coordinates = '{"lat": 40.851528, "lng": 16.788266}' WHERE id = '5f914b05-c1d9-4a22-a2d2-51853dd089a7';
-- Luogo: "Base scout Monticchio" (OSM Fallback Comune)
UPDATE locations SET coordinates = '{"lat": 40.926188, "lng": 15.669441}' WHERE id = 'b5d3b04e-ee0e-4f9d-950e-d293d697a07d';
-- Luogo: "Valle Rotonda" (OSM Fallback Comune)
UPDATE locations SET coordinates = '{"lat": 41.610209, "lng": 13.224731}' WHERE id = '7ae03603-4899-4aae-a0f3-bad37598cc9d';
-- Luogo: "Masseria Minoia" (OSM Fallback Comune)
UPDATE locations SET coordinates = '{"lat": 40.968514, "lng": 17.115044}' WHERE id = '1ea12df9-16c4-4770-89c3-98b1afceff57';
-- Luogo: "Masseria Salecchia" (OSM Fallback Comune)
UPDATE locations SET coordinates = '{"lat": 41.249926, "lng": 15.341249}' WHERE id = '4aba08d7-3421-4b5b-b695-166c62102dee';
-- Luogo: "Base scout Potenza 2" (OSM Indirizzo)
UPDATE locations SET coordinates = '{"lat": 40.634214, "lng": 15.800826}' WHERE id = 'cd1a49fc-080b-4073-ba00-2ec72f34978f';
-- Luogo: "Eremo di Sant'Antonio Abate" (OSM Nome+Comune)
UPDATE locations SET coordinates = '{"lat": 40.865565, "lng": 17.296007}' WHERE id = '0d0f7e06-bf48-4a07-9a11-a2bc207ddd79';
-- Luogo: "Masseria Capone" (OSM Nome+Comune)
UPDATE locations SET coordinates = '{"lat": 40.853621, "lng": 17.018087}' WHERE id = '05bed261-0759-4939-857f-deab102e8530';
-- Luogo: "Casa San Francesco alla Verna" (OSM Fallback Comune)
UPDATE locations SET coordinates = '{"lat": 39.249833, "lng": 16.511048}' WHERE id = '019be1a0-14fb-4a49-9eab-92d9ef4543e8';
-- Luogo: "Base Scout Don Dante Casorelli" (OSM Simplified Place Name)
UPDATE locations SET coordinates = '{"lat": 41.404288, "lng": 14.437173}' WHERE id = '62160f7c-1efd-4e38-ade5-cf07d0c6433d';
-- Luogo: "Base scout Alberobello" (OSM Fallback Comune)
UPDATE locations SET coordinates = '{"lat": 40.784124, "lng": 17.237703}' WHERE id = '690a0b2f-d1ee-446a-ab76-23584130498d';
-- Luogo: "Rifugio Madonna del Sasso" (OSM Fallback Comune)
UPDATE locations SET coordinates = '{"lat": 40.488266, "lng": 15.677963}' WHERE id = '039c682f-49af-4b33-8df3-1c5e9bf2772f';
-- Luogo: "Base Scout Sant'Egidio" (URL query/place coordinates)
UPDATE locations SET coordinates = '{"lat": 41.750833, "lng": 15.794167}' WHERE id = 'cbd867c2-c72e-40ab-a2c2-d808ed999fb6';
-- Luogo: "Base Scout Domus Pasano (Sava 2)" (URL coordinates)
UPDATE locations SET coordinates = '{"lat": 40.388244, "lng": 17.513870}' WHERE id = '7b48f344-5e69-4a7f-9d8a-a03ae47cb3c5';
-- Luogo: "Villaggio del Fanciullo (Martina Franca)" (URL coordinates)
UPDATE locations SET coordinates = '{"lat": 40.714069, "lng": 17.334183}' WHERE id = '9fe28f78-2a10-45dd-b2ab-73161075d82f';
-- Luogo: "Base Scout Don Angelo Lombardi" (URL coordinates)
UPDATE locations SET coordinates = '{"lat": 41.720928, "lng": 15.661196}' WHERE id = 'df47a9f0-640d-494a-a56a-a480625db044';