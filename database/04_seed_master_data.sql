USE cafe_management;

INSERT INTO units (code, name, base_conversion) VALUES
  ('CUP', 'Cup', 1),
  ('PCS', 'Pcs', 1);

INSERT INTO categories (name, status) VALUES
  ('Coffee', 'ACTIVE'),
  ('Non Coffee', 'ACTIVE'),
  ('Food', 'ACTIVE'),
  ('Pastry', 'ACTIVE');

INSERT INTO outlets (code, name, address, timezone, status) VALUES
  ('CP01', 'Central Park', 'Jl. Letjen S. Parman, Jakarta Barat', 'Asia/Jakarta', 'ACTIVE'),
  ('PIK01', 'Pantai Indah Kapuk', 'Jl. Marina Raya, Jakarta Utara', 'Asia/Jakarta', 'ACTIVE');

INSERT INTO products (sku, name, category_id, product_type, base_unit_id, status)
SELECT 'BEV-CARMAC', 'Caramel Macchiato', c.id, 'BEVERAGE', u.id, 'ACTIVE' FROM categories c, units u WHERE c.name = 'Coffee' AND u.code = 'CUP'
UNION ALL
SELECT 'BEV-CAPPU', 'Cappuccino', c.id, 'BEVERAGE', u.id, 'ACTIVE' FROM categories c, units u WHERE c.name = 'Coffee' AND u.code = 'CUP'
UNION ALL
SELECT 'BEV-ESPR', 'Espresso', c.id, 'BEVERAGE', u.id, 'ACTIVE' FROM categories c, units u WHERE c.name = 'Coffee' AND u.code = 'CUP'
UNION ALL
SELECT 'BEV-ICELAT', 'Iced Latte', c.id, 'BEVERAGE', u.id, 'ACTIVE' FROM categories c, units u WHERE c.name = 'Coffee' AND u.code = 'CUP'
UNION ALL
SELECT 'BEV-MATLAT', 'Matcha Latte', c.id, 'BEVERAGE', u.id, 'ACTIVE' FROM categories c, units u WHERE c.name = 'Non Coffee' AND u.code = 'CUP'
UNION ALL
SELECT 'BEV-CHOFRA', 'Chocolate Frappe', c.id, 'BEVERAGE', u.id, 'ACTIVE' FROM categories c, units u WHERE c.name = 'Non Coffee' AND u.code = 'CUP'
UNION ALL
SELECT 'FOD-CHISAN', 'Chicken Sandwich', c.id, 'FOOD', u.id, 'ACTIVE' FROM categories c, units u WHERE c.name = 'Food' AND u.code = 'PCS'
UNION ALL
SELECT 'FOD-BEEBUR', 'Beef Burger', c.id, 'FOOD', u.id, 'ACTIVE' FROM categories c, units u WHERE c.name = 'Food' AND u.code = 'PCS'
UNION ALL
SELECT 'PAS-CHOCRO', 'Chocolate Croissant', c.id, 'FOOD', u.id, 'ACTIVE' FROM categories c, units u WHERE c.name = 'Pastry' AND u.code = 'PCS'
UNION ALL
SELECT 'PAS-BLUMUF', 'Blueberry Muffin', c.id, 'FOOD', u.id, 'ACTIVE' FROM categories c, units u WHERE c.name = 'Pastry' AND u.code = 'PCS';

INSERT INTO outlet_products (outlet_id, product_id, selling_price, tax_rate, is_available)
SELECT o.id, p.id, prices.price, 0.10, 1
FROM outlets o
JOIN (
  SELECT 'BEV-CARMAC' sku, 42000 price UNION ALL
  SELECT 'BEV-CAPPU', 35000 UNION ALL
  SELECT 'BEV-ESPR', 28000 UNION ALL
  SELECT 'BEV-ICELAT', 38000 UNION ALL
  SELECT 'BEV-MATLAT', 40000 UNION ALL
  SELECT 'BEV-CHOFRA', 41000 UNION ALL
  SELECT 'FOD-CHISAN', 45000 UNION ALL
  SELECT 'FOD-BEEBUR', 48000 UNION ALL
  SELECT 'PAS-CHOCRO', 32000 UNION ALL
  SELECT 'PAS-BLUMUF', 30000
) prices ON TRUE
JOIN products p ON p.sku = prices.sku
WHERE o.code IN ('CP01', 'PIK01');

INSERT INTO dining_tables (outlet_id, code, name, capacity, status, qr_token)
SELECT o.id, t.code, t.name, t.capacity, 'AVAILABLE', CONCAT(o.code, '-', t.code, '-', SUBSTRING(MD5(RAND()), 1, 8))
FROM outlets o
JOIN (
  SELECT 'T01' code, 'Table 01' name, 2 capacity UNION ALL
  SELECT 'T02', 'Table 02', 2 UNION ALL
  SELECT 'T03', 'Table 03', 4 UNION ALL
  SELECT 'T04', 'Table 04', 4 UNION ALL
  SELECT 'T05', 'Table 05', 6 UNION ALL
  SELECT 'T06', 'Table 06', 2
) t ON TRUE
WHERE o.code IN ('CP01', 'PIK01');

INSERT INTO user_outlets (user_id, outlet_id, is_default)
SELECT u.id, o.id, o.code = 'CP01'
FROM users u
JOIN outlets o ON o.code IN ('CP01', 'PIK01')
WHERE u.email = 'admin@cafesync.local';

INSERT INTO user_outlets (user_id, outlet_id, is_default)
SELECT u.id, o.id, 1
FROM users u
JOIN outlets o ON o.code = 'CP01'
WHERE u.email = 'cashier@cafesync.local';
