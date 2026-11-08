import "server-only";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";

/**
 * Stock position per ingredient for a period: opening → purchases → POS usage
 * → closing, each in the ingredient's stock unit (qty) and in Rupiah (value).
 *
 * Stock only moves through the system: journal entries on Persediaan
 * (debit = purchase, credit = return) and POS sales consuming recipes.
 * Any other inbound/outbound movement (legacy transfers/waste) is folded
 * into "net purchases" so opening + purchases − usage = closing always holds.
 *
 * Closing is derived from the live balance (inventory_stocks) minus movements
 * after the period, so the report always reconciles to the current stock.
 */

export type StockLevel = "OK" | "LOW" | "OUT";

export interface StockReportItem {
  id: number;
  sku: string;
  name: string;
  category: string;
  unitCode: string;
  unitName: string;
  reorderLevel: number;
  openingQty: number;
  openingValue: number;
  purchaseQty: number;
  purchaseValue: number;
  usageQty: number;
  usageValue: number;
  closingQty: number;
  closingValue: number;
  /** Closing value ÷ closing qty (weighted-average cost per stock unit). */
  avgCost: number;
  level: StockLevel;
}

export interface StockCategoryOption {
  id: number;
  name: string;
}

const IN_TYPES = "'PURCHASE_IN','ADJUSTMENT_IN','RETURN_IN','TRANSFER_IN'";

export async function getStockCategories(): Promise<StockCategoryOption[]> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT id, name FROM stock_item_categories ORDER BY name");
  return rows.map((r) => ({ id: Number(r.id), name: String(r.name) }));
}

export async function getStockReport(
  outletIds: number[],
  from: string,
  to: string,
  categoryId: number | null,
): Promise<StockReportItem[]> {
  const ids = outletIds.length ? outletIds : [-1];
  const start = `${from} 00:00:00`;
  const end = `${to} 23:59:59`;
  const signedQty = `CASE WHEN m.movement_type IN (${IN_TYPES}) THEN m.qty ELSE -m.qty END`;
  const signedValue = `CASE WHEN m.movement_type IN (${IN_TYPES}) THEN m.qty * m.unit_cost ELSE -m.qty * m.unit_cost END`;
  const inPeriod = "m.created_at BETWEEN ? AND ?";

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT si.id, si.sku, si.name, si.status, si.reorder_level AS reorderLevel,
            c.name AS category, u.code AS unitCode, u.name AS unitName,
            COALESCE(st.qty, 0) AS qtyNow, COALESCE(st.val, 0) AS valueNow,
            COALESCE(mv.saleQty, 0) AS saleQty, COALESCE(mv.saleValue, 0) AS saleValue,
            COALESCE(mv.otherQty, 0) AS otherQty, COALESCE(mv.otherValue, 0) AS otherValue,
            COALESCE(mv.afterQty, 0) AS afterQty, COALESCE(mv.afterValue, 0) AS afterValue
     FROM stock_items si
     JOIN stock_item_categories c ON c.id = si.category_id
     JOIN units u ON u.id = si.unit_id
     LEFT JOIN (
       SELECT stock_item_id, SUM(qty_on_hand) AS qty, SUM(qty_on_hand * avg_cost) AS val
       FROM inventory_stocks WHERE outlet_id IN (?) GROUP BY stock_item_id
     ) st ON st.stock_item_id = si.id
     LEFT JOIN (
       SELECT m.stock_item_id,
              SUM(CASE WHEN ${inPeriod} AND m.movement_type = 'SALE_OUT' THEN m.qty ELSE 0 END) AS saleQty,
              SUM(CASE WHEN ${inPeriod} AND m.movement_type = 'SALE_OUT' THEN m.qty * m.unit_cost ELSE 0 END) AS saleValue,
              SUM(CASE WHEN ${inPeriod} AND m.movement_type <> 'SALE_OUT' THEN ${signedQty} ELSE 0 END) AS otherQty,
              SUM(CASE WHEN ${inPeriod} AND m.movement_type <> 'SALE_OUT' THEN ${signedValue} ELSE 0 END) AS otherValue,
              SUM(CASE WHEN m.created_at > ? THEN ${signedQty} ELSE 0 END) AS afterQty,
              SUM(CASE WHEN m.created_at > ? THEN ${signedValue} ELSE 0 END) AS afterValue
       FROM inventory_movements m
       WHERE m.outlet_id IN (?) AND m.created_at >= ?
       GROUP BY m.stock_item_id
     ) mv ON mv.stock_item_id = si.id
     ${categoryId ? "WHERE si.category_id = ?" : ""}
     ORDER BY c.name, si.name`,
    [
      ids,
      start, end, start, end, start, end, start, end,
      end, end,
      ids, start,
      ...(categoryId ? [categoryId] : []),
    ],
  );

  // Strip float noise: qty to 6 decimals (column precision), value to 2.
  const q = (n: number) => Math.round(n * 1e6) / 1e6 + 0;
  const v = (n: number) => Math.round(n * 100) / 100 + 0;
  const result: StockReportItem[] = [];
  for (const r of rows) {
    const closingQty = q(Number(r.qtyNow) - Number(r.afterQty));
    const closingValue = v(Number(r.valueNow) - Number(r.afterValue));
    const purchaseQty = q(Number(r.otherQty));
    const purchaseValue = v(Number(r.otherValue));
    const usageQty = q(Number(r.saleQty));
    const usageValue = v(Number(r.saleValue));
    const openingQty = q(closingQty - purchaseQty + usageQty);
    const openingValue = v(closingValue - purchaseValue + usageValue);
    const active = [closingQty, purchaseQty, usageQty, openingQty].some((v) => Math.abs(v) > 1e-9);
    if (r.status === "INACTIVE" && !active) continue;

    const reorderLevel = Number(r.reorderLevel ?? 0);
    const level: StockLevel = closingQty <= 1e-9 ? "OUT" : closingQty <= reorderLevel ? "LOW" : "OK";
    result.push({
      id: Number(r.id),
      sku: String(r.sku),
      name: String(r.name),
      category: String(r.category),
      unitCode: String(r.unitCode),
      unitName: String(r.unitName),
      reorderLevel,
      openingQty,
      openingValue,
      purchaseQty,
      purchaseValue,
      usageQty,
      usageValue,
      closingQty,
      closingValue,
      avgCost: closingQty > 1e-9 ? v(closingValue / closingQty) : 0,
      level,
    });
  }
  return result;
}
