import "server-only";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { getStockItems } from "@/lib/inventory";
import { getCashFlowReport } from "@/lib/accounting";

function formatRp(value: number): string {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

function outletFilter(outletIds: number[]): string {
  return outletIds.map(() => "?").join(",") || "NULL";
}

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toSqlDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export interface StatCard {
  label: string;
  value: string;
  deltaLabel: string;
  deltaDirection: "up" | "down";
  isGood: boolean;
  accent: "green" | "blue" | "violet" | "orange" | "pink";
}

interface WeekAggregate {
  totalSales: number;
  orderCount: number;
  totalHpp: number;
}

async function getWeekAggregate(outletIds: number[], from: string, to: string): Promise<WeekAggregate> {
  if (!outletIds.length) return { totalSales: 0, orderCount: 0, totalHpp: 0 };
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(o.grand_total), 0) AS totalSales, COUNT(DISTINCT o.id) AS orderCount,
            COALESCE(SUM(oi.hpp_total), 0) AS totalHpp
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.outlet_id IN (${outletFilter(outletIds)}) AND o.status = 'PAID'
       AND o.ordered_at BETWEEN ? AND ?`,
    [...outletIds, from, to],
  );
  const r = rows[0];
  return {
    totalSales: Number(r.totalSales),
    orderCount: Number(r.orderCount),
    totalHpp: Number(r.totalHpp),
  };
}

function pctDelta(current: number, previous: number): { label: string; direction: "up" | "down" } {
  if (previous === 0) {
    return current === 0 ? { label: "0% vs last week", direction: "up" } : { label: "New vs last week", direction: "up" };
  }
  const pct = ((current - previous) / previous) * 100;
  return {
    label: `${Math.abs(pct).toFixed(1)}% vs last week`,
    direction: pct >= 0 ? "up" : "down",
  };
}

export async function getStatCards(outletIds: number[]): Promise<StatCard[]> {
  const now = new Date();
  const thisWeekStart = mondayOf(now);
  const lastWeekStart = addDays(thisWeekStart, -7);

  const [thisWeek, lastWeek] = await Promise.all([
    getWeekAggregate(outletIds, `${toSqlDate(thisWeekStart)} 00:00:00`, `${toSqlDate(now)} 23:59:59`),
    getWeekAggregate(
      outletIds,
      `${toSqlDate(lastWeekStart)} 00:00:00`,
      `${toSqlDate(addDays(lastWeekStart, 6))} 23:59:59`,
    ),
  ]);

  const avgThis = thisWeek.orderCount > 0 ? thisWeek.totalSales / thisWeek.orderCount : 0;
  const avgLast = lastWeek.orderCount > 0 ? lastWeek.totalSales / lastWeek.orderCount : 0;
  const grossProfitThis = thisWeek.totalSales - thisWeek.totalHpp;
  const grossProfitLast = lastWeek.totalSales - lastWeek.totalHpp;
  const marginThis = thisWeek.totalSales > 0 ? (grossProfitThis / thisWeek.totalSales) * 100 : 0;
  const marginLast = lastWeek.totalSales > 0 ? (grossProfitLast / lastWeek.totalSales) * 100 : 0;

  const salesDelta = pctDelta(thisWeek.totalSales, lastWeek.totalSales);
  const ordersDelta = pctDelta(thisWeek.orderCount, lastWeek.orderCount);
  const avgDelta = pctDelta(avgThis, avgLast);
  const profitDelta = pctDelta(grossProfitThis, grossProfitLast);
  const marginDelta = pctDelta(marginThis, marginLast);

  return [
    {
      label: "Total Sales",
      value: formatRp(thisWeek.totalSales),
      deltaLabel: salesDelta.label,
      deltaDirection: salesDelta.direction,
      isGood: salesDelta.direction === "up",
      accent: "green",
    },
    {
      label: "Transactions",
      value: String(thisWeek.orderCount),
      deltaLabel: ordersDelta.label,
      deltaDirection: ordersDelta.direction,
      isGood: ordersDelta.direction === "up",
      accent: "blue",
    },
    {
      label: "Average Order Value",
      value: formatRp(avgThis),
      deltaLabel: avgDelta.label,
      deltaDirection: avgDelta.direction,
      isGood: avgDelta.direction === "up",
      accent: "violet",
    },
    {
      label: "Gross Profit",
      value: formatRp(grossProfitThis),
      deltaLabel: profitDelta.label,
      deltaDirection: profitDelta.direction,
      isGood: profitDelta.direction === "up",
      accent: "orange",
    },
    {
      label: "Gross Profit Margin",
      value: `${marginThis.toFixed(1)}%`,
      deltaLabel: marginDelta.label,
      deltaDirection: marginDelta.direction,
      isGood: marginDelta.direction === "up",
      accent: "pink",
    },
  ];
}

export interface SalesPoint {
  day: string;
  thisWeek: number;
  lastWeek: number;
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export async function getSalesOverview(outletIds: number[]): Promise<SalesPoint[]> {
  if (!outletIds.length) {
    return WEEKDAY_LABELS.map((day) => ({ day, thisWeek: 0, lastWeek: 0 }));
  }

  const now = new Date();
  const thisWeekStart = mondayOf(now);
  const lastWeekStart = addDays(thisWeekStart, -7);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT DATE(o.ordered_at) AS day, SUM(o.grand_total) AS total
     FROM orders o
     WHERE o.outlet_id IN (${outletFilter(outletIds)}) AND o.status = 'PAID'
       AND o.ordered_at BETWEEN ? AND ?
     GROUP BY DATE(o.ordered_at)`,
    [...outletIds, `${toSqlDate(lastWeekStart)} 00:00:00`, `${toSqlDate(now)} 23:59:59`],
  );
  const totalsByDate = new Map(rows.map((r) => [String(r.day), Number(r.total)]));

  return WEEKDAY_LABELS.map((label, i) => {
    const thisDate = addDays(thisWeekStart, i);
    const lastDate = addDays(lastWeekStart, i);
    return {
      day: `${label} ${String(thisDate.getDate()).padStart(2, "0")}/${String(thisDate.getMonth() + 1).padStart(2, "0")}`,
      thisWeek: totalsByDate.get(toSqlDate(thisDate)) ?? 0,
      lastWeek: totalsByDate.get(toSqlDate(lastDate)) ?? 0,
    };
  });
}

export interface CategorySlice {
  name: string;
  percent: number;
  color: string;
}

const CATEGORY_COLORS = ["#9a4b12", "#eb6834", "#1baf7a", "#4a3aa7", "#2a78d6"];

export async function getSalesByCategory(outletIds: number[]): Promise<CategorySlice[]> {
  if (!outletIds.length) return [];
  const now = new Date();
  const thisWeekStart = mondayOf(now);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(c.name, 'Others') AS categoryName, SUM(oi.line_total) AS total
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN products p ON p.id = oi.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE o.outlet_id IN (${outletFilter(outletIds)}) AND o.status = 'PAID'
       AND o.ordered_at BETWEEN ? AND ?
     GROUP BY categoryName
     ORDER BY total DESC`,
    [...outletIds, `${toSqlDate(thisWeekStart)} 00:00:00`, `${toSqlDate(now)} 23:59:59`],
  );

  const grandTotal = rows.reduce((sum, r) => sum + Number(r.total), 0);
  if (grandTotal === 0) return [];

  const top = rows.slice(0, 4);
  const rest = rows.slice(4);
  const slices: CategorySlice[] = top.map((r, i) => ({
    name: String(r.categoryName),
    percent: Math.round((Number(r.total) / grandTotal) * 1000) / 10,
    color: CATEGORY_COLORS[i],
  }));
  if (rest.length) {
    const restTotal = rest.reduce((sum, r) => sum + Number(r.total), 0);
    slices.push({
      name: "Others",
      percent: Math.round((restTotal / grandTotal) * 1000) / 10,
      color: CATEGORY_COLORS[4],
    });
  }
  return slices;
}

export async function getTotalSalesLabel(outletIds: number[]): Promise<string> {
  const now = new Date();
  const thisWeekStart = mondayOf(now);
  const aggregate = await getWeekAggregate(
    outletIds,
    `${toSqlDate(thisWeekStart)} 00:00:00`,
    `${toSqlDate(now)} 23:59:59`,
  );
  return formatRp(aggregate.totalSales);
}

export interface TopProduct {
  rank: number;
  name: string;
  qtyLabel: string;
  revenue: string;
}

export async function getTopProducts(outletIds: number[]): Promise<TopProduct[]> {
  if (!outletIds.length) return [];
  const now = new Date();
  const thisWeekStart = mondayOf(now);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT p.name, u.name AS unitName, SUM(oi.qty) AS totalQty, SUM(oi.line_total) AS totalRevenue
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN products p ON p.id = oi.product_id
     LEFT JOIN units u ON u.id = p.base_unit_id
     WHERE o.outlet_id IN (${outletFilter(outletIds)}) AND o.status = 'PAID'
       AND o.ordered_at BETWEEN ? AND ?
     GROUP BY p.id
     ORDER BY totalRevenue DESC
     LIMIT 5`,
    [...outletIds, `${toSqlDate(thisWeekStart)} 00:00:00`, `${toSqlDate(now)} 23:59:59`],
  );

  return rows.map((r, i) => ({
    rank: i + 1,
    name: String(r.name),
    qtyLabel: `${Number(r.totalQty)} ${r.unitName ?? "sold"}`,
    revenue: formatRp(Number(r.totalRevenue)),
  }));
}

export interface OutletSales {
  name: string;
  amount: string;
  percent: number;
}

export async function getSalesByOutlet(outletIds: number[]): Promise<OutletSales[]> {
  if (!outletIds.length) return [];
  const now = new Date();
  const thisWeekStart = mondayOf(now);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT o.name, SUM(ord.grand_total) AS total
     FROM orders ord
     JOIN outlets o ON o.id = ord.outlet_id
     WHERE ord.outlet_id IN (${outletFilter(outletIds)}) AND ord.status = 'PAID'
       AND ord.ordered_at BETWEEN ? AND ?
     GROUP BY o.id
     ORDER BY total DESC`,
    [...outletIds, `${toSqlDate(thisWeekStart)} 00:00:00`, `${toSqlDate(now)} 23:59:59`],
  );

  const grandTotal = rows.reduce((sum, r) => sum + Number(r.total), 0);
  if (grandTotal === 0) return [];

  return rows.map((r) => ({
    name: String(r.name),
    amount: formatRp(Number(r.total)),
    percent: Math.round((Number(r.total) / grandTotal) * 1000) / 10,
  }));
}

export interface RecentOrder {
  id: string;
  channel: "dine_in" | "takeaway";
  channelLabel: string;
  amount: string;
  status: "Completed" | "Paid" | "Preparing";
  time: string;
}

export async function getRecentOrders(outletIds: number[]): Promise<RecentOrder[]> {
  if (!outletIds.length) return [];

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT o.order_no, o.order_channel AS channel, o.grand_total, o.status,
            o.ordered_at, t.code AS tableCode
     FROM orders o
     LEFT JOIN dining_tables t ON t.id = o.table_id
     WHERE o.outlet_id IN (${outletFilter(outletIds)}) AND o.status NOT IN ('CANCELLED', 'REFUNDED')
     ORDER BY o.ordered_at DESC
     LIMIT 5`,
    outletIds,
  );

  return rows.map((r) => {
    const isDineIn = r.channel === "DINE_IN_STAFF" || r.channel === "DINE_IN_QR";
    const channelLabel = isDineIn
      ? r.tableCode
        ? `Table ${r.tableCode} · Dine In`
        : "Dine In"
      : r.channel === "DELIVERY"
        ? "Delivery"
        : "Take Away";
    const orderedAt = new Date(r.ordered_at);
    return {
      id: String(r.order_no),
      channel: isDineIn ? "dine_in" : "takeaway",
      channelLabel,
      amount: formatRp(Number(r.grand_total)),
      status: r.status === "PAID" ? "Completed" : "Preparing",
      time: orderedAt.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  });
}

export interface StockAlertItem {
  icon: "bottle" | "bean" | "bottle-syrup" | "cup";
  name: string;
  stockLabel: string;
  status: "Low Stock" | "Reorder Soon";
}

function iconForUnit(unitName: string): StockAlertItem["icon"] {
  if (unitName === "Liter") return "bottle";
  if (unitName === "Kilogram") return "bean";
  return "cup";
}

export async function getStockAlerts(outletIds: number[]): Promise<StockAlertItem[]> {
  if (!outletIds.length) return [];

  const perOutlet = await Promise.all(outletIds.map((id) => getStockItems(id)));
  const alerts = perOutlet
    .flat()
    .filter((item) => item.itemStatus === "ACTIVE" && item.status !== "IN_STOCK");

  const seen = new Set<number>();
  const unique = alerts.filter((item) => {
    if (seen.has(item.stockItemId)) return false;
    seen.add(item.stockItemId);
    return true;
  });

  unique.sort((a, b) => (a.status === "OUT_OF_STOCK" ? -1 : 1) - (b.status === "OUT_OF_STOCK" ? -1 : 1));

  return unique.slice(0, 4).map((item) => ({
    icon: iconForUnit(item.unitName),
    name: item.name,
    stockLabel: `Stock ${item.qtyOnHand} ${item.unitName}`,
    status: item.status === "OUT_OF_STOCK" ? "Low Stock" : "Reorder Soon",
  }));
}

export interface CashFlowSummary {
  opening: string;
  cashIn: string;
  cashOut: string;
  closing: string;
}

export async function getCashFlow(outletIds: number[]): Promise<CashFlowSummary> {
  if (!outletIds.length) {
    return { opening: formatRp(0), cashIn: formatRp(0), cashOut: formatRp(0), closing: formatRp(0) };
  }

  const now = new Date();
  const thisWeekStart = mondayOf(now);

  const reports = await Promise.all(
    outletIds.map((id) =>
      getCashFlowReport(id, `${toSqlDate(thisWeekStart)} 00:00:00`, `${toSqlDate(now)} 23:59:59`),
    ),
  );

  const totals = reports.reduce(
    (acc, r) => ({
      opening: acc.opening + r.openingBalance,
      cashIn: acc.cashIn + r.cashIn,
      cashOut: acc.cashOut + r.cashOut,
      closing: acc.closing + r.closingBalance,
    }),
    { opening: 0, cashIn: 0, cashOut: 0, closing: 0 },
  );

  return {
    opening: formatRp(totals.opening),
    cashIn: formatRp(totals.cashIn),
    cashOut: formatRp(totals.cashOut),
    closing: formatRp(totals.closing),
  };
}
