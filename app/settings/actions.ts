"use server";

import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import type { Session } from "next-auth";
import { requireRole } from "@/lib/auth-guard";
import pool from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import type { TranslateFn } from "@/lib/i18n/translate";
import { needsOutletAssignment } from "@/lib/role-scope";
import {
  allSubGm,
  canManageUser,
  isFullUserAdmin,
  roleCodesForIds,
  USER_MANAGER_ROLES,
} from "@/lib/user-admin-scope";

const ALLOWED_ROLES = ["ADMIN"];

/**
 * USER_ADMIN limits: the target user (if any) must be one it may manage, and
 * every role being assigned must be below GM. ADMIN passes unrestricted.
 */
async function userScopeError(
  session: Session,
  t: TranslateFn,
  opts: { targetUserId?: number; roleIds?: number[] },
): Promise<string | null> {
  if (isFullUserAdmin(session)) return null;
  if (opts.targetUserId !== undefined && !(await canManageUser(session, opts.targetUserId))) {
    return t("settings.errCannotManageUser");
  }
  if (opts.roleIds) {
    const codes = await roleCodesForIds(opts.roleIds);
    if (!codes || !allSubGm(codes)) return t("settings.errRoleNotAssignable");
  }
  return null;
}

/** Manager / Accounting / Cashier only see assigned outlets, so they need one. */
async function outletAssignmentError(input: UserInput, t: TranslateFn): Promise<string | null> {
  const codes = (await roleCodesForIds(input.roleIds)) ?? [];
  return needsOutletAssignment(codes) && input.outletIds.length === 0
    ? t("settings.errSelectOutlet")
    : null;
}

export interface ActionResult {
  ok: boolean;
  message?: string;
}

function isDuplicateEmailError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ER_DUP_ENTRY"
  );
}

/** ER_DUP_ENTRY on the attendance PIN unique key (vs. the email one). */
function isDuplicatePinError(error: unknown): boolean {
  return isDuplicateEmailError(error) && String((error as { message?: string }).message ?? "").includes("uq_users_attendance_pin");
}

/** Fingerspot user PIN: digits only, empty = not linked to a machine. */
function cleanPin(pin: string | undefined): string | null {
  const v = (pin ?? "").trim();
  return v || null;
}

interface UserInput {
  name: string;
  email: string;
  roleIds: number[];
  outletIds: number[];
  attendancePin?: string;
}

function validateUserInput(input: UserInput, t: TranslateFn): string | null {
  if (!input.name.trim()) return t("inventory.errNameRequired");
  if (!input.email.trim() || !input.email.includes("@")) return t("settings.errValidEmailRequired");
  if (input.roleIds.length === 0) return t("settings.errSelectAtLeastOneRole");
  const pin = cleanPin(input.attendancePin);
  if (pin && !/^\d{1,20}$/.test(pin)) return t("settings.errPinInvalid");
  return null;
}

async function syncUserRolesAndOutlets(
  conn: import("mysql2/promise").PoolConnection,
  userId: number,
  roleIds: number[],
  outletIds: number[],
): Promise<void> {
  await conn.query("DELETE FROM user_roles WHERE user_id = ?", [userId]);
  if (roleIds.length) {
    await conn.query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ${roleIds.map(() => "(?, ?)").join(", ")}`,
      roleIds.flatMap((roleId) => [userId, roleId]),
    );
  }

  await conn.query("DELETE FROM user_outlets WHERE user_id = ?", [userId]);
  if (outletIds.length) {
    await conn.query(
      `INSERT INTO user_outlets (user_id, outlet_id, is_default) VALUES ${outletIds
        .map((_, i) => `(?, ?, ${i === 0 ? 1 : 0})`)
        .join(", ")}`,
      outletIds.flatMap((outletId) => [userId, outletId]),
    );
  }
}

export async function createUser(
  input: UserInput & { password: string },
): Promise<ActionResult> {
  const session = await requireRole(USER_MANAGER_ROLES);
  const { t } = await getT();
  const validationError = validateUserInput(input, t);
  if (validationError) return { ok: false, message: validationError };
  const scopeError =
    (await userScopeError(session, t, { roleIds: input.roleIds })) ??
    (await outletAssignmentError(input, t));
  if (scopeError) return { ok: false, message: scopeError };
  if (input.password.length < 6) {
    return { ok: false, message: t("settings.errPasswordMinLength") };
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const passwordHash = await bcrypt.hash(input.password, 10);

    const [result] = await conn.query(
      "INSERT INTO users (name, email, password_hash, attendance_pin, status) VALUES (?, ?, ?, ?, 'ACTIVE')",
      [input.name.trim(), input.email.trim(), passwordHash, cleanPin(input.attendancePin)],
    );
    const userId = (result as { insertId: number }).insertId;

    await syncUserRolesAndOutlets(conn, userId, input.roleIds, input.outletIds);

    await conn.commit();
    return { ok: true };
  } catch (error) {
    await conn.rollback();
    if (isDuplicatePinError(error)) {
      return { ok: false, message: t("settings.errPinExists") };
    }
    if (isDuplicateEmailError(error)) {
      return { ok: false, message: t("settings.errEmailExists") };
    }
    console.error("createUser failed", error);
    return { ok: false, message: t("settings.errCouldNotSaveUser") };
  } finally {
    conn.release();
  }
}

export async function updateUser(input: UserInput & { id: number }): Promise<ActionResult> {
  const session = await requireRole(USER_MANAGER_ROLES);
  const { t } = await getT();
  const validationError = validateUserInput(input, t);
  if (validationError) return { ok: false, message: validationError };
  const scopeError =
    (await userScopeError(session, t, { targetUserId: input.id, roleIds: input.roleIds })) ??
    (await outletAssignmentError(input, t));
  if (scopeError) return { ok: false, message: scopeError };

  const isSelf = Number(session.user.id) === input.id;
  if (isSelf) {
    const [adminRole] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM roles WHERE code = 'ADMIN'",
    );
    const adminRoleId = adminRole[0]?.id as number | undefined;
    if (adminRoleId && !input.roleIds.includes(adminRoleId)) {
      return { ok: false, message: t("settings.errCannotRemoveOwnAdmin") };
    }
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      "UPDATE users SET name = ?, email = ?, attendance_pin = ? WHERE id = ?",
      [input.name.trim(), input.email.trim(), cleanPin(input.attendancePin), input.id],
    );
    if ((result as { affectedRows: number }).affectedRows === 0) {
      await conn.rollback();
      return { ok: false, message: t("settings.errUserNotFound") };
    }

    await syncUserRolesAndOutlets(conn, input.id, input.roleIds, input.outletIds);

    await conn.commit();
    return { ok: true };
  } catch (error) {
    await conn.rollback();
    if (isDuplicatePinError(error)) {
      return { ok: false, message: t("settings.errPinExists") };
    }
    if (isDuplicateEmailError(error)) {
      return { ok: false, message: t("settings.errEmailExists") };
    }
    console.error("updateUser failed", error);
    return { ok: false, message: t("settings.errCouldNotSaveUser") };
  } finally {
    conn.release();
  }
}

export async function resetUserPassword(input: {
  id: number;
  password: string;
}): Promise<ActionResult> {
  const session = await requireRole(USER_MANAGER_ROLES);
  const { t } = await getT();
  const scopeError = await userScopeError(session, t, { targetUserId: input.id });
  if (scopeError) return { ok: false, message: scopeError };
  if (input.password.length < 6) {
    return { ok: false, message: t("settings.errPasswordMinLength") };
  }

  try {
    const passwordHash = await bcrypt.hash(input.password, 10);
    const [result] = await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [
      passwordHash,
      input.id,
    ]);
    if ((result as { affectedRows: number }).affectedRows === 0) {
      return { ok: false, message: t("settings.errUserNotFound") };
    }
    return { ok: true };
  } catch (error) {
    console.error("resetUserPassword failed", error);
    return { ok: false, message: t("settings.errCouldNotResetPassword") };
  }
}

export async function setUserStatus(input: {
  id: number;
  status: "ACTIVE" | "INACTIVE";
}): Promise<ActionResult> {
  const session = await requireRole(USER_MANAGER_ROLES);
  const { t } = await getT();
  if (input.status !== "ACTIVE" && input.status !== "INACTIVE") {
    return { ok: false, message: t("inventory.errInvalidStatus") };
  }
  const scopeError = await userScopeError(session, t, { targetUserId: input.id });
  if (scopeError) return { ok: false, message: scopeError };
  if (Number(session.user.id) === input.id && input.status === "INACTIVE") {
    return { ok: false, message: t("settings.errCannotDeactivateSelf") };
  }

  try {
    const [result] = await pool.query("UPDATE users SET status = ? WHERE id = ?", [
      input.status,
      input.id,
    ]);
    if ((result as { affectedRows: number }).affectedRows === 0) {
      return { ok: false, message: t("settings.errUserNotFound") };
    }
    return { ok: true };
  } catch (error) {
    console.error("setUserStatus failed", error);
    return { ok: false, message: t("settings.errCouldNotUpdateUserStatus") };
  }
}

export async function setRoleMenuPermission(input: {
  roleId: number;
  menuItemId: number;
  allowed: boolean;
}): Promise<ActionResult> {
  await requireRole(ALLOWED_ROLES);
  const { t } = await getT();

  try {
    if (input.allowed) {
      await pool.query(
        "INSERT IGNORE INTO role_menu_permissions (role_id, menu_item_id) VALUES (?, ?)",
        [input.roleId, input.menuItemId],
      );
    } else {
      await pool.query(
        "DELETE FROM role_menu_permissions WHERE role_id = ? AND menu_item_id = ?",
        [input.roleId, input.menuItemId],
      );
    }
    return { ok: true };
  } catch (error) {
    console.error("setRoleMenuPermission failed", error);
    return { ok: false, message: t("settings.errCouldNotUpdatePermission") };
  }
}
