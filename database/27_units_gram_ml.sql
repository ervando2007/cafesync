-- Stock is now tracked in the same units the recipes use (gram / ml / pcs),
-- so a recipe's "18 g espresso" deducts exactly 18 from a stock kept in GR.
-- No conversion factors: each stock item has one unit, and both purchases
-- (journal qty) and recipe lines are entered in that unit.
INSERT INTO units (code, name, base_conversion)
SELECT 'GR', 'Gram', 1 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM units WHERE code = 'GR');

INSERT INTO units (code, name, base_conversion)
SELECT 'ML', 'Mililiter', 1 FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM units WHERE code = 'ML');
