import "server-only";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { getStockItems } from "@/lib/inventory";
import { getCashFlowReport } from "@/lib/accounting";
import type { TranslateFn } from "@/lib/i18n/translate";

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
  accent: "green" | "blue" | "violet" | "orange" | "pink" | "teal";
}

interface WeekAggregate {
  netSales: number;
  orderCount: number;
  totalHpp: number;
  cashIn: number;
}

// PRD's "Net Sales" excludes tax (a pass-through liability, not revenue) — subtotal
// minus discount, not the tax-inclusive grand_total. "Cash In" is read from the
// same journal_lines ledger the Cash Flow report uses, so both numbers always agree.
async function getWeekAggregate(outletIds: number[], from: string, to: string): Promise<WeekAggregate> {
  if (!outletIds.length) return { netSales: 0, orderCount: 0, totalHpp: 0, cashIn: 0 };

  const [salesRows] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(o.subtotal - o.discount_total), 0) AS netSales,
            COUNT(DISTINCT o.id) AS orderCount,
            COALESCE(SUM(oi.hpp_total), 0) AS totalHpp
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.outlet_id IN (${outletFilter(outletIds)}) AND o.status = 'PAID'
       AND o.ordered_at BETWEEN ? AND ?`,
    [...outletIds, from, to],
  );
  const [cashRows] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(jl.debit), 0) AS cashIn
     FROM journal_lines jl
     JOIN journal_entries je ON je.id = jl.journal_entry_id
     JOIN accounts a ON a.id = jl.account_id
     WHERE je.outlet_id IN (${outletFilter(outletIds)}) AND je.status = 'POSTED'
       AND a.is_cash_bank = 1 AND je.entry_date BETWEEN ? AND ?`,
    [...outletIds, from.slice(0, 10), to.slice(0, 10)],
  );

  const r = salesRows[0];
  return {
    netSales: Number(r.netSales),
    orderCount: Number(r.orderCount),
    totalHpp: Number(r.totalHpp),
    cashIn: Number(cashRows[0].cashIn),
  };
}

function pctDelta(current: number, previous: number, t: TranslateFn): { label: string; direction: "up" | "down" } {
  if (previous === 0) {
    return current === 0
      ? { label: t("dashboard.vsLastWeek", { pct: "0" }), direction: "up" }
      : { label: t("dashboard.newVsLastWeek"), direction: "up" };
  }
  const pct = ((current - previous) / previous) * 100;
  return {
    label: t("dashboard.vsLastWeek", { pct: Math.abs(pct).toFixed(1) }),
    direction: pct >= 0 ? "up" : "down",
  };
}

export async function getStatCards(outletIds: number[], t: TranslateFn): Promise<StatCard[]> {
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

  const avgThis = thisWeek.orderCount > 0 ? thisWeek.netSales / thisWeek.orderCount : 0;
  const avgLast = lastWeek.orderCount > 0 ? lastWeek.netSales / lastWeek.orderCount : 0;
  const grossProfitThis = thisWeek.netSales - thisWeek.totalHpp;
  const grossProfitLast = lastWeek.netSales - lastWeek.totalHpp;

  const salesDelta = pctDelta(thisWeek.netSales, lastWeek.netSales, t);
  const ordersDelta = pctDelta(thisWeek.orderCount, lastWeek.orderCount, t);
  const avgDelta = pctDelta(avgThis, avgLast, t);
  const hppDelta = pctDelta(thisWeek.totalHpp, lastWeek.totalHpp, t);
  const profitDelta = pctDelta(grossProfitThis, grossProfitLast, t);
  const cashInDelta = pctDelta(thisWeek.cashIn, lastWeek.cashIn, t);

  // Exactly the PRD's Dashboard KPI list: Net Sales, Orders, Average Ticket,
  // HPP/COGS, Gross Profit, Cash In. Top Products and Outlet Ranking are the
  // two remaining PRD KPIs — those are the panels below, not stat cards.
  return [
    {
      label: t("dashboard.netSales"),
      value: formatRp(thisWeek.netSales),
      deltaLabel: salesDelta.label,
      deltaDirection: salesDelta.direction,
      isGood: salesDelta.direction === "up",
      accent: "green",
    },
    {
      label: t("dashboard.orders"),
      value: String(thisWeek.orderCount),
      deltaLabel: ordersDelta.label,
      deltaDirection: ordersDelta.direction,
      isGood: ordersDelta.direction === "up",
      accent: "blue",
    },
    {
      label: t("dashboard.averageTicket"),
      value: formatRp(avgThis),
      deltaLabel: avgDelta.label,
      deltaDirection: avgDelta.direction,
      isGood: avgDelta.direction === "up",
      accent: "violet",
    },
    {
      label: t("dashboard.hppCogs"),
      value: formatRp(thisWeek.totalHpp),
      deltaLabel: hppDelta.label,
      // Rising COGS is not "good" the way rising sales is — a bigger cost base
      // gets the neutral/red framing regardless of direction.
      deltaDirection: hppDelta.direction,
      isGood: hppDelta.direction === "down",
      accent: "pink",
    },
    {
      label: t("dashboard.grossProfit"),
      value: formatRp(grossProfitThis),
      deltaLabel: profitDelta.label,
      deltaDirection: profitDelta.direction,
      isGood: profitDelta.direction === "up",
      accent: "orange",
    },
    {
      label: t("dashboard.cashIn"),
      value: formatRp(thisWeek.cashIn),
      deltaLabel: cashInDelta.label,
      deltaDirection: cashInDelta.direction,
      isGood: cashInDelta.direction === "up",
      accent: "teal",
    },
  ];
}

export interface SalesPoint {
  day: string;
  thisWeek: number;
  lastWeek: number;
}

function weekdayLabels(t: TranslateFn): string[] {
  return [
    t("dashboard.weekdayMon"),
    t("dashboard.weekdayTue"),
    t("dashboard.weekdayWed"),
    t("dashboard.weekdayThu"),
    t("dashboard.weekdayFri"),
    t("dashboard.weekdaySat"),
    t("dashboard.weekdaySun"),
  ];
}

export async function getSalesOverview(outletIds: number[], t: TranslateFn): Promise<SalesPoint[]> {
  const WEEKDAY_LABELS = weekdayLabels(t);
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

export async function getSalesByCategory(outletIds: number[], t: TranslateFn): Promise<CategorySlice[]> {
  if (!outletIds.length) return [];
  const now = new Date();
  const thisWeekStart = mondayOf(now);
  const othersLabel = t("dashboard.othersCategory");

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(c.name, ?) AS categoryName, SUM(oi.line_total) AS total
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN products p ON p.id = oi.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE o.outlet_id IN (${outletFilter(outletIds)}) AND o.status = 'PAID'
       AND o.ordered_at BETWEEN ? AND ?
     GROUP BY categoryName
     ORDER BY total DESC`,
    [othersLabel, ...outletIds, `${toSqlDate(thisWeekStart)} 00:00:00`, `${toSqlDate(now)} 23:59:59`],
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
      name: othersLabel,
      percent: Math.round((restTotal / grandTotal) * 1000) / 10,
      color: CATEGORY_COLORS[4],
    });
  }
  return slices;
}

export async function getNetSalesLabel(outletIds: number[]): Promise<string> {
  const now = new Date();
  const thisWeekStart = mondayOf(now);
  const aggregate = await getWeekAggregate(
    outletIds,
    `${toSqlDate(thisWeekStart)} 00:00:00`,
    `${toSqlDate(now)} 23:59:59`,
  );
  return formatRp(aggregate.netSales);
}

export interface TopProduct {
  rank: number;
  name: string;
  qtyLabel: string;
  revenue: string;
}

export async function getTopProducts(outletIds: number[], t: TranslateFn): Promise<TopProduct[]> {
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
    qtyLabel: `${Number(r.totalQty)} ${r.unitName ?? t("dashboard.soldFallback")}`,
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
    `SELECT o.name, SUM(ord.subtotal - ord.discount_total) AS total
     FROM orders ord
     JOIN outlets o ON o.id = ord.outlet_id
     WHERE ord.outlet_id IN (${outletFilter(outletIds)}) AND ord.status = 'PAID'
       AND ord.ordered_at BETWEEN ? AND ?
     GROUP BY o.id
     ORDER BY total DESC`,
    [...outletIds, `${toSqlDate(thisWeekStart)} 00:00:00`, `${toSqlDate(now)} 23:59:59`],
  );

  const totalAcrossOutlets = rows.reduce((sum, r) => sum + Number(r.total), 0);
  if (totalAcrossOutlets === 0) return [];

  return rows.map((r) => ({
    name: String(r.name),
    amount: formatRp(Number(r.total)),
    percent: Math.round((Number(r.total) / totalAcrossOutlets) * 1000) / 10,
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

export async function getRecentOrders(outletIds: number[], t: TranslateFn): Promise<RecentOrder[]> {
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
        ? t("dashboard.channelDineInTable", { code: r.tableCode })
        : t("dashboard.channelDineIn")
      : r.channel === "DELIVERY"
        ? t("dashboard.channelDelivery")
        : t("dashboard.channelTakeaway");
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

export async function getStockAlerts(outletIds: number[], t: TranslateFn): Promise<StockAlertItem[]> {
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
    stockLabel: t("dashboard.stockLabel", { qty: item.qtyOnHand, unit: item.unitName }),
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
