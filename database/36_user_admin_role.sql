-- USER_ADMIN ("Admin User"): one level under Administrator, only for user
-- management. Can create / edit / reset password / (de)activate users whose
-- roles are all below GM (MANAGER, ACCOUNTING, CASHIER, CUSTOMER); never sees
-- or touches ADMIN, GM or other USER_ADMIN accounts, and can't edit the menu
-- permission matrix. Enforced in app/settings/actions.ts (lib/user-admin-scope.ts).
INSERT INTO roles (code, name)
SELECT 'USER_ADMIN', 'Admin User' FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = 'USER_ADMIN');

-- Settings menu only (the Attendance Devices sub-menu stays ADMIN-only in code).
INSERT IGNORE INTO role_menu_permissions (role_id, menu_item_id)
SELECT r.id, m.id FROM roles r JOIN menu_items m ON m.menu_key = 'settings'
WHERE r.code = 'USER_ADMIN';
