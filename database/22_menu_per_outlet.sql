-- Supersedes 21_menu_replacement.sql. The owner sent a richer version of the menu
-- spreadsheet (16 columns, incl. an explicit Active/Not Active Status per row) and
-- clarified that the same-named item can differ per outlet (own category, own status)
-- -- the "(BSD)"-suffixed rows are the BSD outlet's own independent menu, distinct
-- from the shared menu used by Blossom Park + Karawaci. No schema change was needed:
-- each row becomes its own `products` row (own sku/category/status), linked via
-- `outlet_products` to only its owning outlet(s) instead of every active outlet.
-- The 136 products from 21_menu_replacement.sql are hard-deleted here (verified zero
-- order_items/recipes referenced any of them) rather than deactivated, since the user
-- asked to fully replace them, not preserve history that never existed for them.
-- Columns present in the source but not in this database (Tax/Other Tax/Luxury Item/
-- Zero Value Tax, Customer Print, Sales Category, COGS Category Number, Discount
-- Category/Number, Estimated Cost, Bill of Material, Menu Short Name) were
-- intentionally NOT imported -- the owner asked to skip them for now. Only the top,
-- clearly-legible portion of the "(BSD)" section's tail (roughly the last ~20 rows,
-- including a "SEPTEMBER CERIA" promo block) was too degraded to transcribe reliably
-- and was left out rather than guessed -- flag this to the owner if the BSD menu looks
-- incomplete. Already applied directly against the dev database; kept as the durable
-- record.

START TRANSACTION;

-- 1. Remove the previous full-replacement batch (136 products, zero real order/recipe history)
DELETE op FROM outlet_products op JOIN products p ON p.id = op.product_id WHERE p.sku REGEXP '^(BEV|FOD)-[0-9]{5}$';
DELETE FROM products WHERE sku REGEXP '^(BEV|FOD)-[0-9]{5}$';

-- 2. Categories (idempotent; plain-section names reuse the ones from the earlier import)
INSERT INTO categories (name, status) SELECT 'Coffee Based', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Coffee Based');
INSERT INTO categories (name, status) SELECT 'Manual Brew', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Manual Brew');
INSERT INTO categories (name, status) SELECT 'No Coffee', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'No Coffee');
INSERT INTO categories (name, status) SELECT 'Blended', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Blended');
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
INSERT INTO categories (name, status) SELECT 'Coffee Based (BSD)', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Coffee Based (BSD)');
INSERT INTO categories (name, status) SELECT 'Non Coffee N Tea (BSD)', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Non Coffee N Tea (BSD)');
INSERT INTO categories (name, status) SELECT 'Refreshing Drink (BSD)', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Refreshing Drink (BSD)');
INSERT INTO categories (name, status) SELECT 'Signature Drink (BSD)', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Signature Drink (BSD)');
INSERT INTO categories (name, status) SELECT 'Manual Brew (BSD)', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Manual Brew (BSD)');
INSERT INTO categories (name, status) SELECT 'Main Course (BSD)', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Main Course (BSD)');
INSERT INTO categories (name, status) SELECT 'Rice Bowl (BSD)', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Rice Bowl (BSD)');
INSERT INTO categories (name, status) SELECT 'Pasta (BSD)', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Pasta (BSD)');
INSERT INTO categories (name, status) SELECT 'Snacks (BSD)', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Snacks (BSD)');
INSERT INTO categories (name, status) SELECT 'Salad (BSD)', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Salad (BSD)');
INSERT INTO categories (name, status) SELECT 'Pastry (BSD)', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Pastry (BSD)');
INSERT INTO categories (name, status) SELECT 'Toast (BSD)', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Toast (BSD)');
INSERT INTO categories (name, status) SELECT 'Blended and Smoothies (BSD)', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Blended and Smoothies (BSD)');
INSERT INTO categories (name, status) SELECT 'Bundling Bucket (BSD)', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Bundling Bucket (BSD)');
INSERT INTO categories (name, status) SELECT 'Additional (BSD)', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Additional (BSD)');
INSERT INTO categories (name, status) SELECT 'Hot Bavarage (BSD)', 'ACTIVE' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Hot Bavarage (BSD)');

-- 3. Products (each row now belongs to exactly one outlet-scope: plain -> Blossom Park + Karawaci, BSD-labeled -> BSD only)
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00001', 'Kopi Susu Hardi', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00002', 'Avocado Coffee', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00003', 'Cafe Latte', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00004', 'Black Lemonade', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00005', 'Black Coffee Bomb', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00006', 'Black Coffee', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00007', 'Raisin Butterscotch Coffee', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00008', 'Raisin Butterscotch', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00009', 'Salted Caramel Coffee', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00010', 'Caramel', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00011', 'Vanilla Latte', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00012', 'V60', NULL, (SELECT id FROM categories WHERE name = 'Manual Brew'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00013', 'Tubruk', NULL, (SELECT id FROM categories WHERE name = 'Manual Brew'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00014', 'Japanese', NULL, (SELECT id FROM categories WHERE name = 'Manual Brew'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00015', 'Chocolate', NULL, (SELECT id FROM categories WHERE name = 'No Coffee'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00016', 'Ice Choco Mint', NULL, (SELECT id FROM categories WHERE name = 'No Coffee'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00017', 'Red Velvet', NULL, (SELECT id FROM categories WHERE name = 'No Coffee'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00018', 'Green Tea Latte', NULL, (SELECT id FROM categories WHERE name = 'No Coffee'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00019', 'Ubee', NULL, (SELECT id FROM categories WHERE name = 'No Coffee'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00020', 'Milky Mango', NULL, (SELECT id FROM categories WHERE name = 'No Coffee'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00021', 'Milky Berry', NULL, (SELECT id FROM categories WHERE name = 'No Coffee'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00022', 'Cookies n Cream', NULL, (SELECT id FROM categories WHERE name = 'Blended'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00023', 'Vanilla Milkshake', NULL, (SELECT id FROM categories WHERE name = 'Blended'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00024', 'Chocolate Milkshake', NULL, (SELECT id FROM categories WHERE name = 'Blended'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00025', 'Strawberry Milkshake', NULL, (SELECT id FROM categories WHERE name = 'Blended'), 'BEVERAGE', NULL, 'ACTIVE');
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
  VALUES ('FOD-00024', 'Classic Pain Au Chocolate', NULL, (SELECT id FROM categories WHERE name = 'Pastry'), 'FOOD', NULL, 'ACTIVE');
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
  VALUES ('FOD-00032', 'Ubee Toast', NULL, (SELECT id FROM categories WHERE name = 'Toast'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00033', 'Matcha Toast', NULL, (SELECT id FROM categories WHERE name = 'Toast'), 'FOOD', NULL, 'ACTIVE');
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
  VALUES ('BEV-00044', 'Sweet Berry Cream', NULL, (SELECT id FROM categories WHERE name = 'Refreshing Drink'), 'BEVERAGE', NULL, 'ACTIVE');
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
  VALUES ('BEV-00046', 'Mineral Water', NULL, (SELECT id FROM categories WHERE name = 'Additional'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00048', 'Ice cream', NULL, (SELECT id FROM categories WHERE name = 'Additional'), 'FOOD', NULL, 'ACTIVE');
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
  VALUES ('BEV-00051', 'Pinkie Pop', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'ACTIVE');
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
  VALUES ('FOD-00054', 'Salt Bread Premium', NULL, (SELECT id FROM categories WHERE name = 'Pastry'), 'FOOD', NULL, 'INACTIVE');
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
  VALUES ('BEV-00058', 'Ninmilk 1 Liter', NULL, (SELECT id FROM categories WHERE name = 'Additional'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00059', 'Permula 1 Liter', NULL, (SELECT id FROM categories WHERE name = 'Additional'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00063', 'Zoda', NULL, (SELECT id FROM categories WHERE name = 'Snack'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00064', 'Seasonal Beans', NULL, (SELECT id FROM categories WHERE name = 'Additional'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00065', 'kopi botol ka putri', NULL, (SELECT id FROM categories WHERE name = 'Rice'), 'FOOD', NULL, 'INACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00066', 'Oyakodon', NULL, (SELECT id FROM categories WHERE name = 'Rice'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00067', 'Katsudon', NULL, (SELECT id FROM categories WHERE name = 'Rice'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00060', 'kopi susu Cibinong', NULL, (SELECT id FROM categories WHERE name = 'Additional'), 'BEVERAGE', NULL, 'INACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00068', 'H Ketoak', NULL, (SELECT id FROM categories WHERE name = 'Steak'), 'FOOD', NULL, 'INACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00061', 'Hardi Signature', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based'), 'BEVERAGE', NULL, 'INACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00062', 'Black Vanilla', NULL, (SELECT id FROM categories WHERE name = 'No Coffee'), 'BEVERAGE', NULL, 'INACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00069', 'Siomay', NULL, (SELECT id FROM categories WHERE name = 'Snack'), 'FOOD', NULL, 'INACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00063', 'Orange Crensis', NULL, (SELECT id FROM categories WHERE name = 'Refreshing Drink'), 'BEVERAGE', NULL, 'INACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00064', 'Greenbull', NULL, (SELECT id FROM categories WHERE name = 'Refreshing Drink'), 'BEVERAGE', NULL, 'INACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00070', 'Kopsu bundlin croissant', NULL, (SELECT id FROM categories WHERE name = 'Snack'), 'FOOD', NULL, 'INACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00065', 'Matcherry', NULL, (SELECT id FROM categories WHERE name = 'Additional'), 'BEVERAGE', NULL, 'INACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00071', 'Hardi Bala Bala', NULL, (SELECT id FROM categories WHERE name = 'Snack'), 'FOOD', NULL, 'INACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00072', 'Baba Baba', NULL, (SELECT id FROM categories WHERE name = 'Snack'), 'FOOD', NULL, 'INACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00066', 'Peachpresso', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00067', 'BerryMan', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00068', 'Cafe Latte', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00069', 'Espresso', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00070', 'Long Black', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00071', 'Kopi Susu Hardi', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00072', 'Kopi Hardi Kopi Pemula', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00073', 'Magic', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00074', 'Cappuccino', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00075', 'Raisin Butterscotch Coffee', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00076', 'Salted Caramel Coffee', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00077', 'Brulee', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00078', 'Affogato', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00079', 'Chocolate', NULL, (SELECT id FROM categories WHERE name = 'Non Coffee N Tea (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00080', 'Choco Mint', NULL, (SELECT id FROM categories WHERE name = 'Non Coffee N Tea (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00081', 'Matcha Latte', NULL, (SELECT id FROM categories WHERE name = 'Non Coffee N Tea (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00082', 'Ubee Latte', NULL, (SELECT id FROM categories WHERE name = 'Non Coffee N Tea (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00083', 'Milky Mango', NULL, (SELECT id FROM categories WHERE name = 'Non Coffee N Tea (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00084', 'Milky Berry', NULL, (SELECT id FROM categories WHERE name = 'Non Coffee N Tea (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00085', 'Lychee Tea', NULL, (SELECT id FROM categories WHERE name = 'Non Coffee N Tea (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00086', 'Lemon Tea', NULL, (SELECT id FROM categories WHERE name = 'Non Coffee N Tea (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00087', 'Teh Tarik Hardi', NULL, (SELECT id FROM categories WHERE name = 'Non Coffee N Tea (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00088', 'Discovery in Midnight', NULL, (SELECT id FROM categories WHERE name = 'Refreshing Drink (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00089', 'Summer Drink', NULL, (SELECT id FROM categories WHERE name = 'Refreshing Drink (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00090', 'Mango Blast', NULL, (SELECT id FROM categories WHERE name = 'Refreshing Drink (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00091', 'Berry Blast', NULL, (SELECT id FROM categories WHERE name = 'Refreshing Drink (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00092', 'Jack Frost', NULL, (SELECT id FROM categories WHERE name = 'Refreshing Drink (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00093', 'Orange Crensis', NULL, (SELECT id FROM categories WHERE name = 'Refreshing Drink (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00094', 'Greenbull', NULL, (SELECT id FROM categories WHERE name = 'Refreshing Drink (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00095', 'Hardi Signature', NULL, (SELECT id FROM categories WHERE name = 'Signature Drink (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00096', 'Black Vanilla', NULL, (SELECT id FROM categories WHERE name = 'Signature Drink (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00097', 'V60', NULL, (SELECT id FROM categories WHERE name = 'Manual Brew (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00098', 'Japanese', NULL, (SELECT id FROM categories WHERE name = 'Manual Brew (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00099', 'Tubruk', NULL, (SELECT id FROM categories WHERE name = 'Manual Brew (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00100', 'Vietnam Drip', NULL, (SELECT id FROM categories WHERE name = 'Manual Brew (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00073', 'Nasi Goreng Sei', NULL, (SELECT id FROM categories WHERE name = 'Main Course (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00074', 'Nasi Goreng Kampung', NULL, (SELECT id FROM categories WHERE name = 'Main Course (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00075', 'Curry Chicken Rice', NULL, (SELECT id FROM categories WHERE name = 'Main Course (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00076', 'Nanban Chicken', NULL, (SELECT id FROM categories WHERE name = 'Main Course (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00077', 'Chicken Cordon Bleu', NULL, (SELECT id FROM categories WHERE name = 'Main Course (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00078', 'Fried Dumpling', NULL, (SELECT id FROM categories WHERE name = 'Main Course (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00079', 'Dumpling Soup', NULL, (SELECT id FROM categories WHERE name = 'Main Course (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00080', 'Mie Godok', NULL, (SELECT id FROM categories WHERE name = 'Main Course (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00081', 'Mie Goreng Kampung', NULL, (SELECT id FROM categories WHERE name = 'Main Course (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00082', 'Oyakodon', NULL, (SELECT id FROM categories WHERE name = 'Rice Bowl (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00083', 'Katsudon', NULL, (SELECT id FROM categories WHERE name = 'Rice Bowl (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00084', 'Rice Bowl Sei', NULL, (SELECT id FROM categories WHERE name = 'Rice Bowl (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00085', 'Salted Egg', NULL, (SELECT id FROM categories WHERE name = 'Rice Bowl (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00086', 'Chicken Teriyaki', NULL, (SELECT id FROM categories WHERE name = 'Rice Bowl (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00087', 'Honey Garlic Chicken', NULL, (SELECT id FROM categories WHERE name = 'Rice Bowl (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00088', 'Spicy Korean Chicken', NULL, (SELECT id FROM categories WHERE name = 'Rice Bowl (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00089', 'Chicken Chilipadi', NULL, (SELECT id FROM categories WHERE name = 'Rice Bowl (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00090', 'Chicken Matah', NULL, (SELECT id FROM categories WHERE name = 'Rice Bowl (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00091', 'Creamy Carbonara', NULL, (SELECT id FROM categories WHERE name = 'Pasta (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00092', 'Bolognese', NULL, (SELECT id FROM categories WHERE name = 'Pasta (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00093', 'Tuna Aglio Olio', NULL, (SELECT id FROM categories WHERE name = 'Pasta (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00094', 'Crispy Choco Banana', NULL, (SELECT id FROM categories WHERE name = 'Snacks (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00095', 'Cireng', NULL, (SELECT id FROM categories WHERE name = 'Snacks (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00096', 'Pisang Goreng Kampung', NULL, (SELECT id FROM categories WHERE name = 'Snacks (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00097', 'Singkong Goreng', NULL, (SELECT id FROM categories WHERE name = 'Snacks (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00098', 'French Fries', NULL, (SELECT id FROM categories WHERE name = 'Snacks (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00099', 'Mix Platter', NULL, (SELECT id FROM categories WHERE name = 'Snacks (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00100', 'Tahu Goreng Isi', NULL, (SELECT id FROM categories WHERE name = 'Snacks (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00101', 'Hardi Fries', NULL, (SELECT id FROM categories WHERE name = 'Snacks (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00102', 'Kampring Fried Banana', NULL, (SELECT id FROM categories WHERE name = 'Snacks (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00103', 'Mentai Dimsum', NULL, (SELECT id FROM categories WHERE name = 'Snacks (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00104', 'Fried Otak-Otak', NULL, (SELECT id FROM categories WHERE name = 'Snacks (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00105', 'Potato Donuts', NULL, (SELECT id FROM categories WHERE name = 'Snacks (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00106', 'Cheesy Beef Roll', NULL, (SELECT id FROM categories WHERE name = 'Snacks (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00107', 'Fried Wrapped Dimsum', NULL, (SELECT id FROM categories WHERE name = 'Snacks (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00108', 'Chicken Caesar Salad', NULL, (SELECT id FROM categories WHERE name = 'Salad (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00109', 'Hardi Salad', NULL, (SELECT id FROM categories WHERE name = 'Salad (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00110', 'Butter Croissant', NULL, (SELECT id FROM categories WHERE name = 'Pastry (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00111', 'Pain Au Choco', NULL, (SELECT id FROM categories WHERE name = 'Pastry (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00112', 'Blueberry Danish', NULL, (SELECT id FROM categories WHERE name = 'Pastry (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00113', 'Cheese Danish', NULL, (SELECT id FROM categories WHERE name = 'Pastry (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00114', 'Egg Tuna Mayo Croissant', NULL, (SELECT id FROM categories WHERE name = 'Pastry (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00115', 'Crispy Chicken Croissant', NULL, (SELECT id FROM categories WHERE name = 'Pastry (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00101', 'Ice Tea', NULL, (SELECT id FROM categories WHERE name = 'Non Coffee N Tea (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00102', 'Black Lemonade', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00116', 'Pisang Goreng Wijen', NULL, (SELECT id FROM categories WHERE name = 'Snacks (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00103', 'Mineral Water', NULL, (SELECT id FROM categories WHERE name = 'Non Coffee N Tea (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00117', 'Chocolate Toast', NULL, (SELECT id FROM categories WHERE name = 'Toast (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00118', 'Ubee Toast', NULL, (SELECT id FROM categories WHERE name = 'Toast (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00119', 'Matcha Toast', NULL, (SELECT id FROM categories WHERE name = 'Toast (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00120', 'Milky Snow Toast', NULL, (SELECT id FROM categories WHERE name = 'Toast (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00104', 'Icy Mint', NULL, (SELECT id FROM categories WHERE name = 'Signature Drink (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00121', 'Smoked Beef Toast', NULL, (SELECT id FROM categories WHERE name = 'Toast (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00105', 'Strawberry Milkshake', NULL, (SELECT id FROM categories WHERE name = 'Blended and Smoothies (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00106', 'Cookies n Cream', NULL, (SELECT id FROM categories WHERE name = 'Blended and Smoothies (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00107', 'Hello Mango', NULL, (SELECT id FROM categories WHERE name = 'Blended and Smoothies (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00108', 'Nana Berry', NULL, (SELECT id FROM categories WHERE name = 'Blended and Smoothies (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00109', 'Choco La''nana', NULL, (SELECT id FROM categories WHERE name = 'Blended and Smoothies (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00110', 'Mochacino', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00122', 'Pain Suisse', NULL, (SELECT id FROM categories WHERE name = 'Pastry (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00123', 'Chicken Quesadilla', NULL, (SELECT id FROM categories WHERE name = 'Snacks (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00124', 'Bundling Product', NULL, (SELECT id FROM categories WHERE name = 'Bundling Bucket (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00125', 'Ricebowl + Tea', NULL, (SELECT id FROM categories WHERE name = 'Bundling Bucket (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00111', 'Kopi Hardi 1 Liter', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00112', 'Kopi Permula 1 Liter', NULL, (SELECT id FROM categories WHERE name = 'Coffee Based (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00126', 'Nasi', NULL, (SELECT id FROM categories WHERE name = 'Additional (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('FOD-00127', 'Telur', NULL, (SELECT id FROM categories WHERE name = 'Additional (BSD)'), 'FOOD', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00113', 'Hot Latte', NULL, (SELECT id FROM categories WHERE name = 'Hot Bavarage (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00114', 'Hot Redvelvet', NULL, (SELECT id FROM categories WHERE name = 'Hot Bavarage (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00115', 'Hot Ubee', NULL, (SELECT id FROM categories WHERE name = 'Hot Bavarage (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00116', 'Hot Brule Butterscotch', NULL, (SELECT id FROM categories WHERE name = 'Hot Bavarage (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00117', 'Hot Hardi Signature', NULL, (SELECT id FROM categories WHERE name = 'Hot Bavarage (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00118', 'Hot Cappuccino', NULL, (SELECT id FROM categories WHERE name = 'Hot Bavarage (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');
INSERT INTO products (sku, name, description, category_id, product_type, base_unit_id, status)
  VALUES ('BEV-00119', 'Hot Matcha', NULL, (SELECT id FROM categories WHERE name = 'Hot Bavarage (BSD)'), 'BEVERAGE', NULL, 'ACTIVE');

-- 4. Outlet-scoped pricing/availability rows (price left at 0 pending manual entry)
INSERT INTO outlet_products (outlet_id, product_id, selling_price, tax_rate, is_available)
SELECT o.id, p.id, 0, 0.1000, IF(p.status = 'ACTIVE', 1, 0)
FROM outlets o CROSS JOIN products p
WHERE o.code IN ('BLSM01', 'KRWC') AND p.sku IN ('BEV-00001', 'BEV-00002', 'BEV-00003', 'BEV-00004', 'BEV-00005', 'BEV-00006', 'BEV-00007', 'BEV-00008', 'BEV-00009', 'BEV-00010', 'BEV-00011', 'BEV-00012', 'BEV-00013', 'BEV-00014', 'BEV-00015', 'BEV-00016', 'BEV-00017', 'BEV-00018', 'BEV-00019', 'BEV-00020', 'BEV-00021', 'BEV-00022', 'BEV-00023', 'BEV-00024', 'BEV-00025', 'BEV-00026', 'BEV-00027', 'BEV-00028', 'BEV-00029', 'BEV-00030', 'BEV-00031', 'BEV-00032', 'BEV-00033', 'BEV-00034', 'BEV-00035', 'FOD-00001', 'FOD-00002', 'FOD-00003', 'FOD-00004', 'FOD-00005', 'FOD-00006', 'FOD-00007', 'FOD-00008', 'FOD-00009', 'FOD-00010', 'FOD-00011', 'FOD-00012', 'FOD-00013', 'FOD-00014', 'FOD-00015', 'FOD-00016', 'FOD-00017', 'FOD-00018', 'FOD-00019', 'FOD-00020', 'FOD-00021', 'FOD-00022', 'FOD-00023', 'FOD-00024', 'FOD-00025', 'FOD-00026', 'FOD-00027', 'FOD-00028', 'FOD-00029', 'FOD-00030', 'FOD-00031', 'FOD-00032', 'FOD-00033', 'FOD-00034', 'FOD-00035', 'BEV-00036', 'BEV-00037', 'BEV-00038', 'BEV-00039', 'BEV-00040', 'BEV-00041', 'BEV-00042', 'BEV-00043', 'BEV-00044', 'BEV-00045', 'FOD-00036', 'FOD-00037', 'FOD-00038', 'FOD-00039', 'FOD-00040', 'FOD-00041', 'FOD-00042', 'FOD-00043', 'FOD-00044', 'FOD-00045', 'FOD-00046', 'FOD-00047', 'BEV-00046', 'FOD-00048', 'BEV-00047', 'FOD-00049', 'FOD-00050', 'BEV-00048', 'BEV-00049', 'BEV-00050', 'BEV-00051', 'BEV-00052', 'FOD-00051', 'BEV-00053', 'BEV-00054', 'FOD-00052', 'FOD-00053', 'FOD-00054', 'FOD-00055', 'BEV-00055', 'FOD-00056', 'FOD-00057', 'FOD-00058', 'FOD-00059', 'FOD-00060', 'FOD-00061', 'FOD-00062', 'BEV-00056', 'BEV-00057', 'BEV-00058', 'BEV-00059', 'FOD-00063', 'FOD-00064', 'FOD-00065', 'FOD-00066', 'FOD-00067', 'BEV-00060', 'FOD-00068', 'BEV-00061', 'BEV-00062', 'FOD-00069', 'BEV-00063', 'BEV-00064', 'FOD-00070', 'BEV-00065', 'FOD-00071', 'FOD-00072');

INSERT INTO outlet_products (outlet_id, product_id, selling_price, tax_rate, is_available)
SELECT o.id, p.id, 0, 0.1000, IF(p.status = 'ACTIVE', 1, 0)
FROM outlets o CROSS JOIN products p
WHERE o.code = 'BSD' AND p.sku IN ('BEV-00066', 'BEV-00067', 'BEV-00068', 'BEV-00069', 'BEV-00070', 'BEV-00071', 'BEV-00072', 'BEV-00073', 'BEV-00074', 'BEV-00075', 'BEV-00076', 'BEV-00077', 'BEV-00078', 'BEV-00079', 'BEV-00080', 'BEV-00081', 'BEV-00082', 'BEV-00083', 'BEV-00084', 'BEV-00085', 'BEV-00086', 'BEV-00087', 'BEV-00088', 'BEV-00089', 'BEV-00090', 'BEV-00091', 'BEV-00092', 'BEV-00093', 'BEV-00094', 'BEV-00095', 'BEV-00096', 'BEV-00097', 'BEV-00098', 'BEV-00099', 'BEV-00100', 'FOD-00073', 'FOD-00074', 'FOD-00075', 'FOD-00076', 'FOD-00077', 'FOD-00078', 'FOD-00079', 'FOD-00080', 'FOD-00081', 'FOD-00082', 'FOD-00083', 'FOD-00084', 'FOD-00085', 'FOD-00086', 'FOD-00087', 'FOD-00088', 'FOD-00089', 'FOD-00090', 'FOD-00091', 'FOD-00092', 'FOD-00093', 'FOD-00094', 'FOD-00095', 'FOD-00096', 'FOD-00097', 'FOD-00098', 'FOD-00099', 'FOD-00100', 'FOD-00101', 'FOD-00102', 'FOD-00103', 'FOD-00104', 'FOD-00105', 'FOD-00106', 'FOD-00107', 'FOD-00108', 'FOD-00109', 'FOD-00110', 'FOD-00111', 'FOD-00112', 'FOD-00113', 'FOD-00114', 'FOD-00115', 'BEV-00101', 'BEV-00102', 'FOD-00116', 'BEV-00103', 'FOD-00117', 'FOD-00118', 'FOD-00119', 'FOD-00120', 'BEV-00104', 'FOD-00121', 'BEV-00105', 'BEV-00106', 'BEV-00107', 'BEV-00108', 'BEV-00109', 'BEV-00110', 'FOD-00122', 'FOD-00123', 'FOD-00124', 'FOD-00125', 'BEV-00111', 'BEV-00112', 'FOD-00126', 'FOD-00127', 'BEV-00113', 'BEV-00114', 'BEV-00115', 'BEV-00116', 'BEV-00117', 'BEV-00118', 'BEV-00119');

COMMIT;
