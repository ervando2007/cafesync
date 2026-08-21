import "server-only";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";

export interface HppSummary {
  totalHpp: number;
  totalSales: number;
  totalQtySold: number;
  averageHppPerItem: number;
  hppPercentage: number;
  grossProfit: number;
}

export async function getHppSummary(
  outletId: number,
  from: string,
  to: string,
): Promise<HppSummary> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(oi.hpp_total), 0) AS totalHpp,
            COALESCE(SUM(oi.line_total), 0) AS totalSales,
            COALESCE(SUM(oi.qty), 0) AS totalQtySold
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.outlet_id = ? AND o.status = 'PAID' AND o.ordered_at BETWEEN ? AND ?`,
    [outletId, from, to],
  );
  const r = rows[0];
  const totalHpp = Number(r.totalHpp);
  const totalSales = Number(r.totalSales);
  const totalQtySold = Number(r.totalQtySold);
  return {
    totalHpp,
    totalSales,
    totalQtySold,
    averageHppPerItem: totalQtySold > 0 ? totalHpp / totalQtySold : 0,
    hppPercentage: totalSales > 0 ? (totalHpp / totalSales) * 100 : 0,
    grossProfit: totalSales - totalHpp,
  };
}

export interface HppByRecipeRow {
  productId: number;
  productName: string;
  categoryName: string | null;
  totalQtySold: number;
  totalHpp: number;
  hppPerServing: number;
  totalSales: number;
  grossProfit: number;
  hppPercentage: number;
}

export async function getHppByRecipe(
  outletId: number,
  from: string,
  to: string,
): Promise<HppByRecipeRow[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT p.id AS productId, p.name AS productName, c.name AS categoryName,
            SUM(oi.qty) AS totalQtySold, SUM(oi.hpp_total) AS totalHpp,
            SUM(oi.line_total) AS totalSales
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN products p ON p.id = oi.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE o.outlet_id = ? AND o.status = 'PAID' AND o.ordered_at BETWEEN ? AND ?
     GROUP BY p.id
     ORDER BY totalHpp DESC`,
    [outletId, from, to],
  );
  return rows.map((r) => {
    const totalQtySold = Number(r.totalQtySold);
    const totalHpp = Number(r.totalHpp);
    const totalSales = Number(r.totalSales);
    const grossProfit = totalSales - totalHpp;
    return {
      productId: Number(r.productId),
      productName: String(r.productName),
      categoryName: r.categoryName === null ? null : String(r.categoryName),
      totalQtySold,
      totalHpp,
      hppPerServing: totalQtySold > 0 ? totalHpp / totalQtySold : 0,
      totalSales,
      grossProfit,
      hppPercentage: totalSales > 0 ? (totalHpp / totalSales) * 100 : 0,
    };
  });
}

export interface HppByCategoryRow {
  categoryName: string;
  totalHpp: number;
}

export async function getHppByCategory(
  outletId: number,
  from: string,
  to: string,
): Promise<HppByCategoryRow[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(c.name, 'Uncategorized') AS categoryName, SUM(oi.hpp_total) AS totalHpp
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN products p ON p.id = oi.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE o.outlet_id = ? AND o.status = 'PAID' AND o.ordered_at BETWEEN ? AND ?
     GROUP BY categoryName
     ORDER BY totalHpp DESC`,
    [outletId, from, to],
  );
  return rows.map((r) => ({
    categoryName: String(r.categoryName),
    totalHpp: Number(r.totalHpp),
  }));
}

export interface TopCostIngredientRow {
  stockItemId: number;
  stockItemName: string;
  totalCost: number;
}

export async function getTopCostIngredients(
  outletId: number,
  from: string,
  to: string,
  limit = 5,
): Promise<TopCostIngredientRow[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT im.stock_item_id AS stockItemId, si.name AS stockItemName,
            SUM(im.qty * im.unit_cost) AS totalCost
     FROM inventory_movements im
     JOIN stock_items si ON si.id = im.stock_item_id
     WHERE im.outlet_id = ? AND im.movement_type = 'SALE_OUT' AND im.created_at BETWEEN ? AND ?
     GROUP BY im.stock_item_id
     ORDER BY totalCost DESC
     LIMIT ?`,
    [outletId, from, to, limit],
  );
  return rows.map((r) => ({
    stockItemId: Number(r.stockItemId),
    stockItemName: String(r.stockItemName),
    totalCost: Number(r.totalCost),
  }));
}
