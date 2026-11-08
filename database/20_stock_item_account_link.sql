-- Links each stock item to a specific Chart of Accounts EXPENSE account
-- (e.g. the "5000.xxx HPP" ingredient-level accounts). The Add/Edit Item
-- form now picks the item's name via this account rather than free text —
-- see app/ui/inventory/item-form-modal.tsx.
ALTER TABLE stock_items
  ADD COLUMN account_id BIGINT UNSIGNED NULL AFTER category_id,
  ADD CONSTRAINT stock_items_account_fk FOREIGN KEY (account_id) REFERENCES accounts(id);
