-- Per-report access: each report is its own row in the Settings → menu access
-- matrix ("reports.<name>"), shown in a separate "Report access" table. A role
-- opens a report when both "reports" and that report are ticked (ADMIN always).
-- Seeded to match the previous hard-coded rules exactly:
--   Sales, Stock, Attendance        → ADMIN, GM, MANAGER, ACCOUNTING
--   all financial / ledger reports  → ADMIN, GM, ACCOUNTING
INSERT INTO menu_items (menu_key, label, sort_order)
SELECT v.menu_key, v.label, v.sort_order FROM (
  SELECT 'reports.sales' AS menu_key, 'Sales Report' AS label, 101 AS sort_order
  UNION ALL SELECT 'reports.stock', 'Stock Report', 102
  UNION ALL SELECT 'reports.profit_loss', 'Profit & Loss', 103
  UNION ALL SELECT 'reports.cash', 'Cash Report', 104
  UNION ALL SELECT 'reports.bank', 'Bank Report', 105
  UNION ALL SELECT 'reports.balance_sheet', 'Balance Sheet', 106
  UNION ALL SELECT 'reports.general_ledger', 'General Ledger', 107
  UNION ALL SELECT 'reports.ledger_summary', 'Ledger Summary', 108
  UNION ALL SELECT 'reports.master_menu', 'Master Menu', 109
  UNION ALL SELECT 'reports.attendance', 'Attendance Report', 110
) v
WHERE NOT EXISTS (SELECT 1 FROM menu_items m WHERE m.menu_key = v.menu_key);

INSERT IGNORE INTO role_menu_permissions (role_id, menu_item_id)
SELECT r.id, m.id FROM roles r JOIN menu_items m
  ON (m.menu_key IN ('reports.sales', 'reports.stock', 'reports.attendance')
      AND r.code IN ('ADMIN', 'GM', 'MANAGER', 'ACCOUNTING'))
  OR (m.menu_key IN ('reports.profit_loss', 'reports.cash', 'reports.bank', 'reports.balance_sheet',
                     'reports.general_ledger', 'reports.ledger_summary', 'reports.master_menu')
      AND r.code IN ('ADMIN', 'GM', 'ACCOUNTING'));
