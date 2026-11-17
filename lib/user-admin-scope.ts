import "server-only";
import type { Session } from "next-auth";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";

/** Roles that may open User Management. */
export const USER_MANAGER_ROLES = ["ADMIN", "USER_ADMIN"];

/** Roles a USER_ADMIN may see and assign — everything below GM. */
export const SUB_GM_ROLE_CODES = ["MANAGER", "ACCOUNTING", "CASHIER", "CUSTOMER"];

export function isFullUserAdmin(session: Session): boolean {
  return session.user.roles.includes("ADMIN");
}

/** True when every role code is below GM (a user with no roles counts as below GM). */
export function allSubGm(roleCodes: string[]): boolean {
  return roleCodes.every((code) => SUB_GM_ROLE_CODES.includes(code));
}

export async function roleCodesForIds(roleIds: number[]): Promise<string[] | null> {
  if (!roleIds.length) return [];
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT code FROM roles WHERE id IN (${roleIds.map(() => "?").join(",")})`,
    roleIds,
  );
  return rows.length === new Set(roleIds).size ? rows.map((r) => String(r.code)) : null;
}

export async function roleCodesOfUser(userId: number): Promise<string[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT r.code FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ?",
    [userId],
  );
  return rows.map((r) => String(r.code));
}

/**
 * Whether `session` may manage `targetUserId` (edit / reset password / status).
 * ADMIN: anyone. USER_ADMIN: only other users whose roles are all below GM.
 */
export async function canManageUser(session: Session, targetUserId: number): Promise<boolean> {
  if (isFullUserAdmin(session)) return true;
  if (Number(session.user.id) === targetUserId) return false;
  return allSubGm(await roleCodesOfUser(targetUserId));
}
