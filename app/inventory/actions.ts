"use server";

import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { hasOutletAccess, requireRole } from "@/lib/auth-guard";
import { getT } from "@/lib/i18n/server";
import type { TranslateFn } from "@/lib/i18n/translate";
import { getOrLockStock, insertMovement, upsertStock, validStockItemIds } from "@/lib/inventory-mutations";

const ALLOWED_ROLES = ["ADMIN", "GM", "MANAGER"];

export interface ActionResult {
  ok: boolean;
  message?: string;
}

// ── Stock Out ────────────────────────────────────────────────────────────

export interface StockOutLine {
  stockItemId: number;
  qty: number;
}

export async function stockOut(input: {
  outletId: number;
  reason: string;
  notes: string;
  items: StockOutLine[];
}): Promise<ActionResult> {
  const session = await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  if (!(await hasOutletAccess(session, input.outletId))) {
    return { ok: false, message: t("inventory.errNoOutletAccess") };
  }
  if (!input.items.length) return { ok: false, message: t("inventory.addAtLeastOneItemPeriod") };

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const valid = await validStockItemIds(conn, input.items.map((i) => i.stockItemId));

    for (const line of input.items) {
      if (!valid.has(line.stockItemId) || line.qty <= 0) {
        await conn.rollback();
        return { ok: false, message: t("inventory.errItemsInvalid") };
      }

      const existing = await getOrLockStock(conn, input.outletId, line.stockItemId);
      const oldQty = existing?.qtyOnHand ?? 0;
      if (line.qty > oldQty) {
        await conn.rollback();
        return { ok: false, message: t("inventory.errNotEnoughStock") };
      }

      const avg = existing?.avgCost ?? 0;
      await upsertStock(conn, input.outletId, line.stockItemId, oldQty - line.qty, avg);
      await insertMovement(conn, {
        outletId: input.outletId,
        stockItemId: line.stockItemId,
        movementType: "WASTE_OUT",
        qty: line.qty,
        unitCost: avg,
        referenceType: input.reason || "STOCK_OUT",
        createdBy: Number(session.user.id),
      });
    }

    await conn.commit();
    return { ok: true };
  } catch (error) {
    await conn.rollback();
    console.error("stockOut failed", error);
    return { ok: false, message: t("inventory.errCouldNotSaveStockOut") };
  } finally {
    conn.release();
  }
}

// ── Adjustment ───────────────────────────────────────────────────────────

export interface AdjustmentLine {
  stockItemId: number;
  actualQty: number;
  unitCost?: number;
}

export async function adjustment(input: {
  outletId: number;
  notes: string;
  items: AdjustmentLine[];
}): Promise<ActionResult> {
  const session = await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  if (!(await hasOutletAccess(session, input.outletId))) {
    return { ok: false, message: t("inventory.errNoOutletAccess") };
  }
  if (!input.items.length) return { ok: false, message: t("inventory.addAtLeastOneItemPeriod") };

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const valid = await validStockItemIds(conn, input.items.map((i) => i.stockItemId));

    for (const line of input.items) {
      if (!valid.has(line.stockItemId) || line.actualQty < 0) {
        await conn.rollback();
        return { ok: false, message: t("inventory.errItemsInvalid") };
      }

      const existing = await getOrLockStock(conn, input.outletId, line.stockItemId);
      const systemQty = existing?.qtyOnHand ?? 0;
      const oldAvg = existing?.avgCost ?? 0;
      const diff = line.actualQty - systemQty;

      if (diff === 0) continue;

      let newAvg = oldAvg;
      if (diff > 0) {
        const unitCost = line.unitCost ?? oldAvg;
        newAvg =
          line.actualQty > 0 ? (systemQty * oldAvg + diff * unitCost) / line.actualQty : unitCost;
        await insertMovement(conn, {
          outletId: input.outletId,
          stockItemId: line.stockItemId,
          movementType: "ADJUSTMENT_IN",
          qty: diff,
          unitCost,
          referenceType: input.notes || "ADJUSTMENT",
          createdBy: Number(session.user.id),
        });
      } else {
        await insertMovement(conn, {
          outletId: input.outletId,
          stockItemId: line.stockItemId,
          movementType: "ADJUSTMENT_OUT",
          qty: Math.abs(diff),
          unitCost: oldAvg,
          referenceType: input.notes || "ADJUSTMENT",
          createdBy: Number(session.user.id),
        });
      }

      await upsertStock(conn, input.outletId, line.stockItemId, line.actualQty, newAvg);
    }

    await conn.commit();
    return { ok: true };
  } catch (error) {
    await conn.rollback();
    console.error("adjustment failed", error);
    return { ok: false, message: t("inventory.errCouldNotSaveAdjustment") };
  } finally {
    conn.release();
  }
}

// ── Transfer ─────────────────────────────────────────────────────────────

export interface TransferLine {
  stockItemId: number;
  qty: number;
}

export async function transfer(input: {
  fromOutletId: number;
  toOutletId: number;
  items: TransferLine[];
}): Promise<ActionResult> {
  const session = await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  if (input.fromOutletId === input.toOutletId) {
    return { ok: false, message: t("inventory.sourceDestDifferent") };
  }
  if (
    !(await hasOutletAccess(session, input.fromOutletId)) ||
    !(await hasOutletAccess(session, input.toOutletId))
  ) {
    return { ok: false, message: t("inventory.errNoAccessOneOfOutlets") };
  }
  if (!input.items.length) return { ok: false, message: t("inventory.addAtLeastOneItemPeriod") };

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const valid = await validStockItemIds(conn, input.items.map((i) => i.stockItemId));

    for (const line of input.items) {
      if (!valid.has(line.stockItemId) || line.qty <= 0) {
        await conn.rollback();
        return { ok: false, message: t("inventory.errItemsInvalid") };
      }

      const source = await getOrLockStock(conn, input.fromOutletId, line.stockItemId);
      const sourceQty = source?.qtyOnHand ?? 0;
      if (line.qty > sourceQty) {
        await conn.rollback();
        return { ok: false, message: t("inventory.errNotEnoughStockSource") };
      }
      const sourceAvg = source?.avgCost ?? 0;

      await upsertStock(conn, input.fromOutletId, line.stockItemId, sourceQty - line.qty, sourceAvg);
      await insertMovement(conn, {
        outletId: input.fromOutletId,
        stockItemId: line.stockItemId,
        movementType: "TRANSFER_OUT",
        qty: line.qty,
        unitCost: sourceAvg,
        referenceType: `TRANSFER_TO:${input.toOutletId}`,
        createdBy: Number(session.user.id),
      });

      const dest = await getOrLockStock(conn, input.toOutletId, line.stockItemId);
      const destQty = dest?.qtyOnHand ?? 0;
      const destAvg = dest?.avgCost ?? 0;
      const newDestQty = destQty + line.qty;
      const newDestAvg =
        newDestQty > 0 ? (destQty * destAvg + line.qty * sourceAvg) / newDestQty : sourceAvg;

      await upsertStock(conn, input.toOutletId, line.stockItemId, newDestQty, newDestAvg);
      await insertMovement(conn, {
        outletId: input.toOutletId,
        stockItemId: line.stockItemId,
        movementType: "TRANSFER_IN",
        qty: line.qty,
        unitCost: sourceAvg,
        referenceType: `TRANSFER_FROM:${input.fromOutletId}`,
        createdBy: Number(session.user.id),
      });
    }

    await conn.commit();
    return { ok: true };
  } catch (error) {
    await conn.rollback();
    console.error("transfer failed", error);
    return { ok: false, message: t("inventory.errCouldNotSaveTransfer") };
  } finally {
    conn.release();
  }
}

// ── Item Master Data ────────────────────────────────────────────────────

interface StockItemInput {
  accountId: number;
  unitId: number;
  categoryId: number;
  reorderLevel: number;
}

function validateStockItemInput(input: StockItemInput, t: TranslateFn): string | null {
  if (!Number.isFinite(input.accountId) || input.accountId <= 0) {
    return t("inventory.errAccountRequired");
  }
  if (!Number.isFinite(input.categoryId) || input.categoryId <= 0) {
    return t("inventory.errCategoryRequired");
  }
  if (!Number.isFinite(input.unitId) || input.unitId <= 0) return t("inventory.errUnitRequired");
  if (!Number.isFinite(input.reorderLevel) || input.reorderLevel < 0) {
    return t("inventory.errReorderLevelNegative");
  }
  return null;
}

/** The item's name is derived from its linked COA account, never taken as free text from the client. */
async function resolveExpenseAccountName(
  conn: import("mysql2/promise").PoolConnection,
  accountId: number,
): Promise<string | null> {
  const [rows] = await conn.query<RowDataPacket[]>(
    "SELECT name FROM accounts WHERE id = ? AND account_type = 'EXPENSE' AND status = 'ACTIVE'",
    [accountId],
  );
  return rows.length ? String(rows[0].name) : null;
}

function isDuplicateSkuError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ER_DUP_ENTRY"
  );
}

export async function createStockItem(input: StockItemInput): Promise<ActionResult> {
  await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  const validationError = validateStockItemInput(input, t);
  if (validationError) return { ok: false, message: validationError };

  const conn = await pool.getConnection();
  try {
    const [units] = await conn.query<RowDataPacket[]>("SELECT id FROM units WHERE id = ?", [
      input.unitId,
    ]);
    if (!units.length) return { ok: false, message: t("inventory.errUnitNotFound") };

    const [categories] = await conn.query<RowDataPacket[]>(
      "SELECT id FROM stock_item_categories WHERE id = ?",
      [input.categoryId],
    );
    if (!categories.length) return { ok: false, message: t("inventory.errCategoryNotFound") };

    const accountName = await resolveExpenseAccountName(conn, input.accountId);
    if (!accountName) return { ok: false, message: t("inventory.errAccountNotFound") };

    // SKU is auto-generated from the row's own auto-increment id (never user
    // input), so it's guaranteed unique without needing a retry-on-collision
    // loop. Insert with a placeholder first, then rewrite it once the real id
    // is known — wrapped in a transaction so the placeholder is never visible
    // outside this request.
    await conn.beginTransaction();
    const [insertResult] = await conn.query(
      `INSERT INTO stock_items (sku, name, unit_id, category_id, account_id, reorder_level, status)
       VALUES (CONCAT('TEMP-', UUID()), ?, ?, ?, ?, ?, 'ACTIVE')`,
      [accountName, input.unitId, input.categoryId, input.accountId, input.reorderLevel],
    );
    const newId = (insertResult as { insertId: number }).insertId;
    const sku = `ITM-${String(newId).padStart(5, "0")}`;
    await conn.query("UPDATE stock_items SET sku = ? WHERE id = ?", [sku, newId]);
    await conn.commit();
    return { ok: true };
  } catch (error) {
    await conn.rollback();
    if (isDuplicateSkuError(error)) {
      return { ok: false, message: t("inventory.errSkuExists") };
    }
    console.error("createStockItem failed", error);
    return { ok: false, message: t("inventory.errCouldNotSaveItem") };
  } finally {
    conn.release();
  }
}

export async function updateStockItem(
  input: StockItemInput & { id: number },
): Promise<ActionResult> {
  await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  const validationError = validateStockItemInput(input, t);
  if (validationError) return { ok: false, message: validationError };

  const conn = await pool.getConnection();
  try {
    const [units] = await conn.query<RowDataPacket[]>("SELECT id FROM units WHERE id = ?", [
      input.unitId,
    ]);
    if (!units.length) return { ok: false, message: t("inventory.errUnitNotFound") };

    const [categories] = await conn.query<RowDataPacket[]>(
      "SELECT id FROM stock_item_categories WHERE id = ?",
      [input.categoryId],
    );
    if (!categories.length) return { ok: false, message: t("inventory.errCategoryNotFound") };

    const accountName = await resolveExpenseAccountName(conn, input.accountId);
    if (!accountName) return { ok: false, message: t("inventory.errAccountNotFound") };

    const [result] = await conn.query(
      `UPDATE stock_items SET name = ?, unit_id = ?, category_id = ?, account_id = ?, reorder_level = ?
       WHERE id = ?`,
      [accountName, input.unitId, input.categoryId, input.accountId, input.reorderLevel, input.id],
    );
    if ((result as { affectedRows: number }).affectedRows === 0) {
      return { ok: false, message: t("inventory.errItemNotFound") };
    }
    return { ok: true };
  } catch (error) {
    if (isDuplicateSkuError(error)) {
      return { ok: false, message: t("inventory.errSkuExists") };
    }
    console.error("updateStockItem failed", error);
    return { ok: false, message: t("inventory.errCouldNotSaveItem") };
  } finally {
    conn.release();
  }
}

export async function setStockItemStatus(input: {
  id: number;
  status: "ACTIVE" | "INACTIVE";
}): Promise<ActionResult> {
  await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  if (input.status !== "ACTIVE" && input.status !== "INACTIVE") {
    return { ok: false, message: t("inventory.errInvalidStatus") };
  }

  try {
    const [result] = await pool.query("UPDATE stock_items SET status = ? WHERE id = ?", [
      input.status,
      input.id,
    ]);
    if ((result as { affectedRows: number }).affectedRows === 0) {
      return { ok: false, message: t("inventory.errItemNotFound") };
    }
    return { ok: true };
  } catch (error) {
    console.error("setStockItemStatus failed", error);
    return { ok: false, message: t("inventory.errCouldNotUpdateItemStatus") };
  }
}

// ── Item Categories ─────────────────────────────────────────────────────

function isDuplicateCategoryError(error: unknown): boolean {
  return isDuplicateSkuError(error);
}

export async function createCategory(input: { name: string }): Promise<ActionResult> {
  await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  const name = input.name.trim();
  if (!name) return { ok: false, message: t("inventory.errCategoryNameRequired") };

  try {
    await pool.query(
      "INSERT INTO stock_item_categories (name, status) VALUES (?, 'ACTIVE')",
      [name],
    );
    return { ok: true };
  } catch (error) {
    if (isDuplicateCategoryError(error)) {
      return { ok: false, message: t("inventory.errCategoryExists") };
    }
    console.error("createCategory failed", error);
    return { ok: false, message: t("inventory.errCouldNotSaveCategory") };
  }
}

export async function updateCategory(input: { id: number; name: string }): Promise<ActionResult> {
  await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  const name = input.name.trim();
  if (!name) return { ok: false, message: t("inventory.errCategoryNameRequired") };

  try {
    const [result] = await pool.query("UPDATE stock_item_categories SET name = ? WHERE id = ?", [
      name,
      input.id,
    ]);
    if ((result as { affectedRows: number }).affectedRows === 0) {
      return { ok: false, message: t("inventory.errCategoryNotFound") };
    }
    return { ok: true };
  } catch (error) {
    if (isDuplicateCategoryError(error)) {
      return { ok: false, message: t("inventory.errCategoryExists") };
    }
    console.error("updateCategory failed", error);
    return { ok: false, message: t("inventory.errCouldNotSaveCategory") };
  }
}

export async function setCategoryStatus(input: {
  id: number;
  status: "ACTIVE" | "INACTIVE";
}): Promise<ActionResult> {
  await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  if (input.status !== "ACTIVE" && input.status !== "INACTIVE") {
    return { ok: false, message: t("inventory.errInvalidStatus") };
  }

  try {
    const [result] = await pool.query("UPDATE stock_item_categories SET status = ? WHERE id = ?", [
      input.status,
      input.id,
    ]);
    if ((result as { affectedRows: number }).affectedRows === 0) {
      return { ok: false, message: t("inventory.errCategoryNotFound") };
    }
    return { ok: true };
  } catch (error) {
    console.error("setCategoryStatus failed", error);
    return { ok: false, message: t("inventory.errCouldNotUpdateCategoryStatus") };
  }
}

// ── Suppliers ────────────────────────────────────────────────────────────

interface SupplierInput {
  name: string;
  contactPerson: string;
  phone: string;
}

function validateSupplierInput(input: SupplierInput, t: TranslateFn): string | null {
  if (!input.name.trim()) return t("inventory.errSupplierNameRequired");
  return null;
}

export async function createSupplier(input: SupplierInput): Promise<ActionResult> {
  await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  const validationError = validateSupplierInput(input, t);
  if (validationError) return { ok: false, message: validationError };

  try {
    await pool.query(
      "INSERT INTO suppliers (name, contact_person, phone, status) VALUES (?, ?, ?, 'ACTIVE')",
      [input.name.trim(), input.contactPerson.trim() || null, input.phone.trim() || null],
    );
    return { ok: true };
  } catch (error) {
    console.error("createSupplier failed", error);
    return { ok: false, message: t("inventory.errCouldNotSaveSupplier") };
  }
}

export async function updateSupplier(
  input: SupplierInput & { id: number },
): Promise<ActionResult> {
  await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  const validationError = validateSupplierInput(input, t);
  if (validationError) return { ok: false, message: validationError };

  try {
    const [result] = await pool.query(
      "UPDATE suppliers SET name = ?, contact_person = ?, phone = ? WHERE id = ?",
      [
        input.name.trim(),
        input.contactPerson.trim() || null,
        input.phone.trim() || null,
        input.id,
      ],
    );
    if ((result as { affectedRows: number }).affectedRows === 0) {
      return { ok: false, message: t("inventory.errSupplierNotFound") };
    }
    return { ok: true };
  } catch (error) {
    console.error("updateSupplier failed", error);
    return { ok: false, message: t("inventory.errCouldNotSaveSupplier") };
  }
}

export async function setSupplierStatus(input: {
  id: number;
  status: "ACTIVE" | "INACTIVE";
}): Promise<ActionResult> {
  await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  if (input.status !== "ACTIVE" && input.status !== "INACTIVE") {
    return { ok: false, message: t("inventory.errInvalidStatus") };
  }

  try {
    const [result] = await pool.query("UPDATE suppliers SET status = ? WHERE id = ?", [
      input.status,
      input.id,
    ]);
    if ((result as { affectedRows: number }).affectedRows === 0) {
      return { ok: false, message: t("inventory.errSupplierNotFound") };
    }
    return { ok: true };
  } catch (error) {
    console.error("setSupplierStatus failed", error);
    return { ok: false, message: t("inventory.errCouldNotUpdateSupplierStatus") };
  }
}
