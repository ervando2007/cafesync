-- Karawaci prices from Product-karawaci.xlsx (Menu & Harga Grab).
-- Replaces every KRWC outlet_products row (KRWC prices are their own, not BSD's).
-- Dine In price -> DINE_IN and TAKEAWAY; Harga Grab -> GRABFOOD; blank = not sold
-- on that channel. Tax 10%. Then links each row to its KRWC recipe (migration 43).
-- Only rows with outlet_id = KRWC are touched. Re-runnable.
START TRANSACTION;
SET @krwc := (SELECT id FROM outlets WHERE code = 'KRWC');

DELETE FROM outlet_products WHERE outlet_id = @krwc;

-- FOD-00001 Nasi Goreng Sei
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 55000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00001';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 55000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00001';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 69000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00001';
-- FOD-00002 Nasi Goreng Kampung
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 35000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00002';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 35000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00002';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 44000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00002';
-- FOD-00003 Curry Chicken Rice
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 42000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00003';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 42000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00003';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 53000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00003';
-- FOD-00004 Nanban Chicken
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 45000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00004';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 45000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00004';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 57000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00004';
-- FOD-00005 Chicken Cordon Bleu
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 60000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00005';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 60000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00005';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 57000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00005';
-- FOD-00006 Mie Godok
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 35000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00006';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 35000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00006';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 44000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00006';
-- FOD-00007 Mie Nyemek
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 35000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00007';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 35000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00007';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 44000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00007';
-- FOD-00008 Mie Goreng Kampung
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 35000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00008';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 35000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00008';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 44000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00008';
-- FOD-00009 Grill Chicken Steak
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 47000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00009';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 47000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00009';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 59000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00009';
-- FOD-00010 Crispy Chicken Steak
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 47000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00010';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 47000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00010';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 59000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00010';
-- FOD-00011 Oyakodon
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 42000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00011';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 42000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00011';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 53000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00011';
-- FOD-00012 Katsudon
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 45000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00012';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 45000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00012';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 57000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00012';
-- FOD-00013 Salted Egg
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 40000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00013';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 40000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00013';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 50000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00013';
-- FOD-00014 Chicken Teriyaki
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 40000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00014';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 40000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00014';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 50000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00014';
-- FOD-00015 Chicken Mentai
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 40000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00015';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 40000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00015';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 50000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00015';
-- FOD-00016 Honey Garlic Chicken
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 40000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00016';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 40000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00016';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 50000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00016';
-- FOD-00017 Chicken Chilapadi
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 42000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00017';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 42000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00017';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 50000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00017';
-- FOD-00018 Spaghetti Bolognese
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 40000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00018';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 40000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00018';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 50000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00018';
-- FOD-00019 Tuna Aglio Olio
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 40000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00019';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 40000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00019';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 50000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00019';
-- FOD-00020 Creamy Carbonara
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 40000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00020';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 40000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00020';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 50000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00020';
-- FOD-00021 Crispy Choco Banana
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 28000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00021';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 28000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00021';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 35000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00021';
-- FOD-00022 Hardi Chicken Fries
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 45000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00022';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 45000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00022';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 57000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00022';
-- FOD-00023 Hardi Fries
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 38000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00023';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 38000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00023';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 48000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00023';
-- FOD-00024 French Fries
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 28000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00024';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 28000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00024';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 35000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00024';
-- FOD-00025 Mix Platter
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 35000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00025';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 35000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00025';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 44000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00025';
-- FOD-00026 Cireng
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 28000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00026';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 28000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00026';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 35000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00026';
-- FOD-00027 Pisang Goreng Kampung
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 28000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00027';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 28000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00027';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 35000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00027';
-- FOD-00028 Singkong Goreng
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 28000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00028';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 28000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00028';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 36000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00028';
-- FOD-00029 Tahu Goreng Isi
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 28000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00029';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 28000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00029';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 35000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00029';
-- FOD-00030 Mentai Dimsum
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 30000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00030';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 30000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00030';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 38000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00030';
-- FOD-00031 Fried Otak Otak
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 28000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00031';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 28000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00031';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 35000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00031';
-- FOD-00032 Potato Donuts
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 28000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00032';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 28000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00032';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 35000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00032';
-- FOD-00033 Risol Mayo
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 42000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00033';
-- FOD-00034 Butter Croissant
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 22000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00034';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 22000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00034';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 28000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00034';
-- FOD-00035 Pain Au Chocolate
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 28000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00035';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 28000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00035';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 35000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00035';
-- FOD-00036 Blueberry Danish
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 28000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00036';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 28000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00036';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 35000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00036';
-- FOD-00037 Cheese Danish
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 28000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00037';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 28000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00037';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 35000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00037';
-- FOD-00038 Choco Strip
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 35000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00038';
-- FOD-00039 Pain Au Raisin
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 35000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00039';
-- FOD-00040 Mount Blanc
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 44000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00040';
-- FOD-00041 Matcha Toast
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 30000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00041';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 30000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00041';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 38000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00041';
-- FOD-00042 Chocolate Toast
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 38000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00042';
-- FOD-00043 Milky Toast
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 30000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00043';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 30000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00043';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 38000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00043';
-- FOD-00044 Ubee Toast
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 38000.00, 0.1000, 1 FROM products WHERE sku = 'FOD-00044';
-- BEV-00001 Espresso
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 25000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00001';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 25000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00001';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 32000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00001';
-- BEV-00002 Long Black
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 25000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00002';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 25000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00002';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 25000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00002';
-- BEV-00003 Kopi Susu Hardi Pemula
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 25000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00003';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 25000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00003';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 25000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00003';
-- BEV-00004 Hardi Kopi
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 27000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00004';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 27000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00004';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 27000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00004';
-- BEV-00005 Magic Coffee
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 30000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00005';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 30000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00005';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 38000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00005';
-- BEV-00006 Cafe Latte
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 30000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00006';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 30000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00006';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 38000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00006';
-- BEV-00007 Cappuccino
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 30000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00007';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 30000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00007';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 38000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00007';
-- BEV-00008 Raisin Butterscotch
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 35000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00008';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 35000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00008';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 44000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00008';
-- BEV-00009 Coffee Salted Caramel Latte
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 35000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00009';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 35000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00009';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 44000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00009';
-- BEV-00010 Brulee Butterscotch (Hot/Ice)
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 35000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00010';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 35000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00010';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 44000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00010';
-- BEV-00011 Affogato
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 25000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00011';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 25000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00011';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 32000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00011';
-- BEV-00012 Berryman
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 32000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00012';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 32000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00012';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 40000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00012';
-- BEV-00013 Peach Presso
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 30000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00013';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 30000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00013';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 40000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00013';
-- BEV-00014 Discovery Midnight
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 32000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00014';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 32000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00014';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 40000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00014';
-- BEV-00015 Summer Drink
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 30000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00015';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 30000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00015';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 38000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00015';
-- BEV-00016 Mango Blast
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 40000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00016';
-- BEV-00017 Berry Blast
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 40000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00017';
-- BEV-00018 Jack Frost
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 30000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00018';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 30000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00018';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 38000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00018';
-- BEV-00019 Black Lemonade
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 30000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00019';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 30000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00019';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 38000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00019';
-- BEV-00020 Orange Cinesis
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 30000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00020';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 30000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00020';
-- BEV-00021 Lemon Tea (Shaken)
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 32000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00021';
-- BEV-00022 Chocolate
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 35000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00022';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 35000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00022';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 38000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00022';
-- BEV-00023 Choco Mint
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 30000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00023';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 30000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00023';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 44000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00023';
-- BEV-00024 Matcha Latte
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 30000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00024';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 30000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00024';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 38000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00024';
-- BEV-00025 Mango Milk
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 40000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00025';
-- BEV-00026 Lotus Biscoff
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 30000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00026';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 30000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00026';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 38000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00026';
-- BEV-00027 Lychee Tea
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 30000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00027';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 30000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00027';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 38000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00027';
-- BEV-00028 Teh Tarik Hardi
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 30000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00028';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 30000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00028';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 38000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00028';
-- BEV-00029 Cookies n Cream
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 38000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00029';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 38000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00029';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 48000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00029';
-- BEV-00030 Milkshake Strawberry
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'DINE_IN', 38000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00030';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'TAKEAWAY', 38000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00030';
INSERT INTO outlet_products (outlet_id, product_id, channel, selling_price, tax_rate, is_available) SELECT @krwc, id, 'GRABFOOD', 48000.00, 0.1000, 1 FROM products WHERE sku = 'BEV-00030';

UPDATE outlet_products op JOIN recipes r ON r.outlet_id = op.outlet_id AND r.product_id = op.product_id AND r.is_active = 1
SET op.recipe_id = r.id WHERE op.outlet_id = @krwc;

COMMIT;
