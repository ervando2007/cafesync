INSERT INTO menu_items (menu_key, label, sort_order) VALUES ('accounting', 'Accounting', 6);

INSERT INTO role_menu_permissions (role_id, menu_item_id)
SELECT r.id, m.id FROM roles r
JOIN menu_items m ON m.menu_key = 'accounting'
WHERE r.code IN ('ADMIN', 'GM', 'ACCOUNTING');

-- Accounting role also needs the Dashboard for financial KPI oversight.
INSERT INTO role_menu_permissions (role_id, menu_item_id)
SELECT r.id, m.id FROM roles r
JOIN menu_items m ON m.menu_key = 'dashboard'
WHERE r.code = 'ACCOUNTING';
