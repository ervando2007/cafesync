import "server-only";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";

export interface RecipeListRow {
  recipeId: number;
  productId: number;
  productName: string;
  productSku: string;
  productImageUrl: string | null;
  categoryName: string | null;
  yieldQty: number;
  isActive: boolean;
  totalCost: number;
  costPerServing: number;
  sellingPrice: number | null;
  grossProfit: number | null;
  grossProfitPercent: number | null;
}

async function attachCosts(
  outletId: number,
  rows: RowDataPacket[],
): Promise<RecipeListRow[]> {
  if (!rows.length) return [];

  const recipeIds = rows.map((r) => Number(r.recipeId));
  const [costRows] = await pool.query<RowDataPacket[]>(
    `SELECT ri.recipe_id AS recipeId, SUM(ri.qty * COALESCE(ist.avg_cost, 0)) AS totalCost
     FROM recipe_items ri
     LEFT JOIN inventory_stocks ist ON ist.stock_item_id = ri.stock_item_id AND ist.outlet_id = ?
     WHERE ri.recipe_id IN (${recipeIds.map(() => "?").join(",")})
     GROUP BY ri.recipe_id`,
    [outletId, ...recipeIds],
  );
  const costMap = new Map(costRows.map((r) => [Number(r.recipeId), Number(r.totalCost)]));

  return rows.map((r) => {
    const yieldQty = Number(r.yieldQty) || 1;
    const totalCost = costMap.get(Number(r.recipeId)) ?? 0;
    const costPerServing = totalCost / yieldQty;
    const sellingPrice = r.sellingPrice === null ? null : Number(r.sellingPrice);
    const grossProfit = sellingPrice === null ? null : sellingPrice - costPerServing;
    const grossProfitPercent =
      sellingPrice && sellingPrice > 0 && grossProfit !== null
        ? (grossProfit / sellingPrice) * 100
        : null;
    return {
      recipeId: Number(r.recipeId),
      productId: Number(r.productId),
      productName: String(r.productName),
      productSku: String(r.productSku),
      productImageUrl: r.productImageUrl === null ? null : String(r.productImageUrl),
      categoryName: r.categoryName === null ? null : String(r.categoryName),
      yieldQty,
      isActive: Boolean(r.isActive),
      totalCost,
      costPerServing,
      sellingPrice,
      grossProfit,
      grossProfitPercent,
    };
  });
}

export async function getRecipes(outletId: number): Promise<RecipeListRow[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT r.id AS recipeId, r.product_id AS productId, p.name AS productName, p.sku AS productSku,
            p.image_url AS productImageUrl, c.name AS categoryName, r.yield_qty AS yieldQty,
            r.is_active AS isActive, op.selling_price AS sellingPrice
     FROM recipes r
     JOIN products p ON p.id = r.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN outlet_products op ON op.outlet_id = r.outlet_id AND op.product_id = r.product_id
     WHERE r.outlet_id = ?
     ORDER BY p.name`,
    [outletId],
  );
  return attachCosts(outletId, rows);
}

export interface RecipeDetail extends RecipeListRow {
  productDescription: string | null;
  updatedAt: string;
  updatedByName: string | null;
}

export async function getRecipeDetail(
  outletId: number,
  recipeId: number,
): Promise<RecipeDetail | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT r.id AS recipeId, r.product_id AS productId, p.name AS productName, p.sku AS productSku,
            p.image_url AS productImageUrl, p.description AS productDescription,
            c.name AS categoryName, r.yield_qty AS yieldQty, r.is_active AS isActive,
            r.updated_at AS updatedAt, u.name AS updatedByName,
            op.selling_price AS sellingPrice
     FROM recipes r
     JOIN products p ON p.id = r.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN users u ON u.id = r.updated_by
     LEFT JOIN outlet_products op ON op.outlet_id = r.outlet_id AND op.product_id = r.product_id
     WHERE r.outlet_id = ? AND r.id = ?
     LIMIT 1`,
    [outletId, recipeId],
  );
  if (!rows.length) return null;
  const [withCost] = await attachCosts(outletId, rows);
  const r = rows[0];
  return {
    ...withCost,
    productDescription: r.productDescription === null ? null : String(r.productDescription),
    updatedAt: String(r.updatedAt),
    updatedByName: r.updatedByName === null ? null : String(r.updatedByName),
  };
}

export interface RecipeIngredientRow {
  stockItemId: number;
  stockItemName: string;
  qty: number;
  unitId: number;
  unitName: string;
  avgCost: number;
  lineCost: number;
}

export async function getRecipeIngredients(recipeId: number): Promise<RecipeIngredientRow[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ri.stock_item_id AS stockItemId, si.name AS stockItemName, ri.qty,
            ri.unit_id AS unitId, u.name AS unitName,
            COALESCE(ist.avg_cost, 0) AS avgCost
     FROM recipe_items ri
     JOIN stock_items si ON si.id = ri.stock_item_id
     JOIN units u ON u.id = ri.unit_id
     JOIN recipes r ON r.id = ri.recipe_id
     LEFT JOIN inventory_stocks ist ON ist.stock_item_id = ri.stock_item_id AND ist.outlet_id = r.outlet_id
     WHERE ri.recipe_id = ?
     ORDER BY si.name`,
    [recipeId],
  );
  return rows.map((r) => {
    const qty = Number(r.qty);
    const avgCost = Number(r.avgCost);
    return {
      stockItemId: Number(r.stockItemId),
      stockItemName: String(r.stockItemName),
      qty,
      unitId: Number(r.unitId),
      unitName: String(r.unitName),
      avgCost,
      lineCost: qty * avgCost,
    };
  });
}

export interface RecipeableProduct {
  productId: number;
  name: string;
  sku: string;
  hasRecipe: boolean;
}

export async function getRecipeableProducts(outletId: number): Promise<RecipeableProduct[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT p.id AS productId, p.name, p.sku,
            EXISTS(
              SELECT 1 FROM recipes r WHERE r.outlet_id = ? AND r.product_id = p.id
            ) AS hasRecipe
     FROM outlet_products op
     JOIN products p ON p.id = op.product_id
     WHERE op.outlet_id = ? AND p.status = 'ACTIVE'
     ORDER BY p.name`,
    [outletId, outletId],
  );
  return rows.map((r) => ({
    productId: Number(r.productId),
    name: String(r.name),
    sku: String(r.sku),
    hasRecipe: Boolean(r.hasRecipe),
  }));
}
