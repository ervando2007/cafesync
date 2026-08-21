"use server";

import type { RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import pool from "@/lib/db";
import { hasOutletAccess, requireRole } from "@/lib/auth-guard";
import { getT } from "@/lib/i18n/server";
import type { TranslateFn } from "@/lib/i18n/translate";

const ALLOWED_ROLES = ["ADMIN", "GM", "MANAGER"];

export interface ActionResult {
  ok: boolean;
  message?: string;
}

interface StockRow {
  qty_on_hand: string | number;
  avg_cost: string | number;
}

async function getOrLockStock(
  conn: PoolConnection,
  outletId: number,
  stockItemId: number,
): Promise<{ qtyOnHand: number; avgCost: number } | null> {
  const [rows] = await conn.query<(RowDataPacket & StockRow)[]>(
    "SELECT qty_on_hand, avg_cost FROM inventory_stocks WHERE outlet_id = ? AND stock_item_id = ? FOR UPDATE",
    [outletId, stockItemId],
  );
  if (!rows.length) return null;
  return { qtyOnHand: Number(rows[0].qty_on_hand), avgCost: Number(rows[0].avg_cost) };
}

async function upsertStock(
  conn: PoolConnection,
  outletId: number,
  stockItemId: number,
  qtyOnHand: number,
  avgCost: number,
): Promise<void> {
  await conn.query(
    `INSERT INTO inventory_stocks (outlet_id, stock_item_id, qty_on_hand, avg_cost)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE qty_on_hand = VALUES(qty_on_hand), avg_cost = VALUES(avg_cost)`,
    [outletId, stockItemId, qtyOnHand, avgCost],
  );
}

async function insertMovement(
  conn: PoolConnection,
  params: {
    outletId: number;
    stockItemId: number;
    movementType: string;
    qty: number;
    unitCost: number;
    referenceType: string;
    createdBy: number;
  },
): Promise<void> {
  await conn.query(
    `INSERT INTO inventory_movements
       (outlet_id, stock_item_id, movement_type, qty, unit_cost, reference_type, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      params.outletId,
      params.stockItemId,
      params.movementType,
      params.qty,
      params.unitCost,
      params.referenceType,
      params.createdBy,
    ],
  );
}

async function validStockItemIds(conn: PoolConnection, ids: number[]): Promise<Set<number>> {
  if (!ids.length) return new Set();
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT id FROM stock_items WHERE status = 'ACTIVE' AND id IN (${ids.map(() => "?").join(",")})`,
    ids,
  );
  return new Set(rows.map((r: RowDataPacket) => Number(r.id)));
}

// ── Stock In ─────────────────────────────────────────────────────────────

export interface StockInLine {
  stockItemId: number;
  qty: number;
  unitCost: number;
}

export async function stockIn(input: {
  outletId: number;
  supplierId: number | null;
  notes: string;
  items: StockInLine[];
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
      if (!valid.has(line.stockItemId) || line.qty <= 0 || line.unitCost < 0) {
        await conn.rollback();
        return { ok: false, message: t("inventory.errItemsInvalid") };
      }

      const existing = await getOrLockStock(conn, input.outletId, line.stockItemId);
      const oldQty = existing?.qtyOnHand ?? 0;
      const oldAvg = existing?.avgCost ?? 0;
      const newQty = oldQty + line.qty;
      const newAvg = newQty > 0 ? (oldQty * oldAvg + line.qty * line.unitCost) / newQty : line.unitCost;

      await upsertStock(conn, input.outletId, line.stockItemId, newQty, newAvg);
      await insertMovement(conn, {
        outletId: input.outletId,
        stockItemId: line.stockItemId,
        movementType: "PURCHASE_IN",
        qty: line.qty,
        unitCost: line.unitCost,
        referenceType: input.supplierId ? `SUPPLIER:${input.supplierId}` : "STOCK_IN",
        createdBy: Number(session.user.id),
      });
    }

    await conn.commit();
    return { ok: true };
  } catch (error) {
    await conn.rollback();
    console.error("stockIn failed", error);
    return { ok: false, message: t("inventory.errCouldNotSaveStockIn") };
  } finally {
    conn.release();
  }
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
  sku: string;
  name: string;
  unitId: number;
  categoryId: number;
  reorderLevel: number;
}

function validateStockItemInput(input: StockItemInput, t: TranslateFn): string | null {
  if (!input.sku.trim()) return t("inventory.errSkuRequired");
  if (!input.name.trim()) return t("inventory.errNameRequired");
  if (!Number.isFinite(input.categoryId) || input.categoryId <= 0) {
    return t("inventory.errCategoryRequired");
  }
  if (!Number.isFinite(input.unitId) || input.unitId <= 0) return t("inventory.errUnitRequired");
  if (!Number.isFinite(input.reorderLevel) || input.reorderLevel < 0) {
    return t("inventory.errReorderLevelNegative");
  }
  return null;
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

    await conn.query(
      `INSERT INTO stock_items (sku, name, unit_id, category_id, reorder_level, status)
       VALUES (?, ?, ?, ?, ?, 'ACTIVE')`,
      [input.sku.trim(), input.name.trim(), input.unitId, input.categoryId, input.reorderLevel],
    );
    return { ok: true };
  } catch (error) {
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

    const [result] = await conn.query(
      `UPDATE stock_items SET sku = ?, name = ?, unit_id = ?, category_id = ?, reorder_level = ?
       WHERE id = ?`,
      [
        input.sku.trim(),
        input.name.trim(),
        input.unitId,
        input.categoryId,
        input.reorderLevel,
        input.id,
      ],
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
