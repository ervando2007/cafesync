-- BSD City (outlet code 'BSD') was created via the Outlets master data page with
-- no products or dining tables assigned yet — there is no UI for that assignment
-- step, so seed it here the same way CP01/PIK01 were seeded in 04_seed_master_data.sql.

INSERT INTO outlet_products (outlet_id, product_id, selling_price, tax_rate, is_available)
SELECT o.id, op.product_id, op.selling_price, op.tax_rate, op.is_available
FROM outlet_products op
JOIN outlets o ON o.code = 'BSD'
WHERE op.outlet_id = (SELECT id FROM outlets WHERE code = 'CP01');

INSERT INTO dining_tables (outlet_id, code, name, status)
SELECT o.id, t.code, t.name, 'AVAILABLE'
FROM (
  SELECT 'T01' AS code, 'Table 01' AS name UNION ALL
  SELECT 'T02', 'Table 02' UNION ALL
  SELECT 'T03', 'Table 03' UNION ALL
  SELECT 'T04', 'Table 04' UNION ALL
  SELECT 'T05', 'Table 05' UNION ALL
  SELECT 'T06', 'Table 06'
) t
JOIN outlets o ON o.code = 'BSD';
