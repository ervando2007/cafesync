INSERT INTO menu_items (menu_key, label, sort_order) VALUES ('reports', 'Reports', 7);

INSERT INTO role_menu_permissions (role_id, menu_item_id)
SELECT r.id, m.id FROM roles r
JOIN menu_items m ON m.menu_key = 'reports'
WHERE r.code IN ('ADMIN', 'GM', 'MANAGER', 'ACCOUNTING');
