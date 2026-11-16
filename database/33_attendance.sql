-- Attendance (absensi) step 1: clock IN / clock OUT only. Shifts come later and
-- will hang off this table (e.g. a nullable shift_id), so a row is one work
-- session: clock_in_at is set on IN, clock_out_at stays NULL until OUT.
-- Both timestamps come from the DB server clock (NOW()), never the browser.

CREATE TABLE IF NOT EXISTS attendances (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  outlet_id BIGINT UNSIGNED NOT NULL,
  clock_in_at DATETIME NOT NULL,
  clock_out_at DATETIME NULL,
  note_in VARCHAR(255) NULL,
  note_out VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_attendance_user_open (user_id, clock_out_at),
  INDEX idx_attendance_outlet_date (outlet_id, clock_in_at),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (outlet_id) REFERENCES outlets(id)
);

-- "attendance" = the clock IN/OUT page, open to every staff role.
-- The IN/OUT report lives under the existing "reports" menu.
INSERT INTO menu_items (menu_key, label, sort_order)
SELECT 'attendance', 'Attendance', 8
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE menu_key = 'attendance');

INSERT INTO role_menu_permissions (role_id, menu_item_id)
SELECT r.id, m.id FROM roles r
JOIN menu_items m ON m.menu_key = 'attendance'
WHERE r.code IN ('ADMIN', 'GM', 'MANAGER', 'CASHIER', 'ACCOUNTING')
  AND NOT EXISTS (
    SELECT 1 FROM role_menu_permissions x WHERE x.role_id = r.id AND x.menu_item_id = m.id
  );
