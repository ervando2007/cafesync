import "server-only";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import type { Session } from "next-auth";
import { cache } from "react";
import { SUBMENU_ROLES } from "@/lib/menu-rules";

export interface MenuItemRecord {
  id: number;
  menuKey: string;
  label: string;
}

export async function getMenuItems(): Promise<MenuItemRecord[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, menu_key AS menuKey, label FROM menu_items ORDER BY sort_order",
  );
  return rows.map((r) => ({ id: Number(r.id), menuKey: String(r.menuKey), label: String(r.label) }));
}

export interface RoleRecord {
  id: number;
  code: string;
  name: string;
}

export async function getRoles(): Promise<RoleRecord[]> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT id, code, name FROM roles ORDER BY id");
  return rows.map((r) => ({ id: Number(r.id), code: String(r.code), name: String(r.name) }));
}

export interface PermissionPair {
  roleId: number;
  menuItemId: number;
}

export async function getPermissionMatrix(): Promise<PermissionPair[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT role_id AS roleId, menu_item_id AS menuItemId FROM role_menu_permissions",
  );
  return rows.map((r) => ({ roleId: Number(r.roleId), menuItemId: Number(r.menuItemId) }));
}

/**
 * Menu keys the session may see: matrix sections for its roles, plus each
 * role-limited sub-menu key (lib/menu-rules.ts) the roles qualify for.
 * Cached per request by role set — layouts, pages and guards all call it.
 */
export async function getVisibleMenuKeys(session: Session): Promise<ReadonlySet<string>> {
  return loadVisibleMenuKeys([...session.user.roles].sort().join(","));
}

const loadVisibleMenuKeys = cache(async (rolesKey: string): Promise<ReadonlySet<string>> => {
  const roles = rolesKey ? rolesKey.split(",") : [];
  if (!roles.length) return new Set();

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT mi.menu_key AS menuKey
     FROM role_menu_permissions rmp
     JOIN roles r ON r.id = rmp.role_id
     JOIN menu_items mi ON mi.id = rmp.menu_item_id
     WHERE r.code IN (?)`,
    [roles],
  );
  const keys = new Set(rows.map((r) => String(r.menuKey)));
  for (const [key, allowedRoles] of Object.entries(SUBMENU_ROLES)) {
    if (roles.some((role) => (allowedRoles as readonly string[]).includes(role))) keys.add(key);
  }
  return keys;
});
