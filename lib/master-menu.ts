import "server-only";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";

/**
 * "Master Menu" report (RULES SISTEM CAFE.xlsx → MENU). Columns mirror the
 * template, filled with what CafeSync actually does for each product:
 * - Tax: PB1 11% is applied by the POS to every item (app/pos/actions.ts).
 * - Other Tax: the 3.5% service charge, also applied to every item.
 * - Sales account: the account the POS credits for the sale.
 * - COGS account: products with an active recipe post COGS per ingredient
 *   (each stock item's 5000.xxx account); products without one post none.
 * - Discount account: the POS has no separate discount account — discounts
 *   reduce the sale amount directly — so it is shown as "-".
 */
export interface MasterMenuRow {
  menuId: string;
  name: string;
  category: string;
  tax: boolean;
  otherTax: boolean;
  customerPrint: boolean;
  salesAccount: string;
  cogsAccount: string | null;
  discountAccount: string | null;
  active: boolean;
}

const SALES_ACCOUNT_CODE = "4000.001";

export async function getMasterMenu(outletId: number): Promise<MasterMenuRow[]> {
  const [[salesRows], [rows]] = await Promise.all([
    pool.query<RowDataPacket[]>("SELECT code, name FROM accounts WHERE code = ?", [SALES_ACCOUNT_CODE]),
    pool.query<RowDataPacket[]>(
      `SELECT p.sku, p.name, c.name AS category, p.status,
              MAX(op.is_available) AS available,
              EXISTS(SELECT 1 FROM recipes r WHERE r.outlet_id = ? AND r.product_id = p.id AND r.is_active = 1) AS hasRecipe
       FROM outlet_products op
       JOIN products p ON p.id = op.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE op.outlet_id = ?
       GROUP BY p.id
       ORDER BY c.name, p.name`,
      [outletId, outletId],
    ),
  ]);
  const sales = salesRows[0] ? `${salesRows[0].code} ${salesRows[0].name}` : SALES_ACCOUNT_CODE;
  return rows.map((r) => ({
    menuId: String(r.sku),
    name: String(r.name),
    category: r.category === null ? "" : String(r.category),
    tax: true,
    otherTax: true,
    customerPrint: true,
    salesAccount: sales,
    cogsAccount: r.hasRecipe ? "5000.xxx" : null,
    discountAccount: null,
    active: r.status === "ACTIVE" && Boolean(Number(r.available)),
  }));
}
