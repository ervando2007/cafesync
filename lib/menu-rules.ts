/**
 * Access model:
 * - A section (dashboard, pos, inventory, master_data, accounting, reports,
 *   attendance) is opened by the Settings → menu access matrix
 *   (role_menu_permissions). Ticking a box there is what grants the page.
 * - Each report is its own matrix entry ("reports.sales", ...); a role opens a
 *   report when both "reports" and that report are ticked.
 * - A few sub-menus are additionally limited to specific roles, regardless of
 *   the matrix. The sidebar hides them for everyone else, and their pages and
 *   actions check the same list (requireMenu(section, SUBMENU_ROLES[key])).
 * - ADMIN always passes, so an administrator can't lock themselves out.
 * Business rules inside a page (journal posting, POS void approval, user
 * management scope) stay role-based in their actions.
 */
export const SUBMENU_ROLES = {
  "master_data.outlets": ["ADMIN"],
  "master_data.coa": ["ADMIN", "GM", "ACCOUNTING"],
  "settings.users": ["ADMIN", "USER_ADMIN"],
  "settings.attendance_devices": ["ADMIN"],
} as const satisfies Record<string, readonly string[]>;

export type SubmenuKey = keyof typeof SUBMENU_ROLES;
