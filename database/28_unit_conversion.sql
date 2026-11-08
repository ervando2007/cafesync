-- Unit conversion for recipes: a recipe line may use any unit in the same
-- group as its stock item's unit (e.g. 18 GR of an ingredient stocked in KG).
-- base_conversion = how many base units (GR for MASS, ML for VOLUME) one unit is.
-- Units with a NULL group (PCS, CUP, PACK) only convert to themselves.
ALTER TABLE units ADD COLUMN unit_group VARCHAR(10) NULL AFTER name;

UPDATE units SET unit_group = 'MASS',   base_conversion = 1    WHERE code = 'GR';
UPDATE units SET unit_group = 'MASS',   base_conversion = 1000 WHERE code = 'KG';
UPDATE units SET unit_group = 'VOLUME', base_conversion = 1    WHERE code = 'ML';
UPDATE units SET unit_group = 'VOLUME', base_conversion = 1000 WHERE code = 'LTR';
UPDATE units SET unit_group = NULL,     base_conversion = 1    WHERE code IN ('PCS', 'CUP', 'PACK');
