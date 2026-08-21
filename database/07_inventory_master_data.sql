USE cafe_management;

CREATE TABLE suppliers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  contact_person VARCHAR(150),
  phone VARCHAR(30),
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE'
);

INSERT INTO suppliers (name, contact_person, phone, status) VALUES
  ('PT. Sumber Rasa Abadi', 'Budi Hartono', '021-5550101', 'ACTIVE'),
  ('CV. Dairy Fresh Indonesia', 'Sri Wulandari', '021-5550202', 'ACTIVE'),
  ('UD. Kemasan Jaya', 'Andi Saputra', '021-5550303', 'ACTIVE');

INSERT INTO units (code, name, base_conversion) VALUES
  ('KG', 'Kilogram', 1),
  ('LTR', 'Liter', 1),
  ('PACK', 'Pack', 1);

INSERT INTO stock_items (sku, name, unit_id, item_type, reorder_level, status)
SELECT 'RM-COF-001', 'Arabica Coffee Beans', u.id, 'RAW_MATERIAL', 5, 'ACTIVE' FROM units u WHERE u.code = 'KG'
UNION ALL
SELECT 'RM-MIL-002', 'Fresh Milk', u.id, 'RAW_MATERIAL', 10, 'ACTIVE' FROM units u WHERE u.code = 'LTR'
UNION ALL
SELECT 'RM-CHO-003', 'Chocolate Powder', u.id, 'RAW_MATERIAL', 3, 'ACTIVE' FROM units u WHERE u.code = 'KG'
UNION ALL
SELECT 'ING-SYR-004', 'Caramel Syrup', u.id, 'RAW_MATERIAL', 2, 'ACTIVE' FROM units u WHERE u.code = 'LTR'
UNION ALL
SELECT 'ING-MAT-005', 'Matcha Powder', u.id, 'RAW_MATERIAL', 1, 'ACTIVE' FROM units u WHERE u.code = 'KG'
UNION ALL
SELECT 'RM-CHK-006', 'Chicken Breast', u.id, 'RAW_MATERIAL', 4, 'ACTIVE' FROM units u WHERE u.code = 'KG'
UNION ALL
SELECT 'RM-CHS-007', 'Cheddar Cheese', u.id, 'RAW_MATERIAL', 3, 'ACTIVE' FROM units u WHERE u.code = 'KG'
UNION ALL
SELECT 'RM-SGR-008', 'Brown Sugar', u.id, 'RAW_MATERIAL', 5, 'ACTIVE' FROM units u WHERE u.code = 'KG'
UNION ALL
SELECT 'PKG-CUP-009', 'Paper Cup 12oz', u.id, 'PACKAGING', 20, 'ACTIVE' FROM units u WHERE u.code = 'PACK'
UNION ALL
SELECT 'PKG-CUP-010', 'Paper Cup 8oz', u.id, 'PACKAGING', 20, 'ACTIVE' FROM units u WHERE u.code = 'PACK'
UNION ALL
SELECT 'PKG-BAG-011', 'Paper Bag', u.id, 'PACKAGING', 15, 'ACTIVE' FROM units u WHERE u.code = 'PACK'
UNION ALL
SELECT 'RM-FLR-012', 'Wheat Flour', u.id, 'RAW_MATERIAL', 5, 'ACTIVE' FROM units u WHERE u.code = 'KG';

INSERT INTO inventory_stocks (outlet_id, stock_item_id, qty_on_hand, avg_cost)
SELECT o.id, si.id, seed.qty, seed.cost
FROM outlets o
JOIN (
  SELECT 'RM-COF-001' sku, 18.5 qty, 120000 cost UNION ALL
  SELECT 'RM-MIL-002', 24.0, 18000 UNION ALL
  SELECT 'RM-CHO-003', 7.0, 45000 UNION ALL
  SELECT 'ING-SYR-004', 3.0, 55000 UNION ALL
  SELECT 'ING-MAT-005', 0.8, 180000 UNION ALL
  SELECT 'RM-CHK-006', 5.2, 65000 UNION ALL
  SELECT 'RM-CHS-007', 11.0, 38000 UNION ALL
  SELECT 'RM-SGR-008', 9.75, 20000 UNION ALL
  SELECT 'PKG-CUP-009', 0, 22000 UNION ALL
  SELECT 'PKG-CUP-010', 35, 17000 UNION ALL
  SELECT 'PKG-BAG-011', 40, 3500 UNION ALL
  SELECT 'RM-FLR-012', 12, 15000
) seed ON TRUE
JOIN stock_items si ON si.sku = seed.sku
WHERE o.code IN ('CP01', 'PIK01');
