import "server-only";
import type { RowDataPacket } from "mysql2";
import type { Pool, PoolConnection } from "mysql2/promise";
import pool from "@/lib/db";
import { SQL_TO_STOCK_FACTOR } from "@/lib/unit-conversion";

/**
 * Product sellability derived from its active recipe at an outlet:
 * - OUT: no active recipe (stock is fully system-controlled, so a product with
 *        no recipe has no stock), or some ingredient has less stock than one
 *        portion needs → can't be ordered.
 * - LOW: some ingredient is at/below its stock item's reorder level → orderable, but warn.
 * - OK:  everything else.
 */
export type ProductStockStatus = "OK" | "LOW" | "OUT";

export interface ProductAvailability {
  status: ProductStockStatus;
  /** Whole portions the current stock can still make (0 when there's no recipe). */
  portionsLeft: number | null;
  /** Names of ingredients at/below reorder level (LOW) or short of one portion (OUT). */
  ingredients: string[];
  /** True when OUT because the product has no active recipe at this outlet. */
  noRecipe: boolean;
}

export const NO_RECIPE_AVAILABILITY: ProductAvailability = {
  status: "OUT",
  portionsLeft: 0,
  ingredients: [],
  noRecipe: true,
};

export interface RecipeLine {
  productId: number;
  stockItemId: number;
  stockItemName: string;
  accountId: number | null;
  /** Stock-unit quantity one portion consumes (recipe qty converted to the stock unit, ÷ yield). */
  perPortion: number;
  qtyOnHand: number;
  avgCost: number;
  reorderLevel: number;
}

/**
 * Ingredient lines of each product's active recipe at an outlet. When a product
 * has several active versions, the highest version_no wins — the same rule the
 * POS uses when it deducts stock, so the badge and the deduction always agree.
 */
export async function loadActiveRecipeLines(
  db: Pool | PoolConnection,
  outletId: number,
  productIds?: number[],
): Promise<RecipeLine[]> {
  if (productIds && productIds.length === 0) return [];
  const productFilter = productIds ? `AND r.product_id IN (${productIds.map(() => "?").join(",")})` : "";
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT r.product_id AS productId, ri.stock_item_id AS stockItemId, si.name AS stockItemName,
            si.account_id AS accountId,
            ri.qty * ${SQL_TO_STOCK_FACTOR} / NULLIF(r.yield_qty, 0) AS perPortion,
            COALESCE(ist.qty_on_hand, 0) AS qtyOnHand, COALESCE(ist.avg_cost, 0) AS avgCost,
            si.reorder_level AS reorderLevel
     FROM recipes r
     JOIN recipe_items ri ON ri.recipe_id = r.id
     JOIN stock_items si ON si.id = ri.stock_item_id
     JOIN units ru ON ru.id = ri.unit_id
     JOIN units su ON su.id = si.unit_id
     LEFT JOIN inventory_stocks ist ON ist.stock_item_id = ri.stock_item_id AND ist.outlet_id = r.outlet_id
     WHERE r.outlet_id = ? AND r.is_active = 1 ${productFilter}
       AND r.version_no = (
         SELECT MAX(r2.version_no) FROM recipes r2
         WHERE r2.outlet_id = r.outlet_id AND r2.product_id = r.product_id AND r2.is_active = 1
       )`,
    [outletId, ...(productIds ?? [])],
  );
  return rows.map((r) => ({
    productId: Number(r.productId),
    stockItemId: Number(r.stockItemId),
    stockItemName: String(r.stockItemName),
    accountId: r.accountId === null ? null : Number(r.accountId),
    perPortion: Number(r.perPortion ?? 0),
    qtyOnHand: Number(r.qtyOnHand),
    avgCost: Number(r.avgCost),
    reorderLevel: Number(r.reorderLevel),
  }));
}

export function computeAvailability(lines: RecipeLine[]): Map<number, ProductAvailability> {
  const byProduct = new Map<number, RecipeLine[]>();
  for (const line of lines) {
    const list = byProduct.get(line.productId) ?? [];
    list.push(line);
    byProduct.set(line.productId, list);
  }

  const result = new Map<number, ProductAvailability>();
  for (const [productId, productLines] of byProduct) {
    const consuming = productLines.filter((l) => l.perPortion > 0);
    if (consuming.length === 0) {
      result.set(productId, NO_RECIPE_AVAILABILITY);
      continue;
    }

    const portionsLeft = Math.max(
      0,
      Math.min(...consuming.map((l) => Math.floor(l.qtyOnHand / l.perPortion + 1e-9))),
    );
    const short = consuming.filter((l) => l.qtyOnHand + 1e-9 < l.perPortion);
    if (short.length > 0) {
      result.set(productId, {
        status: "OUT",
        portionsLeft: 0,
        ingredients: short.map((l) => l.stockItemName),
        noRecipe: false,
      });
      continue;
    }

    const low = consuming.filter((l) => l.reorderLevel > 0 && l.qtyOnHand <= l.reorderLevel);
    result.set(productId, {
      status: low.length > 0 ? "LOW" : "OK",
      portionsLeft,
      ingredients: low.map((l) => l.stockItemName),
      noRecipe: false,
    });
  }
  return result;
}

/** Product ids among `productIds` with no consuming active recipe at the outlet (they have no stock). */
export function productsWithoutRecipe(recipeLines: RecipeLine[], productIds: number[]): number[] {
  const withRecipe = new Set(recipeLines.filter((l) => l.perPortion > 0).map((l) => l.productId));
  return productIds.filter((id) => !withRecipe.has(id));
}

/**
 * What would block the given order lines: products with no recipe, and
 * ingredients that would run short (summing products that share one).
 * Read-only (no locks): used to refuse customer QR orders up front; the
 * authoritative locked check happens when the POS takes payment.
 */
export async function findShortIngredients(
  db: Pool | PoolConnection,
  outletId: number,
  items: { productId: number; qty: number }[],
): Promise<{ ingredients: string[]; noRecipeProductIds: number[] }> {
  const productIds = Array.from(new Set(items.map((i) => i.productId)));
  const recipeLines = await loadActiveRecipeLines(db, outletId, productIds);
  const need = new Map<number, { line: RecipeLine; qty: number }>();
  for (const item of items) {
    for (const rl of recipeLines) {
      if (rl.productId !== item.productId || rl.perPortion <= 0) continue;
      const entry = need.get(rl.stockItemId) ?? { line: rl, qty: 0 };
      entry.qty += rl.perPortion * item.qty;
      need.set(rl.stockItemId, entry);
    }
  }
  return {
    ingredients: Array.from(need.values())
      .filter(({ line, qty }) => line.qtyOnHand + 1e-9 < qty)
      .map(({ line }) => line.stockItemName),
    noRecipeProductIds: productsWithoutRecipe(recipeLines, productIds),
  };
}

export async function getProductAvailability(
  outletId: number,
): Promise<Map<number, ProductAvailability>> {
  return computeAvailability(await loadActiveRecipeLines(pool, outletId));
}
