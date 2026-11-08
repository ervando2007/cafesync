-- Reset stock to zero before the real recipe/ingredient import (approved 2026-11-07).
-- Keeps the stock item master list; removes balances, movement history, recipes
-- and the two test purchase journals that had added stock (so Persediaan = 0 = stock).
START TRANSACTION;

DELETE FROM inventory_movements;
DELETE FROM inventory_stocks;

UPDATE outlet_products SET recipe_id = NULL;
DELETE FROM recipe_items;
DELETE FROM recipes;

DELETE jl FROM journal_lines jl
JOIN journal_entries je ON je.id = jl.journal_entry_id
WHERE je.journal_no IN ('JRN-261107-0001', 'JRN-261107-0002');
DELETE FROM journal_entries WHERE journal_no IN ('JRN-261107-0001', 'JRN-261107-0002');

COMMIT;

ALTER TABLE inventory_movements AUTO_INCREMENT = 1;
ALTER TABLE inventory_stocks AUTO_INCREMENT = 1;
ALTER TABLE recipes AUTO_INCREMENT = 1;
ALTER TABLE recipe_items AUTO_INCREMENT = 1;
