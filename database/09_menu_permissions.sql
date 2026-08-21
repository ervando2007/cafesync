CREATE TABLE menu_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  menu_key VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

INSERT INTO menu_items (menu_key, label, sort_order) VALUES
  ('dashboard', 'Dashboard', 1),
  ('pos', 'POS', 2),
  ('inventory', 'Inventory', 3),
  ('master_data', 'Master Data', 4),
  ('settings', 'Settings', 5);

CREATE TABLE role_menu_permissions (
  role_id BIGINT UNSIGNED NOT NULL,
  menu_item_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, menu_item_id),
  KEY menu_item_id (menu_item_id),
  CONSTRAINT role_menu_permissions_role_fk FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
  CONSTRAINT role_menu_permissions_menu_fk FOREIGN KEY (menu_item_id) REFERENCES menu_items (id) ON DELETE CASCADE
);

-- Seed to match the existing hardcoded requireRole() gates exactly, so this
-- migration changes nothing about who currently sees which menu.
INSERT INTO role_menu_permissions (role_id, menu_item_id)
SELECT r.id, m.id FROM roles r
JOIN menu_items m ON (
  (r.code = 'ADMIN' AND m.menu_key IN ('dashboard', 'pos', 'inventory', 'master_data', 'settings')) OR
  (r.code = 'GM' AND m.menu_key IN ('dashboard', 'pos', 'inventory', 'master_data')) OR
  (r.code = 'MANAGER' AND m.menu_key IN ('pos', 'inventory', 'master_data')) OR
  (r.code = 'CASHIER' AND m.menu_key IN ('pos'))
);
