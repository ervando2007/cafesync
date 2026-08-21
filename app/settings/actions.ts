"use server";

import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import { requireRole } from "@/lib/auth-guard";
import pool from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import type { TranslateFn } from "@/lib/i18n/translate";

const ALLOWED_ROLES = ["ADMIN"];

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

interface UserInput {
  name: string;
  email: string;
  roleIds: number[];
  outletIds: number[];
}

function validateUserInput(input: UserInput, t: TranslateFn): string | null {
  if (!input.name.trim()) return t("inventory.errNameRequired");
  if (!input.email.trim() || !input.email.includes("@")) return t("settings.errValidEmailRequired");
  if (input.roleIds.length === 0) return t("settings.errSelectAtLeastOneRole");
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
  await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  const validationError = validateUserInput(input, t);
  if (validationError) return { ok: false, message: validationError };
  if (input.password.length < 6) {
    return { ok: false, message: t("settings.errPasswordMinLength") };
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const passwordHash = await bcrypt.hash(input.password, 10);

    const [result] = await conn.query(
      "INSERT INTO users (name, email, password_hash, status) VALUES (?, ?, ?, 'ACTIVE')",
      [input.name.trim(), input.email.trim(), passwordHash],
    );
    const userId = (result as { insertId: number }).insertId;

    await syncUserRolesAndOutlets(conn, userId, input.roleIds, input.outletIds);

    await conn.commit();
    return { ok: true };
  } catch (error) {
    await conn.rollback();
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
  const session = await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  const validationError = validateUserInput(input, t);
  if (validationError) return { ok: false, message: validationError };

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
      "UPDATE users SET name = ?, email = ? WHERE id = ?",
      [input.name.trim(), input.email.trim(), input.id],
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
  await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
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
  const session = await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  if (input.status !== "ACTIVE" && input.status !== "INACTIVE") {
    return { ok: false, message: t("inventory.errInvalidStatus") };
  }
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
