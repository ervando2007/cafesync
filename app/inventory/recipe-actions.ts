"use server";

import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { hasOutletAccess, requireRole } from "@/lib/auth-guard";
import { getT } from "@/lib/i18n/server";
import type { TranslateFn } from "@/lib/i18n/translate";
import { getConvertibleUnits } from "@/lib/inventory";
import { toStockFactor } from "@/lib/unit-conversion";

const ALLOWED_ROLES = ["ADMIN", "GM", "MANAGER"];

export interface ActionResult {
  ok: boolean;
  message?: string;
}

export interface RecipeItemInput {
  stockItemId: number;
  qty: number;
  unitId: number;
}

interface RecipeInput {
  outletId: number;
  productId: number;
  yieldQty: number;
  items: RecipeItemInput[];
}

function validateRecipeInput(input: RecipeInput, t: TranslateFn): string | null {
  if (!Number.isFinite(input.productId) || input.productId <= 0) {
    return t("inventory.errSelectProduct");
  }
  if (!Number.isFinite(input.yieldQty) || input.yieldQty <= 0) {
    return t("inventory.errYieldPositive");
  }
  if (!input.items.length) return t("inventory.errAddIngredient");
  for (const item of input.items) {
    if (item.qty <= 0) return t("inventory.errIngredientQtyPositive");
  }
  const seen = new Set(input.items.map((i) => i.stockItemId));
  if (seen.size !== input.items.length) return t("inventory.errDuplicateIngredient");
  return null;
}

/** True when every line's unit converts to its stock item's unit (same unit, or same group). */
async function unitsAreCompatible(
  conn: import("mysql2/promise").PoolConnection,
  items: RecipeItemInput[],
): Promise<boolean> {
  const units = new Map((await getConvertibleUnits()).map((u) => [u.id, u]));
  const [rows] = await conn.query<RowDataPacket[]>(
    "SELECT id, unit_id AS unitId FROM stock_items WHERE id IN (?)",
    [items.map((i) => i.stockItemId)],
  );
  const stockUnitByItem = new Map(rows.map((r) => [Number(r.id), Number(r.unitId)]));
  return items.every((item) => {
    const from = units.get(item.unitId);
    const stock = units.get(stockUnitByItem.get(item.stockItemId) ?? -1);
    return !!from && !!stock && toStockFactor(from, stock) !== null;
  });
}

async function replaceRecipeItems(
  conn: import("mysql2/promise").PoolConnection,
  recipeId: number,
  items: RecipeItemInput[],
): Promise<void> {
  await conn.query("DELETE FROM recipe_items WHERE recipe_id = ?", [recipeId]);
  if (!items.length) return;
  await conn.query(
    `INSERT INTO recipe_items (recipe_id, stock_item_id, qty, unit_id) VALUES ${items
      .map(() => "(?, ?, ?, ?)")
      .join(", ")}`,
    items.flatMap((i) => [recipeId, i.stockItemId, i.qty, i.unitId]),
  );
}

export async function createRecipe(input: RecipeInput): Promise<ActionResult> {
  const session = await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  if (!(await hasOutletAccess(session, input.outletId))) {
    return { ok: false, message: t("inventory.errNoOutletAccess") };
  }
  const validationError = validateRecipeInput(input, t);
  if (validationError) return { ok: false, message: validationError };

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = await conn.query<RowDataPacket[]>(
      "SELECT id FROM recipes WHERE outlet_id = ? AND product_id = ?",
      [input.outletId, input.productId],
    );
    if (existing.length) {
      await conn.rollback();
      return { ok: false, message: t("inventory.errRecipeExists") };
    }

    const [result] = await conn.query(
      `INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active, updated_by)
       VALUES (?, ?, 1, ?, 1, ?)`,
      [input.outletId, input.productId, input.yieldQty, Number(session.user.id)],
    );
    const recipeId = (result as { insertId: number }).insertId;

    if (!(await unitsAreCompatible(conn, input.items))) {
      await conn.rollback();
      return { ok: false, message: t("inventory.errIncompatibleUnit") };
    }
    await replaceRecipeItems(conn, recipeId, input.items);

    await conn.query("UPDATE outlet_products SET recipe_id = ? WHERE outlet_id = ? AND product_id = ?", [
      recipeId,
      input.outletId,
      input.productId,
    ]);

    await conn.commit();
    return { ok: true };
  } catch (error) {
    await conn.rollback();
    console.error("createRecipe failed", error);
    return { ok: false, message: t("inventory.errCouldNotSaveRecipe") };
  } finally {
    conn.release();
  }
}

export async function updateRecipe(
  input: Omit<RecipeInput, "productId"> & { recipeId: number },
): Promise<ActionResult> {
  const session = await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  if (!(await hasOutletAccess(session, input.outletId))) {
    return { ok: false, message: t("inventory.errNoOutletAccess") };
  }
  if (!Number.isFinite(input.yieldQty) || input.yieldQty <= 0) {
    return { ok: false, message: t("inventory.errYieldPositive") };
  }
  if (!input.items.length) return { ok: false, message: t("inventory.errAddIngredient") };
  for (const item of input.items) {
    if (item.qty <= 0) return { ok: false, message: t("inventory.errIngredientQtyPositive") };
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      "UPDATE recipes SET yield_qty = ?, updated_by = ? WHERE id = ? AND outlet_id = ?",
      [input.yieldQty, Number(session.user.id), input.recipeId, input.outletId],
    );
    if ((result as { affectedRows: number }).affectedRows === 0) {
      await conn.rollback();
      return { ok: false, message: t("inventory.errRecipeNotFound") };
    }

    if (!(await unitsAreCompatible(conn, input.items))) {
      await conn.rollback();
      return { ok: false, message: t("inventory.errIncompatibleUnit") };
    }
    await replaceRecipeItems(conn, input.recipeId, input.items);

    await conn.commit();
    return { ok: true };
  } catch (error) {
    await conn.rollback();
    console.error("updateRecipe failed", error);
    return { ok: false, message: t("inventory.errCouldNotSaveRecipe") };
  } finally {
    conn.release();
  }
}

export async function setRecipeStatus(input: {
  recipeId: number;
  outletId: number;
  isActive: boolean;
}): Promise<ActionResult> {
  const session = await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  if (!(await hasOutletAccess(session, input.outletId))) {
    return { ok: false, message: t("inventory.errNoOutletAccess") };
  }

  try {
    const [result] = await pool.query(
      "UPDATE recipes SET is_active = ?, updated_by = ? WHERE id = ? AND outlet_id = ?",
      [input.isActive ? 1 : 0, Number(session.user.id), input.recipeId, input.outletId],
    );
    if ((result as { affectedRows: number }).affectedRows === 0) {
      return { ok: false, message: t("inventory.errRecipeNotFound") };
    }
    return { ok: true };
  } catch (error) {
    console.error("setRecipeStatus failed", error);
    return { ok: false, message: t("inventory.errCouldNotUpdateRecipeStatus") };
  }
}
