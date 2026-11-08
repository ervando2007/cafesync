import "server-only";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";

/**
 * "Sales Menu Recapitulation By Time Report" (SALESREPORT.xlsx): one row per
 * sold order line of PAID orders, timed by when the bill was paid.
 *
 * Order-level amounts are spread over the lines in proportion to each line's
 * subtotal (bill discount, service charge, PB1), so every column sums back to
 * the order totals. PB1 is a restaurant tax → "Tax Total"; there is no VAT.
 */

export const MEAL_TIMES = ["BREAKFAST", "LUNCH", "DINNER", "SUPPER"] as const;
export type MealTime = (typeof MEAL_TIMES)[number];

/** Hour ranges (24h, start inclusive) per meal time; SUPPER wraps past midnight. */
export const MEAL_TIME_HOURS: Record<MealTime, [number, number]> = {
  BREAKFAST: [5, 11],
  LUNCH: [11, 16],
  DINNER: [16, 22],
  SUPPER: [22, 5],
};

export const SALES_TYPES = ["DINE_IN_STAFF", "DINE_IN_QR", "TAKEAWAY", "DELIVERY", "POS"] as const;
export type SalesType = (typeof SALES_TYPES)[number];

export const DAY_FILTERS = ["ALL", "WEEKDAY", "WEEKEND"] as const;
export type DayFilter = (typeof DAY_FILTERS)[number];

export interface SalesRecapFilters {
  outletIds: number[];
  from: string; // YYYY-MM-DD
  to: string;
  /** "HH:MM"; equal from/to = whole day; to <= from wraps past midnight (e.g. 23:00–00:00). */
  timeFrom: string;
  timeTo: string;
  days: DayFilter;
  salesType: SalesType | null;
  mealTime: MealTime | null;
}

export interface SalesRecapRow {
  salesDate: string; // YYYY-MM-DD
  salesTime: string; // HH:MM
  mealTime: MealTime;
  branch: string;
  salesType: SalesType;
  orderNo: string;
  menu: string;
  menuCode: string;
  menuCategory: string;
  menuCategoryDetail: string;
  price: number;
  qty: number;
  subtotal: number;
  menuDiscount: number;
  billDiscount: number;
  nettSales: number;
  serviceCharge: number;
  tax: number;
  vat: number;
  grandTotal: number;
}

export function mealTimeOf(hour: number): MealTime {
  for (const meal of MEAL_TIMES) {
    const [start, end] = MEAL_TIME_HOURS[meal];
    if (start < end ? hour >= start && hour < end : hour >= start || hour < end) return meal;
  }
  return "SUPPER";
}

function hourCondition(start: number, end: number): string {
  return start < end
    ? `(HOUR(ts) >= ${start} AND HOUR(ts) < ${end})`
    : `(HOUR(ts) >= ${start} OR HOUR(ts) < ${end})`;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function getSalesRecap(filters: SalesRecapFilters): Promise<SalesRecapRow[]> {
  const where: string[] = ["o.status = 'PAID'", "o.outlet_id IN (?)", "DATE(ts) BETWEEN ? AND ?"];
  const params: unknown[] = [filters.outletIds.length ? filters.outletIds : [-1], filters.from, filters.to];

  if (filters.timeFrom !== filters.timeTo) {
    // Start inclusive, end exclusive; "00:00" as an end means midnight.
    where.push(
      filters.timeFrom < filters.timeTo
        ? "(TIME(ts) >= ? AND TIME(ts) < ?)"
        : "(TIME(ts) >= ? OR TIME(ts) < ?)",
    );
    params.push(`${filters.timeFrom}:00`, `${filters.timeTo}:00`);
  }
  // DAYOFWEEK: 1 = Sunday … 7 = Saturday.
  if (filters.days === "WEEKDAY") where.push("DAYOFWEEK(ts) BETWEEN 2 AND 6");
  if (filters.days === "WEEKEND") where.push("DAYOFWEEK(ts) IN (1, 7)");
  if (filters.salesType) {
    where.push("o.salesType = ?");
    params.push(filters.salesType);
  }
  if (filters.mealTime) where.push(hourCondition(...MEAL_TIME_HOURS[filters.mealTime]));

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM (
       SELECT COALESCE(o.closed_at, o.ordered_at) AS ts, o.id AS orderId, o.order_no AS orderNo,
              o.outlet_id, o.status, o.order_channel AS salesType,
              o.subtotal AS orderSubtotal, o.discount_total AS orderDiscount,
              o.service_charge_total AS orderService, o.tax_total AS orderTax,
              ot.name AS branch, p.name AS menu, p.sku AS menuCode, p.product_type AS menuCategory,
              c.name AS menuCategoryDetail, oi.id AS itemId, oi.unit_price AS price, oi.qty,
              oi.line_total AS lineTotal, oi.discount AS menuDiscount
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN products p ON p.id = oi.product_id
       JOIN outlets ot ON ot.id = o.outlet_id
       LEFT JOIN categories c ON c.id = p.category_id
       -- Coarse prefilter on the raw columns so the derived table stays small;
       -- the exact paid-time window is applied outside.
       WHERE o.status = 'PAID' AND o.outlet_id IN (?)
         AND COALESCE(o.closed_at, o.ordered_at) BETWEEN ? AND ?
     ) o
     WHERE ${where.join(" AND ")}
     ORDER BY ts, orderId, itemId`,
    [params[0], `${filters.from} 00:00:00`, `${filters.to} 23:59:59`, ...params],
  );

  return rows.map((r) => {
    const ts = new Date(r.ts as Date);
    const subtotal = Number(r.lineTotal);
    const orderSubtotal = Number(r.orderSubtotal);
    const share = orderSubtotal > 0 ? subtotal / orderSubtotal : 0;
    const menuDiscount = Number(r.menuDiscount);
    const billDiscount = round2(Number(r.orderDiscount) * share);
    const nettSales = round2(subtotal - menuDiscount - billDiscount);
    const serviceCharge = round2(Number(r.orderService) * share);
    const tax = round2(Number(r.orderTax) * share);
    const pad = (n: number) => String(n).padStart(2, "0");
    return {
      salesDate: `${ts.getFullYear()}-${pad(ts.getMonth() + 1)}-${pad(ts.getDate())}`,
      salesTime: `${pad(ts.getHours())}:${pad(ts.getMinutes())}`,
      mealTime: mealTimeOf(ts.getHours()),
      branch: String(r.branch),
      salesType: r.salesType as SalesType,
      orderNo: String(r.orderNo),
      menu: String(r.menu),
      menuCode: String(r.menuCode),
      menuCategory: String(r.menuCategory),
      menuCategoryDetail: r.menuCategoryDetail === null ? "" : String(r.menuCategoryDetail),
      price: Number(r.price),
      qty: Number(r.qty),
      subtotal,
      menuDiscount,
      billDiscount,
      nettSales,
      serviceCharge,
      tax,
      vat: 0,
      grandTotal: round2(nettSales + serviceCharge + tax),
    };
  });
}

/** Parse the report's query params (shared by the page and the export route). */
export function parseSalesRecapParams(get: (key: string) => string | null | undefined) {
  const time = (v: string | null | undefined, fallback: string) => (v && /^\d{2}:\d{2}$/.test(v) ? v : fallback);
  const days = get("days");
  const type = get("type");
  const meal = get("meal");
  return {
    timeFrom: time(get("tf"), "00:00"),
    timeTo: time(get("tt"), "00:00"),
    days: (DAY_FILTERS as readonly string[]).includes(days ?? "") ? (days as DayFilter) : "ALL",
    salesType: (SALES_TYPES as readonly string[]).includes(type ?? "") ? (type as SalesType) : null,
    mealTime: (MEAL_TIMES as readonly string[]).includes(meal ?? "") ? (meal as MealTime) : null,
  };
}
