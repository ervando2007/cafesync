"use server";

import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { hasOutletAccess } from "@/lib/auth-guard";
import pool from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import type { TranslateFn } from "@/lib/i18n/translate";
import { requireMenu } from "@/lib/menu-access";

const MAX_BULK = 50;

export interface TableActionResult {
  ok: boolean;
  message?: string;
}

interface TableInput {
  outletId: number;
  code: string;
  name: string;
  capacity: number;
}

function isDuplicate(error: unknown): boolean {
  return (error as { code?: string }).code === "ER_DUP_ENTRY";
}

function validateTableInput(input: TableInput, t: TranslateFn): string | null {
  if (!input.code.trim()) return t("masterData.errTableCodeRequired");
  if (input.code.trim().length > 30) return t("masterData.errTableCodeTooLong");
  if (!input.name.trim()) return t("masterData.errTableNameRequired");
  if (!Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > 100) {
    return t("masterData.errTableCapacityInvalid");
  }
  return null;
}

async function guardOutlet(outletId: number): Promise<string | null> {
  const session = await requireMenu("master_data");
  const { t } = await getT();
  if (!(await hasOutletAccess(session, outletId))) return t("inventory.errNoOutletAccess");
  return null;
}

export async function createTable(input: TableInput): Promise<TableActionResult> {
  const denied = await guardOutlet(input.outletId);
  if (denied) return { ok: false, message: denied };
  const { t } = await getT();
  const validationError = validateTableInput(input, t);
  if (validationError) return { ok: false, message: validationError };

  try {
    await pool.query(
      `INSERT INTO dining_tables (outlet_id, code, name, capacity, status)
       VALUES (?, ?, ?, ?, 'AVAILABLE')`,
      [input.outletId, input.code.trim().toUpperCase(), input.name.trim(), input.capacity],
    );
    return { ok: true };
  } catch (error) {
    if (isDuplicate(error)) return { ok: false, message: t("masterData.errTableCodeExists") };
    console.error("createTable failed", error);
    return { ok: false, message: t("masterData.errCouldNotSaveTable") };
  }
}

export async function updateTable(input: TableInput & { id: number }): Promise<TableActionResult> {
  const denied = await guardOutlet(input.outletId);
  if (denied) return { ok: false, message: denied };
  const { t } = await getT();
  const validationError = validateTableInput(input, t);
  if (validationError) return { ok: false, message: validationError };

  try {
    const [result] = await pool.query<ResultSetHeader>(
      "UPDATE dining_tables SET code = ?, name = ?, capacity = ? WHERE id = ? AND outlet_id = ?",
      [input.code.trim().toUpperCase(), input.name.trim(), input.capacity, input.id, input.outletId],
    );
    if (result.affectedRows === 0) return { ok: false, message: t("masterData.errTableNotFound") };
    return { ok: true };
  } catch (error) {
    if (isDuplicate(error)) return { ok: false, message: t("masterData.errTableCodeExists") };
    console.error("updateTable failed", error);
    return { ok: false, message: t("masterData.errCouldNotSaveTable") };
  }
}

/** Deactivate (hidden from ordering) or reactivate a table. Occupied tables can't be deactivated. */
export async function setTableActive(input: {
  outletId: number;
  id: number;
  active: boolean;
}): Promise<TableActionResult> {
  const denied = await guardOutlet(input.outletId);
  if (denied) return { ok: false, message: denied };
  const { t } = await getT();

  try {
    const [result] = input.active
      ? await pool.query<ResultSetHeader>(
          "UPDATE dining_tables SET status = 'AVAILABLE' WHERE id = ? AND outlet_id = ? AND status = 'INACTIVE'",
          [input.id, input.outletId],
        )
      : await pool.query<ResultSetHeader>(
          "UPDATE dining_tables SET status = 'INACTIVE' WHERE id = ? AND outlet_id = ? AND status <> 'OCCUPIED'",
          [input.id, input.outletId],
        );
    if (result.affectedRows === 0) {
      return {
        ok: false,
        message: input.active ? t("masterData.errTableNotFound") : t("masterData.errTableOccupied"),
      };
    }
    return { ok: true };
  } catch (error) {
    console.error("setTableActive failed", error);
    return { ok: false, message: t("masterData.errCouldNotSaveTable") };
  }
}

/**
 * Add `count` tables numbered after the highest existing "T<n>" code
 * (T01..T06 present → T07, T08, ...), named "Table NN".
 */
export async function addTablesBulk(input: {
  outletId: number;
  count: number;
  capacity: number;
}): Promise<TableActionResult> {
  const denied = await guardOutlet(input.outletId);
  if (denied) return { ok: false, message: denied };
  const { t } = await getT();
  if (!Number.isInteger(input.count) || input.count < 1 || input.count > MAX_BULK) {
    return { ok: false, message: t("masterData.errTableCountInvalid", { max: MAX_BULK }) };
  }
  if (!Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > 100) {
    return { ok: false, message: t("masterData.errTableCapacityInvalid") };
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT code FROM dining_tables WHERE outlet_id = ? FOR UPDATE",
      [input.outletId],
    );
    const existing = new Set(rows.map((r) => String(r.code).toUpperCase()));
    let next =
      rows.reduce((max, r) => {
        const m = /^T(\d+)$/i.exec(String(r.code));
        return m ? Math.max(max, Number(m[1])) : max;
      }, 0) + 1;

    const values: (string | number)[] = [];
    for (let i = 0; i < input.count; i++) {
      while (existing.has(`T${String(next).padStart(2, "0")}`)) next++;
      const num = String(next).padStart(2, "0");
      values.push(input.outletId, `T${num}`, `Table ${num}`, input.capacity);
      next++;
    }
    await conn.query(
      `INSERT INTO dining_tables (outlet_id, code, name, capacity, status) VALUES ${Array.from(
        { length: input.count },
        () => "(?, ?, ?, ?, 'AVAILABLE')",
      ).join(", ")}`,
      values,
    );
    await conn.commit();
    return { ok: true };
  } catch (error) {
    await conn.rollback();
    console.error("addTablesBulk failed", error);
    return { ok: false, message: t("masterData.errCouldNotSaveTable") };
  } finally {
    conn.release();
  }
}
