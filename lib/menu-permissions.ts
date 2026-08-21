import "server-only";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import type { Session } from "next-auth";

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

export async function getVisibleMenuKeys(session: Session): Promise<Set<string>> {
  const roles = session.user.roles;
  if (!roles.length) return new Set();

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT mi.menu_key AS menuKey
     FROM role_menu_permissions rmp
     JOIN roles r ON r.id = rmp.role_id
     JOIN menu_items mi ON mi.id = rmp.menu_item_id
     WHERE r.code IN (?)`,
    [roles],
  );
  return new Set(rows.map((r) => String(r.menuKey)));
}
