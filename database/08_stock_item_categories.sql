CREATE TABLE stock_item_categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE'
);

INSERT INTO stock_item_categories (name) VALUES
  ('Raw Material'),
  ('Packaging'),
  ('Other');

ALTER TABLE stock_items ADD COLUMN category_id BIGINT UNSIGNED NULL AFTER item_type;

UPDATE stock_items si
JOIN stock_item_categories c ON (
  (si.item_type = 'RAW_MATERIAL' AND c.name = 'Raw Material') OR
  (si.item_type = 'PACKAGING' AND c.name = 'Packaging') OR
  (si.item_type = 'OTHER' AND c.name = 'Other') OR
  (si.item_type IS NULL AND c.name = 'Other')
)
SET si.category_id = c.id;

ALTER TABLE stock_items MODIFY COLUMN category_id BIGINT UNSIGNED NOT NULL;
ALTER TABLE stock_items ADD CONSTRAINT stock_items_category_fk
  FOREIGN KEY (category_id) REFERENCES stock_item_categories (id);
ALTER TABLE stock_items DROP COLUMN item_type;
