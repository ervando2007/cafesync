-- Karawaci recipes (Bill of Materials) from COGS_KARAWACI_1.xlsx for outlet KRWC.
-- Supersedes 41_import_karawaci_recipes.sql (re-runnable: drops existing KRWC
-- recipes first). Only rows with outlet_id = KRWC are touched: BSD recipes,
-- prices and the shared product master are left as they are.
--
-- Recipes are linked to the existing product master. Sheets the user renamed
-- are mapped back to the product they were imported for in 41:
--   Cafe Latte -> Cafe Latte + Cappuccino (BOM "Cafe Latte/Cappucino")
--   Ice Choco Mint -> Choco Mint, Discovery in Midnight -> Discovery Midnight,
--   MONTBLANK -> Mount Blanc, Cordon Bleu -> Chicken Cordon Bleu,
--   Aglio Olio -> Tuna Aglio Olio, OTAK OTAK -> Fried Otak Otak,
--   Donut kentang -> Potato Donuts, Classic Pain Au Chocolate -> Pain Au Chocolate,
--   Blueberry Cheese Danish -> Blueberry Danish, Cheesecake Danish -> Cheese Danish,
--   piscok -> Crispy Choco Banana
-- Pastry materials renamed in the sheet (CLASSIC PAIN AU CHOCOLATE, BLUEBERRY
-- CHEESE DANISH, CHEESECAKE DANISH, BUTTER CROISANT) keep using the existing
-- stock items PAIN AU CHOCO, BLUEBERRY DANISH, CHEESE DANISH, BUTTERCROISSANT.
--
-- Changed vs 41: Cookies n Cream no longer deducts CUP TAKE AWAY / TUTUP CUP
-- (now marked "gak usah masuk BOM").
--
-- Not imported: sheets with no product in the master (new Karawaci menus such as
-- PEMULA 1 LITER, KOPI HARDI 1 LITER, KOPI SUSU BOTOL, Salted Caramel Latte,
-- Red Velvet, MINERAL, extra shot, ice cream, oatmilk, Salt Bread, Cinnamon
-- Rolls, Choco Stripe, Sourdough Cranberry cheese, Double Choco, Smoked Beef
-- Quiche, Pain Raisin, FREID DUMPLING, DUMPLING SOUP, plus the ones already
-- skipped in 41), and Nasi Goreng Kampung (empty sheet).
--
-- Adjustments:
--   Hardi Kopi Pemula: GULA AREN 18 GR -> 18 ML (stock unit)
--   Lychee Tea: LYCHEE BUAH unit "BH" -> PCS
--   Teh Tarik Hardi: dropped TEH TARIK POWDER (qty "1 BKS"; stock unit is GR and the grams per sachet are unknown)
--   Black Lemonade: SUPER JUICE LEMON unit "SUPER JUICE LEMON" -> ML
--   Cookies n Cream: dropped OREO (Oreo skipped, as in the BSD import)
--   MONT BLANC: BUAH VITA ORANGE 40 ML -> 40 GR (stock unit)
--   MONT BLANC: WHIPPED CREAM 20 GR -> 20 ML (stock unit)
--   Nasi Goreng Se'i: DAGING SEI 1 PORSI -> 1 PCS (stock unit)
--   Mie Godok: INDOMIE GORENG 1 PORSI -> 1 PCS (stock unit)
--   Grill Chicken Steak: CHICKEN STEAK 1 PORSI -> 1 PACK (stock unit)
--   Grill Chicken Steak: KENTANG 130 1 PORSI -> 1 PACK (stock unit)
--   Crispy Chicken Steak: CHICKEN CRISPY 1 PORSI -> 1 PACK (stock unit)
--   Crispy Chicken Steak: KENTANG 130 1 PORSI -> 1 PACK (stock unit)
--   Katsudon: CHICKEN KATSU 1 PORSI -> 1 PACK (stock unit)
--   Salted egg: CHICKEN POP 1 PORSI -> 1 PACK (stock unit)
--   Salted egg: BERAS unit "PCS" -> GR
--   CHIKEN TERIYAKI: BASE MIE NYEMEK 40 GR -> 40 ML (stock unit)
--   Chicken Mentai: CHICKEN POP 1 PORSI -> 1 PACK (stock unit)
--   Honey Garlic Chicken: CHICKEN POP 1 PORSI -> 1 PACK (stock unit)
--   Chilipadi: CHICKEN POP 1 PORSI -> 1 PACK (stock unit)
--   BOLOGNESE: dropped SAUS BOLOGNESE (qty "1 PORSI"; stock unit is GR and the grams per portion are unknown)
--   Tuna Aglio Olio: TUNA CHUNK unit "PORSI" -> GR
--   Hardi Chicken Fries: CHICKEN HARDI 1 PORSI -> 1 PCS (stock unit)
--   Hardi Chicken Fries: KENTANG 180 1 PORSI -> 1 PACK (stock unit)
--   Hardi Fries: KENTANG 180 1 PORSI -> 1 PACK (stock unit)
--   French Fries: KENTANG 180 1 PORSI -> 1 PACK (stock unit)
--   Cireng: CIRENG 1 PORSI -> 1 PACK (stock unit)
--   tahu Goreng isi: TAHU GORENG ISI 1 PORSI -> 1 PACK (stock unit)
--   FRIED OTAK OTAK: OTAK OTAK 1 PORSI -> 1 PACK (stock unit)
--   POTATO DONUTS: POTATO DONUT 1 PORSI -> 1 PCS (stock unit)
--   Ubee Toast: WHIPPED CREAM 10 GR -> 10 ML (stock unit)
--   Matcha Toast: WHIPPED CREAM 10 GR -> 10 ML (stock unit)
--   Chocolate Toast: WHIPPED CREAM 10 GR -> 10 ML (stock unit)
--   Milky Toast: WHIPPED CREAM 10 GR -> 10 ML (stock unit)
--   HARDI KOPI: GULA AREN 18 GR -> 18 ML (stock unit)
START TRANSACTION;
SET @krwc := (SELECT id FROM outlets WHERE code = 'KRWC');

UPDATE outlet_products SET recipe_id = NULL WHERE outlet_id = @krwc;
DELETE ri FROM recipe_items ri JOIN recipes r ON r.id = ri.recipe_id WHERE r.outlet_id = @krwc;
DELETE FROM recipes WHERE outlet_id = @krwc;

-- Stock items (created only when missing).
INSERT INTO stock_items (sku, name, unit_id, category_id, account_id, reorder_level, status)
SELECT 'TMP-NEW', 'LYCHEE BUAH', (SELECT id FROM units WHERE code = 'PCS'), (SELECT id FROM stock_item_categories WHERE name = 'Raw Material'), NULL, 0, 'ACTIVE'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM stock_items WHERE name = 'LYCHEE BUAH');
UPDATE stock_items SET sku = CONCAT('ITM-', LPAD(id, 5, '0')) WHERE sku = 'TMP-NEW';
INSERT INTO stock_items (sku, name, unit_id, category_id, account_id, reorder_level, status)
SELECT 'TMP-NEW', 'STRAWBERRY SYRUP', (SELECT id FROM units WHERE code = 'ML'), (SELECT id FROM stock_item_categories WHERE name = 'Raw Material'), NULL, 0, 'ACTIVE'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM stock_items WHERE name = 'STRAWBERRY SYRUP');
UPDATE stock_items SET sku = CONCAT('ITM-', LPAD(id, 5, '0')) WHERE sku = 'TMP-NEW';
INSERT INTO stock_items (sku, name, unit_id, category_id, account_id, reorder_level, status)
SELECT 'TMP-NEW', 'MINYAK BAWANG PUTIH', (SELECT id FROM units WHERE code = 'ML'), (SELECT id FROM stock_item_categories WHERE name = 'Raw Material'), NULL, 0, 'ACTIVE'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM stock_items WHERE name = 'MINYAK BAWANG PUTIH');
UPDATE stock_items SET sku = CONCAT('ITM-', LPAD(id, 5, '0')) WHERE sku = 'TMP-NEW';
INSERT INTO stock_items (sku, name, unit_id, category_id, account_id, reorder_level, status)
SELECT 'TMP-NEW', 'MINYAK BAWANG MERAH', (SELECT id FROM units WHERE code = 'GR'), (SELECT id FROM stock_item_categories WHERE name = 'Raw Material'), NULL, 0, 'ACTIVE'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM stock_items WHERE name = 'MINYAK BAWANG MERAH');
UPDATE stock_items SET sku = CONCAT('ITM-', LPAD(id, 5, '0')) WHERE sku = 'TMP-NEW';
INSERT INTO stock_items (sku, name, unit_id, category_id, account_id, reorder_level, status)
SELECT 'TMP-NEW', 'CURRY BLOK', (SELECT id FROM units WHERE code = 'PORSI'), (SELECT id FROM stock_item_categories WHERE name = 'Raw Material'), NULL, 0, 'ACTIVE'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM stock_items WHERE name = 'CURRY BLOK');
UPDATE stock_items SET sku = CONCAT('ITM-', LPAD(id, 5, '0')) WHERE sku = 'TMP-NEW';
INSERT INTO stock_items (sku, name, unit_id, category_id, account_id, reorder_level, status)
SELECT 'TMP-NEW', 'MIE KERITING 3 TELUR', (SELECT id FROM units WHERE code = 'GR'), (SELECT id FROM stock_item_categories WHERE name = 'Raw Material'), NULL, 0, 'ACTIVE'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM stock_items WHERE name = 'MIE KERITING 3 TELUR');
UPDATE stock_items SET sku = CONCAT('ITM-', LPAD(id, 5, '0')) WHERE sku = 'TMP-NEW';
INSERT INTO stock_items (sku, name, unit_id, category_id, account_id, reorder_level, status)
SELECT 'TMP-NEW', 'SAUS BBQ', (SELECT id FROM units WHERE code = 'ML'), (SELECT id FROM stock_item_categories WHERE name = 'Raw Material'), NULL, 0, 'ACTIVE'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM stock_items WHERE name = 'SAUS BBQ');
UPDATE stock_items SET sku = CONCAT('ITM-', LPAD(id, 5, '0')) WHERE sku = 'TMP-NEW';
INSERT INTO stock_items (sku, name, unit_id, category_id, account_id, reorder_level, status)
SELECT 'TMP-NEW', 'AYAM TERIYAKI', (SELECT id FROM units WHERE code = 'PORSI'), (SELECT id FROM stock_item_categories WHERE name = 'Raw Material'), NULL, 0, 'ACTIVE'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM stock_items WHERE name = 'AYAM TERIYAKI');
UPDATE stock_items SET sku = CONCAT('ITM-', LPAD(id, 5, '0')) WHERE sku = 'TMP-NEW';
INSERT INTO stock_items (sku, name, unit_id, category_id, account_id, reorder_level, status)
SELECT 'TMP-NEW', 'CHICKEN TERIYAKI', (SELECT id FROM units WHERE code = 'PORSI'), (SELECT id FROM stock_item_categories WHERE name = 'Raw Material'), NULL, 0, 'ACTIVE'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM stock_items WHERE name = 'CHICKEN TERIYAKI');
UPDATE stock_items SET sku = CONCAT('ITM-', LPAD(id, 5, '0')) WHERE sku = 'TMP-NEW';
INSERT INTO stock_items (sku, name, unit_id, category_id, account_id, reorder_level, status)
SELECT 'TMP-NEW', 'BASE HONEY GARLIC', (SELECT id FROM units WHERE code = 'ML'), (SELECT id FROM stock_item_categories WHERE name = 'Raw Material'), NULL, 0, 'ACTIVE'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM stock_items WHERE name = 'BASE HONEY GARLIC');
UPDATE stock_items SET sku = CONCAT('ITM-', LPAD(id, 5, '0')) WHERE sku = 'TMP-NEW';
INSERT INTO stock_items (sku, name, unit_id, category_id, account_id, reorder_level, status)
SELECT 'TMP-NEW', 'SAMBAL CHILIPADI', (SELECT id FROM units WHERE code = 'GR'), (SELECT id FROM stock_item_categories WHERE name = 'Raw Material'), NULL, 0, 'ACTIVE'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM stock_items WHERE name = 'SAMBAL CHILIPADI');
UPDATE stock_items SET sku = CONCAT('ITM-', LPAD(id, 5, '0')) WHERE sku = 'TMP-NEW';
INSERT INTO stock_items (sku, name, unit_id, category_id, account_id, reorder_level, status)
SELECT 'TMP-NEW', 'SAUS HARDI FRIES', (SELECT id FROM units WHERE code = 'PACK'), (SELECT id FROM stock_item_categories WHERE name = 'Raw Material'), NULL, 0, 'ACTIVE'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM stock_items WHERE name = 'SAUS HARDI FRIES');
UPDATE stock_items SET sku = CONCAT('ITM-', LPAD(id, 5, '0')) WHERE sku = 'TMP-NEW';

-- Recipes (68 products, outlet KRWC).

-- BEV-00001 <- sheet "Espresso"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'BEV-00001';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'BEV-00001'
JOIN (SELECT 'BEANS HB' AS n, 18 AS qty, 'GR' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- BEV-00002 <- sheet "Long Black"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'BEV-00002';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'BEV-00002'
JOIN (SELECT 'BEANS HB' AS n, 18 AS qty, 'GR' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- BEV-00003 <- sheet "Hardi Kopi Pemula"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'BEV-00003';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'BEV-00003'
JOIN (SELECT 'BEANS HB' AS n, 18 AS qty, 'GR' AS u UNION ALL SELECT 'GULA AREN' AS n, 18 AS qty, 'ML' AS u UNION ALL SELECT 'CREAMER' AS n, 23 AS qty, 'GR' AS u UNION ALL SELECT 'SUSU UHT' AS n, 100 AS qty, 'ML' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- BEV-00005 <- sheet "Magic Coffee"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'BEV-00005';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'BEV-00005'
JOIN (SELECT 'BEANS HB' AS n, 18 AS qty, 'GR' AS u UNION ALL SELECT 'SUSU UHT' AS n, 120 AS qty, 'ML' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- BEV-00006 <- sheet "Cafe Latte"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'BEV-00006';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'BEV-00006'
JOIN (SELECT 'BEANS HB' AS n, 18 AS qty, 'GR' AS u UNION ALL SELECT 'SUSU UHT' AS n, 150 AS qty, 'ML' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- BEV-00007 <- sheet "Cafe Latte"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'BEV-00007';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'BEV-00007'
JOIN (SELECT 'BEANS HB' AS n, 18 AS qty, 'GR' AS u UNION ALL SELECT 'SUSU UHT' AS n, 150 AS qty, 'ML' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- BEV-00008 <- sheet "Raisin Butterscotch"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'BEV-00008';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'BEV-00008'
JOIN (SELECT 'BEANS HB' AS n, 18 AS qty, 'GR' AS u UNION ALL SELECT 'SYRUP BUTTERSCOTCH' AS n, 15 AS qty, 'ML' AS u UNION ALL SELECT 'RAISIN SYRUP' AS n, 15 AS qty, 'ML' AS u UNION ALL SELECT 'SUSU UHT' AS n, 120 AS qty, 'ML' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- BEV-00009 <- sheet "Salted Caramel Coffee"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'BEV-00009';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'BEV-00009'
JOIN (SELECT 'BEANS HB' AS n, 18 AS qty, 'GR' AS u UNION ALL SELECT 'SUSU UHT' AS n, 100 AS qty, 'ML' AS u UNION ALL SELECT 'SALTED CARAMEL SAUCE' AS n, 20 AS qty, 'ML' AS u UNION ALL SELECT 'SYRUP CARAMEL' AS n, 10 AS qty, 'ML' AS u UNION ALL SELECT 'CREAMER' AS n, 20 AS qty, 'GR' AS u UNION ALL SELECT 'WHIPPED CREAM' AS n, 10 AS qty, 'ML' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- BEV-00010 <- sheet "Brulee Butterscotsh"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'BEV-00010';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'BEV-00010'
JOIN (SELECT 'BEANS HB' AS n, 18 AS qty, 'GR' AS u UNION ALL SELECT 'SYRUP BUTTERSCOTCH' AS n, 25 AS qty, 'ML' AS u UNION ALL SELECT 'SUSU UHT' AS n, 120 AS qty, 'ML' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- BEV-00011 <- sheet "Affogato"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'BEV-00011';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'BEV-00011'
JOIN (SELECT 'BEANS HB' AS n, 18 AS qty, 'GR' AS u UNION ALL SELECT 'ICE CREAM VANILLA' AS n, 100 AS qty, 'GR' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- BEV-00022 <- sheet "Chocolatte"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'BEV-00022';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'BEV-00022'
JOIN (SELECT 'SUSU UHT' AS n, 120 AS qty, 'ML' AS u UNION ALL SELECT 'CHOCO POWDER' AS n, 15 AS qty, 'GR' AS u UNION ALL SELECT 'SKM' AS n, 20 AS qty, 'ML' AS u UNION ALL SELECT 'SIMPLE SYRUP' AS n, 10 AS qty, 'ML' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- BEV-00023 <- sheet "Ice Choco Mint"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'BEV-00023';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'BEV-00023'
JOIN (SELECT 'CHOCO POWDER' AS n, 15 AS qty, 'GR' AS u UNION ALL SELECT 'SUSU UHT' AS n, 120 AS qty, 'ML' AS u UNION ALL SELECT 'SYRUP MINT' AS n, 25 AS qty, 'ML' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- BEV-00024 <- sheet "Matcha Latte"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'BEV-00024';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'BEV-00024'
JOIN (SELECT 'SUSU UHT' AS n, 120 AS qty, 'ML' AS u UNION ALL SELECT 'MATCHA POWDER' AS n, 20 AS qty, 'GR' AS u UNION ALL SELECT 'CREAMER' AS n, 20 AS qty, 'GR' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- BEV-00025 <- sheet "Milky Mango"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'BEV-00025';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'BEV-00025'
JOIN (SELECT 'MANGO POWDER' AS n, 7 AS qty, 'GR' AS u UNION ALL SELECT 'SUSU UHT' AS n, 120 AS qty, 'ML' AS u UNION ALL SELECT 'MANGO JAM' AS n, 30 AS qty, 'GR' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- BEV-00026 <- sheet "Lotus Biscoff"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'BEV-00026';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'BEV-00026'
JOIN (SELECT 'LOTUS JAM' AS n, 30 AS qty, 'GR' AS u UNION ALL SELECT 'SYRUP CARAMEL' AS n, 10 AS qty, 'ML' AS u UNION ALL SELECT 'SUSU UHT' AS n, 120 AS qty, 'ML' AS u UNION ALL SELECT 'COLD FOAM' AS n, 60 AS qty, 'ML' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- BEV-00027 <- sheet "Lychee Tea"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'BEV-00027';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'BEV-00027'
JOIN (SELECT 'LYCHEE SYRUP' AS n, 20 AS qty, 'ML' AS u UNION ALL SELECT 'SIMPLE SYRUP' AS n, 20 AS qty, 'ML' AS u UNION ALL SELECT 'LYCHEE BUAH' AS n, 2 AS qty, 'PCS' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- BEV-00021 <- sheet "Lemon Tea"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'BEV-00021';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'BEV-00021'
JOIN (SELECT 'SUPER JUICE LEMON' AS n, 30 AS qty, 'ML' AS u UNION ALL SELECT 'SIMPLE SYRUP' AS n, 30 AS qty, 'ML' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- BEV-00028 <- sheet "Teh Tarik Hardi"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'BEV-00028';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'BEV-00028'
JOIN (SELECT 'CREAMER' AS n, 10 AS qty, 'GR' AS u UNION ALL SELECT 'SUSU UHT' AS n, 120 AS qty, 'ML' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- BEV-00014 <- sheet "Discovery in Midnight"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'BEV-00014';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'BEV-00014'
JOIN (SELECT 'CRANBERRY JUICE' AS n, 50 AS qty, 'ML' AS u UNION ALL SELECT 'RASPBERRY SYRUP' AS n, 20 AS qty, 'ML' AS u UNION ALL SELECT 'BEANS HB' AS n, 22 AS qty, 'GR' AS u UNION ALL SELECT 'ZODA' AS n, 70 AS qty, 'ML' AS u UNION ALL SELECT 'SUPER JUICE LEMON' AS n, 5 AS qty, 'ML' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- BEV-00015 <- sheet "Summer Drink"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'BEV-00015';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'BEV-00015'
JOIN (SELECT 'BLUE CURACAO' AS n, 30 AS qty, 'ML' AS u UNION ALL SELECT 'SUPER JUICE LEMON' AS n, 15 AS qty, 'ML' AS u UNION ALL SELECT 'RASPBERRY SYRUP' AS n, 20 AS qty, 'ML' AS u UNION ALL SELECT 'ZODA' AS n, 70 AS qty, 'ML' AS u UNION ALL SELECT 'SIMPLE SYRUP' AS n, 10 AS qty, 'ML' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- BEV-00016 <- sheet "Mango Blast"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'BEV-00016';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'BEV-00016'
JOIN (SELECT 'YAKULT' AS n, 1 AS qty, 'PCS' AS u UNION ALL SELECT 'ZODA' AS n, 100 AS qty, 'ML' AS u UNION ALL SELECT 'MANGO JAM' AS n, 30 AS qty, 'GR' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- BEV-00017 <- sheet "Berry Blast"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'BEV-00017';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'BEV-00017'
JOIN (SELECT 'YAKULT' AS n, 1 AS qty, 'PCS' AS u UNION ALL SELECT 'ZODA' AS n, 100 AS qty, 'ML' AS u UNION ALL SELECT 'STRAWBERRY JAM' AS n, 30 AS qty, 'GR' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- BEV-00018 <- sheet "Jack Froast"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'BEV-00018';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'BEV-00018'
JOIN (SELECT 'BLUE CURACAO' AS n, 30 AS qty, 'ML' AS u UNION ALL SELECT 'RAISIN SYRUP' AS n, 10 AS qty, 'ML' AS u UNION ALL SELECT 'SUPER JUICE LEMON' AS n, 20 AS qty, 'ML' AS u UNION ALL SELECT 'SUSU UHT' AS n, 100 AS qty, 'ML' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- BEV-00019 <- sheet "Black Lemonade"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'BEV-00019';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'BEV-00019'
JOIN (SELECT 'BEANS HB' AS n, 18 AS qty, 'GR' AS u UNION ALL SELECT 'SUPER JUICE LEMON' AS n, 30 AS qty, 'ML' AS u UNION ALL SELECT 'SIMPLE SYRUP' AS n, 20 AS qty, 'ML' AS u UNION ALL SELECT 'ZODA' AS n, 70 AS qty, 'ML' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- BEV-00012 <- sheet "BerryMan"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'BEV-00012';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'BEV-00012'
JOIN (SELECT 'MADU MANUKA' AS n, 15 AS qty, 'GR' AS u UNION ALL SELECT 'STRAWBERRY SYRUP' AS n, 20 AS qty, 'ML' AS u UNION ALL SELECT 'BEANS HB' AS n, 18 AS qty, 'GR' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- BEV-00013 <- sheet "Peach Presso"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'BEV-00013';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'BEV-00013'
JOIN (SELECT 'PEACH SYRUP' AS n, 15 AS qty, 'GR' AS u UNION ALL SELECT 'ORANGE JUICE DIAMOND' AS n, 100 AS qty, 'ML' AS u UNION ALL SELECT 'BEANS HB' AS n, 18 AS qty, 'GR' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- BEV-00029 <- sheet "Cookies n Cream"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'BEV-00029';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'BEV-00029'
JOIN (SELECT 'ICE CREAM VANILLA' AS n, 50 AS qty, 'GR' AS u UNION ALL SELECT 'SUSU UHT' AS n, 100 AS qty, 'ML' AS u UNION ALL SELECT 'SIMPLE SYRUP' AS n, 20 AS qty, 'ML' AS u UNION ALL SELECT 'VANILLA SYRUP' AS n, 20 AS qty, 'ML' AS u UNION ALL SELECT 'SKM' AS n, 15 AS qty, 'ML' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- BEV-00030 <- sheet "Strawberry Milkshake"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'BEV-00030';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'BEV-00030'
JOIN (SELECT 'STRAWBERRY SAUCE' AS n, 20 AS qty, 'ML' AS u UNION ALL SELECT 'ICE CREAM VANILLA' AS n, 50 AS qty, 'GR' AS u UNION ALL SELECT 'SUSU UHT' AS n, 100 AS qty, 'ML' AS u UNION ALL SELECT 'MILKY POWDER' AS n, 5 AS qty, 'GR' AS u UNION ALL SELECT 'SKM' AS n, 10 AS qty, 'ML' AS u UNION ALL SELECT 'SIMPLE SYRUP' AS n, 15 AS qty, 'ML' AS u UNION ALL SELECT 'STRAWBERRY JAM' AS n, 30 AS qty, 'GR' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00040 <- sheet "MONTBLANK"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00040';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00040'
JOIN (SELECT 'BEANS HB' AS n, 18 AS qty, 'GR' AS u UNION ALL SELECT 'ORANGE JUICE DIAMOND' AS n, 110 AS qty, 'ML' AS u UNION ALL SELECT 'BUAH VITA ORANGE' AS n, 40 AS qty, 'GR' AS u UNION ALL SELECT 'WHIPPED CREAM' AS n, 20 AS qty, 'ML' AS u UNION ALL SELECT 'VANILLA SYRUP' AS n, 5 AS qty, 'ML' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00001 <- sheet "Nasi Goreng Sei"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00001';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00001'
JOIN (SELECT 'DAGING SEI' AS n, 1 AS qty, 'PCS' AS u UNION ALL SELECT 'TELUR' AS n, 2 AS qty, 'PCS' AS u UNION ALL SELECT 'BERAS' AS n, 110 AS qty, 'GR' AS u UNION ALL SELECT 'BASE NASI GORENG' AS n, 40 AS qty, 'ML' AS u UNION ALL SELECT 'MINYAK BAWANG PUTIH' AS n, 15 AS qty, 'ML' AS u UNION ALL SELECT 'MINYAK BAWANG MERAH' AS n, 18 AS qty, 'GR' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00003 <- sheet "Curry Chicken Rice"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00003';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00003'
JOIN (SELECT 'CHICKEN KATSU' AS n, 1 AS qty, 'PACK' AS u UNION ALL SELECT 'CURRY BLOK' AS n, 1 AS qty, 'PORSI' AS u UNION ALL SELECT 'BERAS' AS n, 90 AS qty, 'GR' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00004 <- sheet "Nanban Chicken"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00004';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00004'
JOIN (SELECT 'CHICKEN CRISPY' AS n, 1 AS qty, 'PACK' AS u UNION ALL SELECT 'BERAS' AS n, 90 AS qty, 'GR' AS u UNION ALL SELECT 'MAYO NANBAN' AS n, 40 AS qty, 'GR' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00008 <- sheet "Mie Goreng Kampung"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00008';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00008'
JOIN (SELECT 'BAKSO IKAN' AS n, 1 AS qty, 'PCS' AS u UNION ALL SELECT 'BAKSO DAGING' AS n, 2 AS qty, 'PCS' AS u UNION ALL SELECT 'MIE KERITING 3 TELUR' AS n, 67 AS qty, 'GR' AS u UNION ALL SELECT 'BASE NASI GORENG' AS n, 40 AS qty, 'ML' AS u UNION ALL SELECT 'MINYAK BAWANG PUTIH' AS n, 15 AS qty, 'ML' AS u UNION ALL SELECT 'MINYAK BAWANG MERAH' AS n, 18 AS qty, 'GR' AS u UNION ALL SELECT 'TELUR' AS n, 1 AS qty, 'PCS' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00007 <- sheet "Mie Nyemek"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00007';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00007'
JOIN (SELECT 'BAKSO IKAN' AS n, 1 AS qty, 'PCS' AS u UNION ALL SELECT 'BAKSO DAGING' AS n, 2 AS qty, 'PCS' AS u UNION ALL SELECT 'INDOMIE GORENG' AS n, 1 AS qty, 'PCS' AS u UNION ALL SELECT 'TELUR' AS n, 1 AS qty, 'PCS' AS u UNION ALL SELECT 'BASE MIE NYEMEK' AS n, 15 AS qty, 'ML' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00006 <- sheet "Mie Godok"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00006';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00006'
JOIN (SELECT 'BAKSO IKAN' AS n, 1 AS qty, 'PCS' AS u UNION ALL SELECT 'BAKSO DAGING' AS n, 2 AS qty, 'PCS' AS u UNION ALL SELECT 'INDOMIE GORENG' AS n, 1 AS qty, 'PCS' AS u UNION ALL SELECT 'BASE NASI GORENG' AS n, 30 AS qty, 'ML' AS u UNION ALL SELECT 'MINYAK BAWANG PUTIH' AS n, 15 AS qty, 'ML' AS u UNION ALL SELECT 'MINYAK BAWANG MERAH' AS n, 18 AS qty, 'GR' AS u UNION ALL SELECT 'TELUR' AS n, 1 AS qty, 'PCS' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00009 <- sheet "Grill Chicken Steak"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00009';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00009'
JOIN (SELECT 'CHICKEN STEAK' AS n, 1 AS qty, 'PACK' AS u UNION ALL SELECT 'KENTANG 130' AS n, 1 AS qty, 'PACK' AS u UNION ALL SELECT 'SAUS BBQ' AS n, 20 AS qty, 'ML' AS u UNION ALL SELECT 'SAUS SAMBAL' AS n, 50 AS qty, 'ML' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00010 <- sheet "Crispy Chicken Steak"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00010';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00010'
JOIN (SELECT 'CHICKEN CRISPY' AS n, 1 AS qty, 'PACK' AS u UNION ALL SELECT 'KENTANG 130' AS n, 1 AS qty, 'PACK' AS u UNION ALL SELECT 'SAUS BBQ' AS n, 20 AS qty, 'ML' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00005 <- sheet "Cordon Bleu"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00005';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00005'
JOIN (SELECT 'CHICKEN CORDON' AS n, 1 AS qty, 'PORSI' AS u UNION ALL SELECT 'KENTANG 130' AS n, 1 AS qty, 'PACK' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00011 <- sheet "Oyakodon"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00011';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00011'
JOIN (SELECT 'AYAM TERIYAKI' AS n, 1 AS qty, 'PORSI' AS u UNION ALL SELECT 'BASE OYAKODON' AS n, 70 AS qty, 'ML' AS u UNION ALL SELECT 'TELUR' AS n, 1 AS qty, 'PCS' AS u UNION ALL SELECT 'BERAS' AS n, 90 AS qty, 'GR' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00012 <- sheet "Katsudon"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00012';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00012'
JOIN (SELECT 'CHICKEN KATSU' AS n, 1 AS qty, 'PACK' AS u UNION ALL SELECT 'TELUR' AS n, 2 AS qty, 'PCS' AS u UNION ALL SELECT 'BERAS' AS n, 90 AS qty, 'GR' AS u UNION ALL SELECT 'BASE OYAKODON' AS n, 70 AS qty, 'ML' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00013 <- sheet "Salted egg"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00013';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00013'
JOIN (SELECT 'CHICKEN POP' AS n, 1 AS qty, 'PACK' AS u UNION ALL SELECT 'KUNING TELUR' AS n, 1 AS qty, 'PCS' AS u UNION ALL SELECT 'SUSU UHT' AS n, 70 AS qty, 'ML' AS u UNION ALL SELECT 'TELUR' AS n, 1 AS qty, 'PCS' AS u UNION ALL SELECT 'BERAS' AS n, 90 AS qty, 'GR' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00014 <- sheet "CHICKEN TERIYAKI"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00014';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00014'
JOIN (SELECT 'CHICKEN TERIYAKI' AS n, 1 AS qty, 'PORSI' AS u UNION ALL SELECT 'TELUR' AS n, 1 AS qty, 'PCS' AS u UNION ALL SELECT 'BASE MIE NYEMEK' AS n, 40 AS qty, 'ML' AS u UNION ALL SELECT 'BERAS' AS n, 90 AS qty, 'GR' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00015 <- sheet "Chicken Mentai"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00015';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00015'
JOIN (SELECT 'CHICKEN POP' AS n, 1 AS qty, 'PACK' AS u UNION ALL SELECT 'TELUR' AS n, 1 AS qty, 'PCS' AS u UNION ALL SELECT 'MAYO MENTAI' AS n, 40 AS qty, 'GR' AS u UNION ALL SELECT 'BERAS' AS n, 90 AS qty, 'GR' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00016 <- sheet "Honey Garlic Chicken"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00016';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00016'
JOIN (SELECT 'CHICKEN POP' AS n, 1 AS qty, 'PACK' AS u UNION ALL SELECT 'TELUR' AS n, 1 AS qty, 'PCS' AS u UNION ALL SELECT 'BASE HONEY GARLIC' AS n, 20 AS qty, 'ML' AS u UNION ALL SELECT 'BERAS' AS n, 90 AS qty, 'GR' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00017 <- sheet "Chilipadi"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00017';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00017'
JOIN (SELECT 'CHICKEN POP' AS n, 1 AS qty, 'PACK' AS u UNION ALL SELECT 'TELUR' AS n, 1 AS qty, 'PCS' AS u UNION ALL SELECT 'SAMBAL CHILIPADI' AS n, 40 AS qty, 'GR' AS u UNION ALL SELECT 'BERAS' AS n, 90 AS qty, 'GR' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00018 <- sheet "BOLOGNESE"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00018';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00018'
JOIN (SELECT 'PASTA SPAGHETTI' AS n, 75 AS qty, 'GR' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00019 <- sheet "Aglio Olio"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00019';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00019'
JOIN (SELECT 'PASTA SPAGHETTI' AS n, 75 AS qty, 'GR' AS u UNION ALL SELECT 'TUNA CHUNK' AS n, 45 AS qty, 'GR' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00022 <- sheet "Hardi Chicken Fries"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00022';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00022'
JOIN (SELECT 'CHICKEN HARDI' AS n, 1 AS qty, 'PCS' AS u UNION ALL SELECT 'KENTANG 180' AS n, 1 AS qty, 'PACK' AS u UNION ALL SELECT 'SAUS HARDI FRIES' AS n, 1 AS qty, 'PACK' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00023 <- sheet "Hardi Fries"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00023';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00023'
JOIN (SELECT 'KENTANG 180' AS n, 1 AS qty, 'PACK' AS u UNION ALL SELECT 'SAUS HARDI FRIES' AS n, 1 AS qty, 'PACK' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00024 <- sheet "French Fries"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00024';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00024'
JOIN (SELECT 'KENTANG 180' AS n, 1 AS qty, 'PACK' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00025 <- sheet "Mix Platter"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00025';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00025'
JOIN (SELECT 'MIX PLATTER' AS n, 1 AS qty, 'PORSI' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00026 <- sheet "Cireng"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00026';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00026'
JOIN (SELECT 'CIRENG' AS n, 1 AS qty, 'PACK' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00027 <- sheet "Pisang Goreng Kampung"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00027';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00027'
JOIN (SELECT 'PISANG' AS n, 1 AS qty, 'PORSI' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00028 <- sheet "Singkong Goreng"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00028';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00028'
JOIN (SELECT 'SINGKONG' AS n, 1 AS qty, 'PORSI' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00029 <- sheet "tahu Goreng isi"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00029';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00029'
JOIN (SELECT 'TAHU GORENG ISI' AS n, 1 AS qty, 'PACK' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00030 <- sheet "Mentai Dimsum"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00030';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00030'
JOIN (SELECT 'DIMSUM' AS n, 1 AS qty, 'PORSI' AS u UNION ALL SELECT 'MAYO MENTAI' AS n, 40 AS qty, 'GR' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00031 <- sheet "OTAK OTAK"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00031';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00031'
JOIN (SELECT 'OTAK OTAK' AS n, 1 AS qty, 'PACK' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00032 <- sheet "Donut kentang"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00032';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00032'
JOIN (SELECT 'POTATO DONUT' AS n, 1 AS qty, 'PCS' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00044 <- sheet "Ubee Toast"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00044';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00044'
JOIN (SELECT 'TARO POWDER' AS n, 7 AS qty, 'GR' AS u UNION ALL SELECT 'SKM' AS n, 5 AS qty, 'ML' AS u UNION ALL SELECT 'WHIPPED CREAM' AS n, 10 AS qty, 'ML' AS u UNION ALL SELECT 'SUSU UHT' AS n, 20 AS qty, 'ML' AS u UNION ALL SELECT 'ROTI TOAST' AS n, 1 AS qty, 'PORSI' AS u UNION ALL SELECT 'TELUR' AS n, 1 AS qty, 'PCS' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00041 <- sheet "Matcha Toast"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00041';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00041'
JOIN (SELECT 'MATCHA POWDER' AS n, 7 AS qty, 'GR' AS u UNION ALL SELECT 'WHIPPED CREAM' AS n, 10 AS qty, 'ML' AS u UNION ALL SELECT 'SKM' AS n, 5 AS qty, 'ML' AS u UNION ALL SELECT 'SUSU UHT' AS n, 20 AS qty, 'ML' AS u UNION ALL SELECT 'TELUR' AS n, 1 AS qty, 'PCS' AS u UNION ALL SELECT 'ROTI TOAST' AS n, 1 AS qty, 'PORSI' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00042 <- sheet "Chocolate Toast"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00042';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00042'
JOIN (SELECT 'CHOCO POWDER' AS n, 7 AS qty, 'GR' AS u UNION ALL SELECT 'WHIPPED CREAM' AS n, 10 AS qty, 'ML' AS u UNION ALL SELECT 'SUSU UHT' AS n, 20 AS qty, 'ML' AS u UNION ALL SELECT 'SKM' AS n, 5 AS qty, 'ML' AS u UNION ALL SELECT 'ROTI TOAST' AS n, 1 AS qty, 'PORSI' AS u UNION ALL SELECT 'TELUR' AS n, 1 AS qty, 'PCS' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00043 <- sheet "Milky Toast"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00043';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00043'
JOIN (SELECT 'MILKY POWDER' AS n, 7 AS qty, 'GR' AS u UNION ALL SELECT 'SKM' AS n, 5 AS qty, 'ML' AS u UNION ALL SELECT 'WHIPPED CREAM' AS n, 10 AS qty, 'ML' AS u UNION ALL SELECT 'SUSU UHT' AS n, 20 AS qty, 'ML' AS u UNION ALL SELECT 'TELUR' AS n, 1 AS qty, 'PCS' AS u UNION ALL SELECT 'ROTI TOAST' AS n, 1 AS qty, 'PORSI' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00035 <- sheet "Classic Pain Au Chocolate"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00035';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00035'
JOIN (SELECT 'PAIN AU CHOCO' AS n, 1 AS qty, 'PCS' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00036 <- sheet "Blueberry Cheese Danish"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00036';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00036'
JOIN (SELECT 'BLUEBERRY DANISH' AS n, 1 AS qty, 'PCS' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00037 <- sheet "Cheesecake  Danish"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00037';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00037'
JOIN (SELECT 'CHEESE DANISH' AS n, 1 AS qty, 'PCS' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00034 <- sheet "BUTTER CROISANT"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00034';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00034'
JOIN (SELECT 'BUTTERCROISSANT' AS n, 1 AS qty, 'PCS' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- FOD-00021 <- sheet "piscok"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'FOD-00021';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'FOD-00021'
JOIN (SELECT 'PISCOK' AS n, 1 AS qty, 'PORSI' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

-- BEV-00004 <- sheet "HARDI KOPI"
INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active)
SELECT @krwc, id, 1, 1, 1 FROM products WHERE sku = 'BEV-00004';
INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id)
SELECT r.id, si.id, l.qty, un.id FROM recipes r JOIN products p ON p.id = r.product_id AND p.sku = 'BEV-00004'
JOIN (SELECT 'BEANS HB' AS n, 18 AS qty, 'GR' AS u UNION ALL SELECT 'GULA AREN' AS n, 18 AS qty, 'ML' AS u UNION ALL SELECT 'CREAMER' AS n, 23 AS qty, 'GR' AS u UNION ALL SELECT 'SUSU UHT' AS n, 100 AS qty, 'ML' AS u) l JOIN stock_items si ON si.name = l.n JOIN units un ON un.code = l.u
WHERE r.outlet_id = @krwc;

UPDATE outlet_products op JOIN recipes r ON r.outlet_id = op.outlet_id AND r.product_id = op.product_id
SET op.recipe_id = r.id WHERE op.outlet_id = @krwc;

COMMIT;
