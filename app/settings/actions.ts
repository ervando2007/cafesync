"use server";

import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import type { Session } from "next-auth";
import { requireRole } from "@/lib/auth-guard";
import pool from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import type { TranslateFn } from "@/lib/i18n/translate";
import { needsOutletAssignment } from "@/lib/role-scope";
import { checkWhatsAppNumberForUser } from "@/lib/whatsapp";
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
  whatsappNumber?: string;
}

/** Normalised number to save, or a translated error. */
async function resolveWhatsApp(
  input: UserInput,
  t: TranslateFn,
  excludeUserId?: number,
): Promise<{ value: string | null } | { error: string }> {
  const check = await checkWhatsAppNumberForUser(input.whatsappNumber, excludeUserId);
  if (check.ok) return { value: check.value };
  return { error: t(check.reason === "invalid" ? "settings.errWhatsAppInvalid" : "settings.errWhatsAppExists") };
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
  if (input.password.length < 8) {
    return { ok: false, message: t("settings.errPasswordMinLength") };
  }
  const whatsapp = await resolveWhatsApp(input, t);
  if ("error" in whatsapp) return { ok: false, message: whatsapp.error };

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const passwordHash = await bcrypt.hash(input.password, 10);

    const [result] = await conn.query(
      "INSERT INTO users (name, email, password_hash, attendance_pin, whatsapp_number, status) VALUES (?, ?, ?, ?, ?, 'ACTIVE')",
      [input.name.trim(), input.email.trim(), passwordHash, cleanPin(input.attendancePin), whatsapp.value],
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

  const whatsapp = await resolveWhatsApp(input, t, input.id);
  if ("error" in whatsapp) return { ok: false, message: whatsapp.error };

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
      "UPDATE users SET name = ?, email = ?, attendance_pin = ?, whatsapp_number = ? WHERE id = ?",
      [input.name.trim(), input.email.trim(), cleanPin(input.attendancePin), whatsapp.value, input.id],
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
  if (input.password.length < 8) {
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

/**
 * Tables that hold a user's operational history. A user referenced here can't
 * be deleted (reports and audit trails must keep pointing at them) — deactivate
 * instead.
 */
const USER_HISTORY_REFS: [table: string, column: string][] = [
  ["orders", "created_by"],
  ["orders", "customer_id"],
  ["orders", "voided_by"],
  ["orders", "void_authorized_by"],
  ["journal_entries", "created_by"],
  ["cash_transactions", "created_by"],
  ["inventory_movements", "created_by"],
  ["attendances", "user_id"],
  ["attendance_scans", "user_id"],
  ["audit_logs", "user_id"],
];

/** Permanently delete a user with no history. ADMIN only; never yourself. */
export async function deleteUser(input: { id: number }): Promise<ActionResult> {
  const session = await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  if (Number(session.user.id) === input.id) {
    return { ok: false, message: t("settings.errCannotDeleteSelf") };
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [users] = await conn.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE id = ? FOR UPDATE",
      [input.id],
    );
    if (!users.length) {
      await conn.rollback();
      return { ok: false, message: t("settings.errUserNotFound") };
    }

    const [historyRows] = await conn.query<RowDataPacket[]>(
      USER_HISTORY_REFS.map(
        ([table, column]) => `(SELECT 1 AS hit FROM ${table} WHERE ${column} = ? LIMIT 1)`,
      ).join(" UNION ALL "),
      USER_HISTORY_REFS.map(() => input.id),
    );
    if (historyRows.length) {
      await conn.rollback();
      return { ok: false, message: t("settings.errUserHasHistory") };
    }

    // "Last edited by" stamps only — clear them rather than block the delete.
    await conn.query("UPDATE recipes SET updated_by = NULL WHERE updated_by = ?", [input.id]);
    await conn.query(
      "UPDATE account_opening_balances SET updated_by = NULL WHERE updated_by = ?",
      [input.id],
    );
    await conn.query("DELETE FROM password_reset_tokens WHERE user_id = ?", [input.id]);
    await conn.query("DELETE FROM user_outlets WHERE user_id = ?", [input.id]);
    await conn.query("DELETE FROM user_roles WHERE user_id = ?", [input.id]);
    await conn.query("DELETE FROM users WHERE id = ?", [input.id]);
    await conn.commit();
    return { ok: true };
  } catch (error) {
    await conn.rollback();
    console.error("deleteUser failed", error);
    return { ok: false, message: t("settings.errCouldNotDeleteUser") };
  } finally {
    conn.release();
  }
}
