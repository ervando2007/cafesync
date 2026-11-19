-- POS sales no longer journal their money side (Kas/Bank, Penjualan, PB1 —
-- revenue lives in the sales report only; the COGS journal still posts). Drop
-- the journals the old test orders created, then empty the product/menu master: every product, outlet price, recipe (BOM) and the test
-- orders that referenced them. Stock items (ingredients), categories, outlets
-- and tables stay.
DELETE jl FROM journal_lines jl
  JOIN journal_entries je ON je.id = jl.journal_entry_id
 WHERE je.source_type IN ('ORDER_SALE', 'ORDER_COGS');
DELETE FROM journal_entries WHERE source_type IN ('ORDER_SALE', 'ORDER_COGS');

DELETE FROM inventory_movements WHERE reference_type = 'ORDER';
DELETE FROM payments;
DELETE FROM order_items;
DELETE FROM orders;
UPDATE dining_tables SET status = 'AVAILABLE' WHERE status = 'OCCUPIED';

UPDATE outlet_products SET recipe_id = NULL;
DELETE FROM recipe_items;
DELETE FROM recipes;
DELETE FROM outlet_products;
DELETE FROM products;
