"use server";

import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { hasOutletAccess, requireRole } from "@/lib/auth-guard";

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

function validateRecipeInput(input: RecipeInput): string | null {
  if (!Number.isFinite(input.productId) || input.productId <= 0) {
    return "Select a product for this recipe.";
  }
  if (!Number.isFinite(input.yieldQty) || input.yieldQty <= 0) {
    return "Yield must be greater than zero.";
  }
  if (!input.items.length) return "Add at least one ingredient.";
  for (const item of input.items) {
    if (item.qty <= 0) return "Ingredient quantity must be greater than zero.";
  }
  const seen = new Set(input.items.map((i) => i.stockItemId));
  if (seen.size !== input.items.length) return "Each ingredient can only appear once.";
  return null;
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
  if (!(await hasOutletAccess(session, input.outletId))) {
    return { ok: false, message: "You do not have access to this outlet." };
  }
  const validationError = validateRecipeInput(input);
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
      return { ok: false, message: "This product already has a recipe at this outlet." };
    }

    const [result] = await conn.query(
      `INSERT INTO recipes (outlet_id, product_id, version_no, yield_qty, is_active, updated_by)
       VALUES (?, ?, 1, ?, 1, ?)`,
      [input.outletId, input.productId, input.yieldQty, Number(session.user.id)],
    );
    const recipeId = (result as { insertId: number }).insertId;

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
    return { ok: false, message: "Could not save recipe. Please try again." };
  } finally {
    conn.release();
  }
}

export async function updateRecipe(
  input: Omit<RecipeInput, "productId"> & { recipeId: number },
): Promise<ActionResult> {
  const session = await requireRole(ALLOWED_ROLES);
  if (!(await hasOutletAccess(session, input.outletId))) {
    return { ok: false, message: "You do not have access to this outlet." };
  }
  if (!Number.isFinite(input.yieldQty) || input.yieldQty <= 0) {
    return { ok: false, message: "Yield must be greater than zero." };
  }
  if (!input.items.length) return { ok: false, message: "Add at least one ingredient." };
  for (const item of input.items) {
    if (item.qty <= 0) return { ok: false, message: "Ingredient quantity must be greater than zero." };
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
      return { ok: false, message: "Recipe not found." };
    }

    await replaceRecipeItems(conn, input.recipeId, input.items);

    await conn.commit();
    return { ok: true };
  } catch (error) {
    await conn.rollback();
    console.error("updateRecipe failed", error);
    return { ok: false, message: "Could not save recipe. Please try again." };
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
  if (!(await hasOutletAccess(session, input.outletId))) {
    return { ok: false, message: "You do not have access to this outlet." };
  }

  try {
    const [result] = await pool.query(
      "UPDATE recipes SET is_active = ?, updated_by = ? WHERE id = ? AND outlet_id = ?",
      [input.isActive ? 1 : 0, Number(session.user.id), input.recipeId, input.outletId],
    );
    if ((result as { affectedRows: number }).affectedRows === 0) {
      return { ok: false, message: "Recipe not found." };
    }
    return { ok: true };
  } catch (error) {
    console.error("setRecipeStatus failed", error);
    return { ok: false, message: "Could not update recipe status. Please try again." };
  }
}
