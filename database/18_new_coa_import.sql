-- Full Chart of Accounts import (replaces the placeholder 8-row seed COA).
-- Source: user-supplied COA.pdf. Hierarchical (parent_id) codes using the
-- "1000.001" dot-notation exactly as given in the source document.

-- 0) Three of the old flat-COA codes (1200, 2100, 3100) collide with new
--    parent-category codes, and none of these three are referenced by any
--    journal_lines/cash_transactions (only 1100 and 4100 are, remapped in
--    step 4 below) — safe to remove up front so the new codes can be reused.
DELETE FROM accounts WHERE code IN ('1200', '2100', '3100');

-- 1) Header / parent category accounts (and the 3 standalone equity accounts
--    that have no children in the source document).
INSERT INTO accounts (code, name, account_type) VALUES
('1000', 'KAS DAN BANK', 'ASSET'),
('1200', 'PERSEDIAAN', 'ASSET'),
('1300', 'AKTIVA LANCAR LAINNYA', 'ASSET'),
('1700', 'AKTIVA TETAP', 'ASSET'),
('1710', 'AKUMULASI PENYUSUTAN', 'ASSET'),
('2000', 'HUTANG LANCAR', 'LIABILITY'),
('2100', 'HUTANG LANCAR LAINNYA', 'LIABILITY'),
('2200', 'HUTANG JANGKA PANJANG', 'LIABILITY'),
('3000', 'MODAL', 'EQUITY'),
('3100', 'LABA RUGI TAHUN LALU', 'EQUITY'),
('3200', 'LABA RUGI TAHUN BERJALAN', 'EQUITY'),
('4000', 'PENDAPATAN', 'REVENUE'),
('5000', 'HPP', 'EXPENSE'),
('6100', 'BIAYA OPERASIONAL', 'EXPENSE'),
('6200', 'BIAYA ADMINISTRASI DAN UMUM', 'EXPENSE'),
('7200', 'BIAYA LAIN', 'EXPENSE');

-- 2) MySQL/MariaDB disallows a subquery on the same table an INSERT targets,
--    so capture each parent's id into a session variable first.
SET @p1000 = (SELECT id FROM accounts WHERE code = '1000');
SET @p1200 = (SELECT id FROM accounts WHERE code = '1200');
SET @p1300 = (SELECT id FROM accounts WHERE code = '1300');
SET @p1700 = (SELECT id FROM accounts WHERE code = '1700');
SET @p1710 = (SELECT id FROM accounts WHERE code = '1710');
SET @p2000 = (SELECT id FROM accounts WHERE code = '2000');
SET @p2100 = (SELECT id FROM accounts WHERE code = '2100');
SET @p2200 = (SELECT id FROM accounts WHERE code = '2200');
SET @p4000 = (SELECT id FROM accounts WHERE code = '4000');
SET @p5000 = (SELECT id FROM accounts WHERE code = '5000');
SET @p6100 = (SELECT id FROM accounts WHERE code = '6100');
SET @p6200 = (SELECT id FROM accounts WHERE code = '6200');
SET @p7200 = (SELECT id FROM accounts WHERE code = '7200');

-- 3) Kas & Bank leaf accounts — the only ones flagged is_cash_bank=1, used by
--    the Cash Flow / Cash / Bank reports.
INSERT INTO accounts (code, name, account_type, is_cash_bank, parent_id) VALUES
('1000.001', 'KAS', 'ASSET', 1, @p1000),
('1000.002', 'BRI', 'ASSET', 1, @p1000),
('1000.003', 'BCA 1', 'ASSET', 1, @p1000),
('1000.004', 'BCA 2', 'ASSET', 1, @p1000);

-- 4) Every other leaf account, grouped by parent.
INSERT INTO accounts (code, name, account_type, parent_id) VALUES
('1200.001', 'PERSEDIAAN', 'ASSET', @p1200),
('1300.001', 'PIUTANG KARYAWAN', 'ASSET', @p1300),
('1700.001', 'TANAH', 'ASSET', @p1700),
('1700.002', 'GEDUNG', 'ASSET', @p1700),
('1700.003', 'PERALATAN', 'ASSET', @p1700),
('1700.004', 'INVENTARIS', 'ASSET', @p1700),
('1700.005', 'KENDARAAN', 'ASSET', @p1700),
('1710.001', 'AKM.PENYUSUTAN GEDUNG', 'ASSET', @p1710),
('1710.002', 'AKM.PENYUSUTAN PERALATAN', 'ASSET', @p1710),
('1710.003', 'AKM.PENYUSUTAN INVENTARIS', 'ASSET', @p1710),
('1710.004', 'AKM.PENYUSUTAN KENDARAAN', 'ASSET', @p1710),

('2000.001', 'HUTANG USAHA', 'LIABILITY', @p2000),
('2100.001', 'HUTANG GAJI', 'LIABILITY', @p2100),
('2100.002', 'HUTANG PB1', 'LIABILITY', @p2100),
('2100.003', 'HUTANG PPH 21', 'LIABILITY', @p2100),
('2100.004', 'HUTANG PAJAK 4(2)', 'LIABILITY', @p2100),
('2100.005', 'HUTANG PPH 25', 'LIABILITY', @p2100),
('2100.006', 'HUTANG PPH 29', 'LIABILITY', @p2100),
('2100.007', 'HUTANG PAJAK LAINNYA', 'LIABILITY', @p2100),
('2200.001', 'HUTANG BANK', 'LIABILITY', @p2200),
('2200.002', 'HUTANG LEASING', 'LIABILITY', @p2200),

('4000.001', 'PENJUALAN', 'REVENUE', @p4000),

('5000.001', 'Peach syrup', 'EXPENSE', @p5000),
('5000.002', 'Raspberry syrup', 'EXPENSE', @p5000),
('5000.003', 'Mint syrup', 'EXPENSE', @p5000),
('5000.004', 'Caramel syrup', 'EXPENSE', @p5000),
('5000.005', 'Vanilla syrup', 'EXPENSE', @p5000),
('5000.006', 'Raisin syrup', 'EXPENSE', @p5000),
('5000.007', 'Butterscotch syrup', 'EXPENSE', @p5000),
('5000.008', 'Lychee syrup', 'EXPENSE', @p5000),
('5000.009', 'Strawberry sirup', 'EXPENSE', @p5000),
('5000.010', 'Simple syrup', 'EXPENSE', @p5000),
('5000.011', 'Blue citrus - Blue Karakaw', 'EXPENSE', @p5000),
('5000.012', 'Zoda', 'EXPENSE', @p5000),
('5000.013', 'SALTED CARAMEL SYRUP', 'EXPENSE', @p5000),
('5000.014', 'Salted Caramel Syrup', 'EXPENSE', @p5000),
('5000.015', 'Madu', 'EXPENSE', @p5000),
('5000.016', 'Salted Caramel Sauce', 'EXPENSE', @p5000),
('5000.017', 'Cranberry', 'EXPENSE', @p5000),
('5000.018', 'Cold Brew', 'EXPENSE', @p5000),
('5000.019', 'Fresh Milk', 'EXPENSE', @p5000),
('5000.020', 'Orange Juice', 'EXPENSE', @p5000),
('5000.021', 'Super Juice Lemon', 'EXPENSE', @p5000),
('5000.022', 'Susu Kental Manis', 'EXPENSE', @p5000),
('5000.023', 'Yakult', 'EXPENSE', @p5000),
('5000.024', 'Based Tea', 'EXPENSE', @p5000),
('5000.025', 'Susu UHT', 'EXPENSE', @p5000),
('5000.026', 'Gula aren', 'EXPENSE', @p5000),
('5000.027', 'Pristine / Mineral Botol', 'EXPENSE', @p5000),
('5000.028', 'Creamer', 'EXPENSE', @p5000),
('5000.029', 'Teh Tarik', 'EXPENSE', @p5000),
('5000.030', 'Matcha powder', 'EXPENSE', @p5000),
('5000.031', 'Chocolate pow', 'EXPENSE', @p5000),
('5000.032', 'Mango Powder', 'EXPENSE', @p5000),
('5000.033', 'Strawberry Powder', 'EXPENSE', @p5000),
('5000.034', 'Red Velvet Powder', 'EXPENSE', @p5000),
('5000.035', 'Green Tea Powder', 'EXPENSE', @p5000),
('5000.036', 'Ubee Powder', 'EXPENSE', @p5000),
('5000.037', 'Milky Powder', 'EXPENSE', @p5000),
('5000.038', 'Mango Jam', 'EXPENSE', @p5000),
('5000.039', 'Lotus Jam', 'EXPENSE', @p5000),
('5000.040', 'Strawberry Jam', 'EXPENSE', @p5000),
('5000.041', 'Beans HB', 'EXPENSE', @p5000),
('5000.042', 'WHIP CREAM', 'EXPENSE', @p5000),
('5000.043', 'Black sesame', 'EXPENSE', @p5000),
('5000.044', 'Ice Cream vanilla', 'EXPENSE', @p5000),
('5000.045', 'Lychee Buah /KALENG', 'EXPENSE', @p5000),
('5000.046', 'Balck Biskuit', 'EXPENSE', @p5000),
('5000.047', 'Smothies Choco La''nana', 'EXPENSE', @p5000),
('5000.048', 'Strawberry Puree', 'EXPENSE', @p5000),
('5000.049', 'Blueberry Cheese Danish', 'EXPENSE', @p5000),
('5000.050', 'Butter Croissants', 'EXPENSE', @p5000),
('5000.051', 'Cheese Quice', 'EXPENSE', @p5000),
('5000.052', 'Cheesecake Danish', 'EXPENSE', @p5000),
('5000.053', 'Classic Pain Au Chocolate', 'EXPENSE', @p5000),
('5000.054', 'Pain Suisse', 'EXPENSE', @p5000),
('5000.055', 'Cheese Beef Risol', 'EXPENSE', @p5000),
('5000.056', 'Cireng', 'EXPENSE', @p5000),
('5000.057', 'French Fries', 'EXPENSE', @p5000),
('5000.058', 'Hardi Fries', 'EXPENSE', @p5000),
('5000.059', 'Kentang Goreng Steak', 'EXPENSE', @p5000),
('5000.060', 'Mix Plater', 'EXPENSE', @p5000),
('5000.061', 'Otak Otak', 'EXPENSE', @p5000),
('5000.062', 'Pisang Goreng', 'EXPENSE', @p5000),
('5000.063', 'Piscok', 'EXPENSE', @p5000),
('5000.064', 'Singkong', 'EXPENSE', @p5000),
('5000.065', 'Tahu Isi', 'EXPENSE', @p5000),
('5000.066', 'Pangsit', 'EXPENSE', @p5000),
('5000.067', 'Chiken Hardi', 'EXPENSE', @p5000),
('5000.068', 'Chiken Katsu', 'EXPENSE', @p5000),
('5000.069', 'Chiken Pop', 'EXPENSE', @p5000),
('5000.070', 'Chiken Salad', 'EXPENSE', @p5000),
('5000.071', 'Cheiken Teriyaki', 'EXPENSE', @p5000),
('5000.072', 'Dada Ayam - Grill', 'EXPENSE', @p5000),
('5000.073', 'Dada Ayam - Krispy', 'EXPENSE', @p5000),
('5000.074', 'Mie Goreng ( Indomie )', 'EXPENSE', @p5000),
('5000.075', 'Mie Keriting', 'EXPENSE', @p5000),
('5000.076', 'Fettuccine', 'EXPENSE', @p5000),
('5000.077', 'Spaghetti', 'EXPENSE', @p5000),

('6100.001', 'BIAYA OPERASIONAL RESTO', 'EXPENSE', @p6100),

('6200.001', 'BIAYA GAJI', 'EXPENSE', @p6200),
('6200.002', 'UPAH', 'EXPENSE', @p6200),
('6200.003', 'THR', 'EXPENSE', @p6200),
('6200.004', 'JKK DAN JKM', 'EXPENSE', @p6200),
('6200.005', 'JHT', 'EXPENSE', @p6200),
('6200.006', 'TUNJANGAN PPH 21', 'EXPENSE', @p6200),
('6200.007', 'BIAYA ADM & UMUM', 'EXPENSE', @p6200),
('6200.008', 'POS&MATERAI', 'EXPENSE', @p6200),
('6200.009', 'BIAYA ATK', 'EXPENSE', @p6200),
('6200.010', 'BIAYA CETAK, FOTOCOPY,JILID', 'EXPENSE', @p6200),
('6200.011', 'BIAYA PERLENGKAPAN KANTOR', 'EXPENSE', @p6200),
('6200.012', 'BIAYA LISTRIK', 'EXPENSE', @p6200),
('6200.013', 'BIAYA INTERNET DAN TELEPON', 'EXPENSE', @p6200),
('6200.014', 'BIAYA RENOVASI', 'EXPENSE', @p6200),
('6200.015', 'BIAYA MAINTENANCE', 'EXPENSE', @p6200),
('6200.016', 'BIAYA PAJAK & BEA', 'EXPENSE', @p6200),
('6200.017', 'PAJAK PB1', 'EXPENSE', @p6200),
('6200.018', 'BIAYA PAJAK LAINNYA', 'EXPENSE', @p6200),
('6200.019', 'BIAYA PENYUSUTAN PERAL', 'EXPENSE', @p6200),
('6200.020', 'BIAYA ENTERTAIN', 'EXPENSE', @p6200),
('6200.021', 'BENSIN, TOL, PARKIR', 'EXPENSE', @p6200),
('6200.022', 'KEBERSIHAN', 'EXPENSE', @p6200),
('6200.023', 'SUMBANGAN', 'EXPENSE', @p6200),

('7200.001', 'BIAYA ADMINISTRASI BANK', 'EXPENSE', @p7200),
('7200.002', 'BIAYA LAIN', 'EXPENSE', @p7200);

-- 4) Remap the real, already-posted journal lines from the old flat COA onto
--    their new equivalents before retiring the old accounts (as of this
--    migration: 1 real ORDER_SALE entry, Kas + Penjualan legs).
UPDATE journal_lines
SET account_id = (SELECT id FROM accounts WHERE code = '1000.001')
WHERE account_id = (SELECT id FROM accounts WHERE code = '1100');

UPDATE journal_lines
SET account_id = (SELECT id FROM accounts WHERE code = '4000.001')
WHERE account_id = (SELECT id FROM accounts WHERE code = '4100');

-- 5) Retire the rest of the old placeholder COA (1200/2100/3100 already
--    removed in step 0) — safe now that no journal_lines or
--    cash_transactions reference them.
DELETE FROM accounts WHERE code IN ('1100', '1110', '4100', '5100', '5200');
