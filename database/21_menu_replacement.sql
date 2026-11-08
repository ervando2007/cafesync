-- Replaces the 10 placeholder seed products with the real menu (136 items, 13 categories),
-- uploaded 2026-09-12 as a photo of the owner's menu spreadsheet (Full Menu Name / Menu
-- Short Name / Category Detail / Bill of Material columns). Old products are deactivated,
-- not deleted, since real order_items/recipes already reference their ids. Selling prices
-- are intentionally 0 (not in the source sheet) pending manual entry per outlet. Only the
-- clearly-legible top portion of a much longer, partly illegible image was transcribed;
-- the lower ~half (a second, "(BSD)"-suffixed category scheme, likely the BSD outlet's own
-- menu) was too degraded to read reliably and was deliberately left out rather than guessed.
-- Already applied directly against the dev database; kept here as the durable record.

START TRANSACTION;

-- 1. Deactivate the previous placeholder menu (soft-delete: real order_items/recipes reference these ids)
UPDATE products SET status = 'INACTIVE' WHERE status = 'ACTIVE';

-- 2. New categories matching the uploaded menu structure
INSERT INTO categories (name, status) SELECT 'Coffee Based', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Coffee Based');
INSERT INTO categories (name, status) SELECT 'Manual Brew', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Manual Brew');
INSERT INTO categories (name, status) SELECT 'No Coffee', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'No Coffee');
INSERT INTO categories (name, status) SELECT 'Tea Base', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Tea Base');
INSERT INTO categories (name, status) SELECT 'Refreshing Drink', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Refreshing Drink');
INSERT INTO categories (name, status) SELECT 'Snack', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Snack');
INSERT INTO categories (name, status) SELECT 'Rice', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Rice');
INSERT INTO categories (name, status) SELECT 'Noodle', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Noodle');
INSERT INTO categories (name, status) SELECT 'Steak', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Steak');
INSERT INTO categories (name, status) SELECT 'Pasta', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Pasta');
INSERT INTO categories (name, status) SELECT 'Pastry', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Pastry');
INSERT INTO categories (name, status) SELECT 'Toast', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Toast');
INSERT INTO categories (name, status) SELECT 'Additional', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Additional');

-- 3. New products (SKU auto-generated: <TYPE>-##### sequential)
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00001', 'Buss Iced Kopi Susu Boba', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00002', 'Avocado Coffee', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00003', 'Piccolo', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00004', 'Black Lemonade', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00005', 'Cappuccino', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00006', 'Black Bombom', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00007', 'Ristretto', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00008', 'Butterscotch Ristretto', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00009', 'Salted Caramel Coffee', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00010', 'Salted Caramel Latte', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00011', 'Caramel', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00012', 'Vanilla Latte', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00013', 'V60', NULL, (SELECT id FROM categories WHERE name = 'Manual Brew'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00014', 'Tubruk', NULL, (SELECT id FROM categories WHERE name = 'Manual Brew'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00015', 'Japanese', NULL, (SELECT id FROM categories WHERE name = 'Manual Brew'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00016', 'Chocolate', NULL, (SELECT id FROM categories WHERE name = 'No Coffee'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00017', 'Ice Choco Mint', NULL, (SELECT id FROM categories WHERE name = 'No Coffee'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00018', 'Red Velvet', NULL, (SELECT id FROM categories WHERE name = 'No Coffee'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00019', 'Green Tea Latte', NULL, (SELECT id FROM categories WHERE name = 'No Coffee'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00020', 'Ubee', NULL, (SELECT id FROM categories WHERE name = 'No Coffee'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00021', 'Milky Mango', NULL, (SELECT id FROM categories WHERE name = 'No Coffee'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00022', 'Milky Berry', NULL, (SELECT id FROM categories WHERE name = 'No Coffee'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00023', 'Cookies n Cream', NULL, (SELECT id FROM categories WHERE name = 'No Coffee'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00024', 'Chocolate Milkshake', NULL, (SELECT id FROM categories WHERE name = 'No Coffee'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00025', 'Strawberry Milkshake', NULL, (SELECT id FROM categories WHERE name = 'No Coffee'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00026', 'Calamansi Tea', NULL, (SELECT id FROM categories WHERE name = 'Tea Base'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00027', 'Lychee Tea', NULL, (SELECT id FROM categories WHERE name = 'Tea Base'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00028', 'Lemon Tea', NULL, (SELECT id FROM categories WHERE name = 'Tea Base'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00029', 'Aromatiez', NULL, (SELECT id FROM categories WHERE name = 'Tea Base'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00030', 'Teh Tarik Hardi', NULL, (SELECT id FROM categories WHERE name = 'Tea Base'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00031', 'Discovery in Midnight', NULL, (SELECT id FROM categories WHERE name = 'Refreshing Drink'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00032', 'Summer Drink', NULL, (SELECT id FROM categories WHERE name = 'Refreshing Drink'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00033', 'Mango Blast', NULL, (SELECT id FROM categories WHERE name = 'Refreshing Drink'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00034', 'Berry Blast', NULL, (SELECT id FROM categories WHERE name = 'Refreshing Drink'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00035', 'Jack Frost', NULL, (SELECT id FROM categories WHERE name = 'Refreshing Drink'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00001', 'French Fries', NULL, (SELECT id FROM categories WHERE name = 'Snack'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00002', 'Cireng', NULL, (SELECT id FROM categories WHERE name = 'Snack'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00003', 'Pisang Goreng Kampung', NULL, (SELECT id FROM categories WHERE name = 'Snack'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00004', 'Singkong Goreng', NULL, (SELECT id FROM categories WHERE name = 'Snack'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00005', 'Tahu Goreng Isi', NULL, (SELECT id FROM categories WHERE name = 'Snack'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00006', 'Mix Platter', NULL, (SELECT id FROM categories WHERE name = 'Snack'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00007', 'Piscok', NULL, (SELECT id FROM categories WHERE name = 'Snack'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00008', 'Dimsum Mentai', NULL, (SELECT id FROM categories WHERE name = 'Snack'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00009', 'Nasi Goreng Kampung', NULL, (SELECT id FROM categories WHERE name = 'Rice'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00010', 'Nasi Goreng Sei', NULL, (SELECT id FROM categories WHERE name = 'Rice'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00011', 'Curry Chicken Rice', NULL, (SELECT id FROM categories WHERE name = 'Rice'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00012', 'Nanban Chicken', NULL, (SELECT id FROM categories WHERE name = 'Rice'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00013', 'Spicy Korean Chicken', NULL, (SELECT id FROM categories WHERE name = 'Rice'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00014', 'Honey Garlic Chicken', NULL, (SELECT id FROM categories WHERE name = 'Rice'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00015', 'Katsu Curry', NULL, (SELECT id FROM categories WHERE name = 'Rice'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00016', 'Mie Goreng Kampung', NULL, (SELECT id FROM categories WHERE name = 'Noodle'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00017', 'Mie Nyemek', NULL, (SELECT id FROM categories WHERE name = 'Noodle'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00018', 'Crispy Chicken Steak', NULL, (SELECT id FROM categories WHERE name = 'Steak'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00019', 'Grilled Chicken Steak', NULL, (SELECT id FROM categories WHERE name = 'Steak'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00020', 'Aglio Olio', NULL, (SELECT id FROM categories WHERE name = 'Pasta'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00021', 'Alfredo', NULL, (SELECT id FROM categories WHERE name = 'Pasta'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00022', 'Bolognese', NULL, (SELECT id FROM categories WHERE name = 'Pasta'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00023', 'Blueberry Cheese Danish', NULL, (SELECT id FROM categories WHERE name = 'Pastry'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00024', 'Blueberry Pain Au Chocolate', NULL, (SELECT id FROM categories WHERE name = 'Pastry'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00025', 'Butter Croissants', NULL, (SELECT id FROM categories WHERE name = 'Pastry'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00026', 'Cheese Quice', NULL, (SELECT id FROM categories WHERE name = 'Pastry'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00027', 'Cheesecake Danish', NULL, (SELECT id FROM categories WHERE name = 'Pastry'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00028', 'Smoked Beef Quiche', NULL, (SELECT id FROM categories WHERE name = 'Pastry'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00029', 'Crispy Chicken Croissants', NULL, (SELECT id FROM categories WHERE name = 'Pastry'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00030', 'Tuna Mayo Croissants', NULL, (SELECT id FROM categories WHERE name = 'Pastry'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00031', 'Banana Foster With Ice Cream', NULL, (SELECT id FROM categories WHERE name = 'Toast'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00032', 'Matcha Toast', NULL, (SELECT id FROM categories WHERE name = 'Toast'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00033', 'Ubee Toast', NULL, (SELECT id FROM categories WHERE name = 'Toast'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00034', 'Chocolate Toast', NULL, (SELECT id FROM categories WHERE name = 'Toast'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00035', 'Milky Snow Toast', NULL, (SELECT id FROM categories WHERE name = 'Toast'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00036', 'Kopi Susu Hardi Premula', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00037', 'Cinnamon Coffee', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00038', 'Mocaccino', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00039', 'Affogato', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00040', 'Long Black', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00041', 'Magic', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00042', 'Brulee Butterscotch', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00043', 'Lotus Biscoff', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00044', 'Sweet Berry Cream', NULL, (SELECT id FROM categories WHERE name = 'No Coffee'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00045', 'Coco Matcha', NULL, (SELECT id FROM categories WHERE name = 'No Coffee'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00036', 'Hardi Fries', NULL, (SELECT id FROM categories WHERE name = 'Snack'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00037', 'Otak Otak', NULL, (SELECT id FROM categories WHERE name = 'Snack'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00038', 'Mantau Goreng', NULL, (SELECT id FROM categories WHERE name = 'Snack'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00039', 'Parmesan Truffle Fries', NULL, (SELECT id FROM categories WHERE name = 'Snack'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00040', 'Chilipadi', NULL, (SELECT id FROM categories WHERE name = 'Additional'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00041', 'Chicken Mentai', NULL, (SELECT id FROM categories WHERE name = 'Rice'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00042', 'Chicken Teriyaki', NULL, (SELECT id FROM categories WHERE name = 'Rice'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00043', 'Chicken Blackpepper', NULL, (SELECT id FROM categories WHERE name = 'Rice'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00044', 'Salted Egg', NULL, (SELECT id FROM categories WHERE name = 'Rice'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00045', 'Beef Blackpepper', NULL, (SELECT id FROM categories WHERE name = 'Rice'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00046', 'Rootbeer Sei', NULL, (SELECT id FROM categories WHERE name = 'Rice'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00047', 'Java Chicken Hardi', NULL, (SELECT id FROM categories WHERE name = 'Rice'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00046', 'Mineral Water', NULL, (SELECT id FROM categories WHERE name = 'No Coffee'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00048', 'Ice Cream', NULL, (SELECT id FROM categories WHERE name = 'Additional'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00047', 'Extra shot', NULL, (SELECT id FROM categories WHERE name = 'Additional'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00049', 'Nasi Putih', NULL, (SELECT id FROM categories WHERE name = 'Additional'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00050', 'Telur', NULL, (SELECT id FROM categories WHERE name = 'Additional'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00048', 'Oatmilk', NULL, (SELECT id FROM categories WHERE name = 'Additional'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00049', 'Drink Come True', NULL, (SELECT id FROM categories WHERE name = 'Refreshing Drink'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00050', 'La Vie An Rose', NULL, (SELECT id FROM categories WHERE name = 'Refreshing Drink'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00051', 'Pinkie Pop', NULL, (SELECT id FROM categories WHERE name = 'Refreshing Drink'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00052', 'Kopi 1 Liter', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00051', 'Ice cream 1 scoop', NULL, (SELECT id FROM categories WHERE name = 'Additional'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00053', 'Kopi Susu Botol', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00054', 'Ice Tea', NULL, (SELECT id FROM categories WHERE name = 'Tea Base'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00052', 'Beef Mozza', NULL, (SELECT id FROM categories WHERE name = 'Rice'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00053', 'Pain Raisin', NULL, (SELECT id FROM categories WHERE name = 'Pastry'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00054', 'Salt Bread Premium', NULL, (SELECT id FROM categories WHERE name = 'Pastry'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00055', 'Bundling Product', NULL, (SELECT id FROM categories WHERE name = 'Snack'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00055', 'Vietnam Drip', NULL, (SELECT id FROM categories WHERE name = 'Manual Brew'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00056', 'fried dumpling', NULL, (SELECT id FROM categories WHERE name = 'Snack'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00057', 'dumpling soup', NULL, (SELECT id FROM categories WHERE name = 'Snack'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00058', 'dimsum goreng krewel', NULL, (SELECT id FROM categories WHERE name = 'Snack'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00059', 'uli goreng', NULL, (SELECT id FROM categories WHERE name = 'Snack'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00060', 'chick pop', NULL, (SELECT id FROM categories WHERE name = 'Snack'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00061', 'bakpau coklat', NULL, (SELECT id FROM categories WHERE name = 'Snack'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00062', 'chicken wings', NULL, (SELECT id FROM categories WHERE name = 'Snack'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00056', 'matcha latte', NULL, (SELECT id FROM categories WHERE name = 'No Coffee'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00057', 'Hot Punch (Staff)', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00058', 'Ninmilk 1 Liter', NULL, (SELECT id FROM categories WHERE name = 'No Coffee'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00059', 'Zoda', NULL, (SELECT id FROM categories WHERE name = 'Additional'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00063', 'Seasonal chick fries', NULL, (SELECT id FROM categories WHERE name = 'Snack'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00060', 'kopi botol ka putri', NULL, (SELECT id FROM categories WHERE name = 'Additional'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00064', 'Oyakodon', NULL, (SELECT id FROM categories WHERE name = 'Rice'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00065', 'Kakiudon', NULL, (SELECT id FROM categories WHERE name = 'Noodle'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00061', 'kopi susu Cibinong', NULL, (SELECT id FROM categories WHERE name = 'Additional'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00066', 'H Ketoak', NULL, (SELECT id FROM categories WHERE name = 'Steak'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00062', 'Hardi Signature', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00063', 'Black Vanilla', NULL, (SELECT id FROM categories WHERE name = 'No Coffee'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00067', 'Siomay', NULL, (SELECT id FROM categories WHERE name = 'Snack'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00064', 'Orange Crensis', NULL, (SELECT id FROM categories WHERE name = 'Refreshing Drink'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00065', 'Greenbull', NULL, (SELECT id FROM categories WHERE name = 'Refreshing Drink'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00068', 'Kopisu bundlin croissant', NULL, (SELECT id FROM categories WHERE name = 'Snack'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00066', 'Matcherry', NULL, (SELECT id FROM categories WHERE name = 'Additional'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00069', 'Hardi Bala Bala', NULL, (SELECT id FROM categories WHERE name = 'Snack'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00070', 'Baba Baba', NULL, (SELECT id FROM categories WHERE name = 'Snack'), 'FOOD', NULL, 'ACTIVE');

-- 4. Outlet pricing rows for every ACTIVE outlet x new product, price left at 0 pending manual entry
INSERT INTO outlet_products (outlet_id, product_id, selling_price, tax_rate, is_available)
SELECT o.id, p.id, 0, 0.1000, 1
FROM outlets o CROSS JOIN products p
WHERE o.status = 'ACTIVE' AND p.sku IN ('BEV-00001', 'BEV-00002', 'BEV-00003', 'BEV-00004', 'BEV-00005', 'BEV-00006', 'BEV-00007', 'BEV-00008', 'BEV-00009', 'BEV-00010', 'BEV-00011', 'BEV-00012', 'BEV-00013', 'BEV-00014', 'BEV-00015', 'BEV-00016', 'BEV-00017', 'BEV-00018', 'BEV-00019', 'BEV-00020', 'BEV-00021', 'BEV-00022', 'BEV-00023', 'BEV-00024', 'BEV-00025', 'BEV-00026', 'BEV-00027', 'BEV-00028', 'BEV-00029', 'BEV-00030', 'BEV-00031', 'BEV-00032', 'BEV-00033', 'BEV-00034', 'BEV-00035', 'FOD-00001', 'FOD-00002', 'FOD-00003', 'FOD-00004', 'FOD-00005', 'FOD-00006', 'FOD-00007', 'FOD-00008', 'FOD-00009', 'FOD-00010', 'FOD-00011', 'FOD-00012', 'FOD-00013', 'FOD-00014', 'FOD-00015', 'FOD-00016', 'FOD-00017', 'FOD-00018', 'FOD-00019', 'FOD-00020', 'FOD-00021', 'FOD-00022', 'FOD-00023', 'FOD-00024', 'FOD-00025', 'FOD-00026', 'FOD-00027', 'FOD-00028', 'FOD-00029', 'FOD-00030', 'FOD-00031', 'FOD-00032', 'FOD-00033', 'FOD-00034', 'FOD-00035', 'BEV-00036', 'BEV-00037', 'BEV-00038', 'BEV-00039', 'BEV-00040', 'BEV-00041', 'BEV-00042', 'BEV-00043', 'BEV-00044', 'BEV-00045', 'FOD-00036', 'FOD-00037', 'FOD-00038', 'FOD-00039', 'FOD-00040', 'FOD-00041', 'FOD-00042', 'FOD-00043', 'FOD-00044', 'FOD-00045', 'FOD-00046', 'FOD-00047', 'BEV-00046', 'FOD-00048', 'BEV-00047', 'FOD-00049', 'FOD-00050', 'BEV-00048', 'BEV-00049', 'BEV-00050', 'BEV-00051', 'BEV-00052', 'FOD-00051', 'BEV-00053', 'BEV-00054', 'FOD-00052', 'FOD-00053', 'FOD-00054', 'FOD-00055', 'BEV-00055', 'FOD-00056', 'FOD-00057', 'FOD-00058', 'FOD-00059', 'FOD-00060', 'FOD-00061', 'FOD-00062', 'BEV-00056', 'BEV-00057', 'BEV-00058', 'BEV-00059', 'FOD-00063', 'BEV-00060', 'FOD-00064', 'FOD-00065', 'BEV-00061', 'FOD-00066', 'BEV-00062', 'BEV-00063', 'FOD-00067', 'BEV-00064', 'BEV-00065', 'FOD-00068', 'BEV-00066', 'FOD-00069', 'FOD-00070');

COMMIT;
