import "server-only";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";

export type ReportGranularity = "daily" | "monthly";

export interface SalesReportRow {
  period: string;
  orderCount: number;
  netSales: number;
  grandTotal: number;
  totalHpp: number;
  grossProfit: number;
}

export async function getSalesReport(
  outletId: number,
  from: string,
  to: string,
  granularity: ReportGranularity,
): Promise<SalesReportRow[]> {
  const periodExpr =
    granularity === "monthly"
      ? "DATE_FORMAT(o.ordered_at, '%Y-%m')"
      : "DATE_FORMAT(o.ordered_at, '%Y-%m-%d')";

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ${periodExpr} AS period,
            COUNT(DISTINCT o.id) AS orderCount,
            COALESCE(SUM(o.subtotal - o.discount_total), 0) AS netSales,
            COALESCE(SUM(o.grand_total), 0) AS grandTotal,
            COALESCE(SUM(oi.hpp_total), 0) AS totalHpp
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.outlet_id = ? AND o.status = 'PAID' AND o.ordered_at BETWEEN ? AND ?
     GROUP BY period
     ORDER BY period`,
    [outletId, from, to],
  );

  return rows.map((r) => {
    const netSales = Number(r.netSales);
    const totalHpp = Number(r.totalHpp);
    return {
      period: String(r.period),
      orderCount: Number(r.orderCount),
      netSales,
      grandTotal: Number(r.grandTotal),
      totalHpp,
      grossProfit: netSales - totalHpp,
    };
  });
}

export interface StockReportRow {
  period: string;
  movementCount: number;
  stockInValue: number;
  stockOutValue: number;
  netAdjustmentValue: number;
  netStockChange: number;
}

/**
 * Value-only report (Rupiah), not raw qty — stock_items mix units (kg, liter,
 * pcs), so summing inventory_movements.qty across items would be meaningless.
 * Transfers are intentionally excluded: they move stock between this app's own
 * outlets and net to zero company-wide, so they're not a stock *value* event
 * (the Transfers page already covers per-outlet transfer visibility).
 */
export async function getStockReport(
  outletId: number,
  from: string,
  to: string,
  granularity: ReportGranularity,
): Promise<StockReportRow[]> {
  const periodExpr =
    granularity === "monthly"
      ? "DATE_FORMAT(created_at, '%Y-%m')"
      : "DATE_FORMAT(created_at, '%Y-%m-%d')";

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ${periodExpr} AS period,
            COUNT(*) AS movementCount,
            COALESCE(SUM(CASE WHEN movement_type = 'PURCHASE_IN' THEN qty * unit_cost ELSE 0 END), 0) AS stockInValue,
            COALESCE(SUM(CASE WHEN movement_type = 'WASTE_OUT' THEN qty * unit_cost ELSE 0 END), 0) AS stockOutValue,
            COALESCE(SUM(CASE
              WHEN movement_type = 'ADJUSTMENT_IN' THEN qty * unit_cost
              WHEN movement_type = 'ADJUSTMENT_OUT' THEN -qty * unit_cost
              ELSE 0
            END), 0) AS netAdjustmentValue
     FROM inventory_movements
     WHERE outlet_id = ?
       AND movement_type IN ('PURCHASE_IN', 'WASTE_OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT')
       AND created_at BETWEEN ? AND ?
     GROUP BY period
     ORDER BY period`,
    [outletId, from, to],
  );

  return rows.map((r) => {
    const stockInValue = Number(r.stockInValue);
    const stockOutValue = Number(r.stockOutValue);
    const netAdjustmentValue = Number(r.netAdjustmentValue);
    return {
      period: String(r.period),
      movementCount: Number(r.movementCount),
      stockInValue,
      stockOutValue,
      netAdjustmentValue,
      netStockChange: stockInValue - stockOutValue + netAdjustmentValue,
    };
  });
}

export interface ProfitLossReportRow {
  period: string;
  revenue: number;
  expenses: number;
  netProfit: number;
}

/**
 * Period-by-period trend view of the ledger's P&L accounts — distinct from
 * `getProfitAndLoss` in lib/accounting.ts, which returns a single-period,
 * per-account itemized breakdown for the Accounting module's own page. This
 * one only aggregates by day/month, matching the other Reports pages' shape.
 */
export async function getProfitLossReport(
  outletId: number,
  from: string,
  to: string,
  granularity: ReportGranularity,
): Promise<ProfitLossReportRow[]> {
  const periodExpr =
    granularity === "monthly"
      ? "DATE_FORMAT(je.entry_date, '%Y-%m')"
      : "DATE_FORMAT(je.entry_date, '%Y-%m-%d')";

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ${periodExpr} AS period,
            COALESCE(SUM(CASE WHEN a.account_type = 'REVENUE' THEN jl.credit - jl.debit ELSE 0 END), 0) AS revenue,
            COALESCE(SUM(CASE WHEN a.account_type = 'EXPENSE' THEN jl.debit - jl.credit ELSE 0 END), 0) AS expenses
     FROM journal_lines jl
     JOIN journal_entries je ON je.id = jl.journal_entry_id
     JOIN accounts a ON a.id = jl.account_id
     WHERE je.outlet_id = ? AND je.status = 'POSTED' AND a.account_type IN ('REVENUE', 'EXPENSE')
       AND je.entry_date BETWEEN ? AND ?
     GROUP BY period
     ORDER BY period`,
    [outletId, from, to],
  );

  return rows.map((r) => {
    const revenue = Number(r.revenue);
    const expenses = Number(r.expenses);
    return {
      period: String(r.period),
      revenue,
      expenses,
      netProfit: revenue - expenses,
    };
  });
}

export interface CashAccountReportRow {
  period: string;
  cashIn: number;
  cashOut: number;
  netChange: number;
  closingBalance: number;
}

/**
 * Period-by-period ledger movement + running balance for a single cash/bank
 * account (e.g. code '1100' Kas or '1110' Bank) — same opening-balance +
 * period-movement shape as `getCashFlowReport` in lib/accounting.ts, but
 * scoped to one account instead of every is_cash_bank account combined, and
 * broken into a running closing balance per day/month instead of one summary.
 */
export async function getCashAccountReport(
  outletId: number,
  from: string,
  to: string,
  granularity: ReportGranularity,
  accountCode: string,
): Promise<CashAccountReportRow[]> {
  const periodExpr =
    granularity === "monthly"
      ? "DATE_FORMAT(je.entry_date, '%Y-%m')"
      : "DATE_FORMAT(je.entry_date, '%Y-%m-%d')";

  const [openingRows] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(jl.debit - jl.credit), 0) AS balance
     FROM journal_lines jl
     JOIN journal_entries je ON je.id = jl.journal_entry_id
     JOIN accounts a ON a.id = jl.account_id
     WHERE je.outlet_id = ? AND je.status = 'POSTED' AND a.code = ? AND je.entry_date < ?`,
    [outletId, accountCode, from],
  );
  let runningBalance = Number(openingRows[0].balance);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ${periodExpr} AS period,
            COALESCE(SUM(jl.debit), 0) AS cashIn,
            COALESCE(SUM(jl.credit), 0) AS cashOut
     FROM journal_lines jl
     JOIN journal_entries je ON je.id = jl.journal_entry_id
     JOIN accounts a ON a.id = jl.account_id
     WHERE je.outlet_id = ? AND je.status = 'POSTED' AND a.code = ? AND je.entry_date BETWEEN ? AND ?
     GROUP BY period
     ORDER BY period`,
    [outletId, accountCode, from, to],
  );

  return rows.map((r) => {
    const cashIn = Number(r.cashIn);
    const cashOut = Number(r.cashOut);
    const netChange = cashIn - cashOut;
    runningBalance += netChange;
    return {
      period: String(r.period),
      cashIn,
      cashOut,
      netChange,
      closingBalance: runningBalance,
    };
  });
}

export interface BalanceSheetReportRow {
  period: string;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  balanceCheck: number;
}

interface AccountTypeDelta {
  assetsDelta: number;
  liabilitiesDelta: number;
  equityDelta: number;
  netProfitDelta: number;
}

function applyAccountTypeDelta(
  delta: AccountTypeDelta,
  accountType: string,
  debitBalance: number,
  creditBalance: number,
): void {
  switch (accountType) {
    case "ASSET":
      delta.assetsDelta += debitBalance;
      break;
    case "LIABILITY":
      delta.liabilitiesDelta += creditBalance;
      break;
    case "EQUITY":
      delta.equityDelta += creditBalance;
      break;
    case "REVENUE":
      delta.netProfitDelta += creditBalance;
      break;
    case "EXPENSE":
      delta.netProfitDelta -= debitBalance;
      break;
  }
}

/**
 * A true point-in-time snapshot (Assets = Liabilities + Equity as of each
 * period's end), not a per-period delta like the other reports — this is the
 * standard definition of a balance sheet. Cumulative Revenue − Expense
 * ("current year earnings") is folded into Total Equity since this app's
 * journal never runs a formal year-end closing entry into a Retained
 * Earnings account — without that, Assets would drift away from
 * Liabilities + Equity as soon as any sale posts (Dr Kas/Bank Cr Penjualan
 * grows Assets with no matching Equity movement otherwise). `balanceCheck`
 * (Assets − (Liabilities + Equity), always expected to be 0) is exposed so a
 * broken/unbalanced posting anywhere in the system is immediately visible
 * rather than silently absorbed.
 */
export async function getBalanceSheetReport(
  outletId: number,
  from: string,
  to: string,
  granularity: ReportGranularity,
): Promise<BalanceSheetReportRow[]> {
  const periodExpr =
    granularity === "monthly"
      ? "DATE_FORMAT(je.entry_date, '%Y-%m')"
      : "DATE_FORMAT(je.entry_date, '%Y-%m-%d')";

  const [openingRows] = await pool.query<RowDataPacket[]>(
    `SELECT a.account_type AS accountType,
            COALESCE(SUM(jl.debit - jl.credit), 0) AS debitBalance,
            COALESCE(SUM(jl.credit - jl.debit), 0) AS creditBalance
     FROM journal_lines jl
     JOIN journal_entries je ON je.id = jl.journal_entry_id
     JOIN accounts a ON a.id = jl.account_id
     WHERE je.outlet_id = ? AND je.status = 'POSTED' AND je.entry_date < ?
     GROUP BY a.account_type`,
    [outletId, from],
  );

  const running: AccountTypeDelta = {
    assetsDelta: 0,
    liabilitiesDelta: 0,
    equityDelta: 0,
    netProfitDelta: 0,
  };
  for (const r of openingRows) {
    applyAccountTypeDelta(running, String(r.accountType), Number(r.debitBalance), Number(r.creditBalance));
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ${periodExpr} AS period, a.account_type AS accountType,
            COALESCE(SUM(jl.debit - jl.credit), 0) AS debitBalance,
            COALESCE(SUM(jl.credit - jl.debit), 0) AS creditBalance
     FROM journal_lines jl
     JOIN journal_entries je ON je.id = jl.journal_entry_id
     JOIN accounts a ON a.id = jl.account_id
     WHERE je.outlet_id = ? AND je.status = 'POSTED' AND je.entry_date BETWEEN ? AND ?
     GROUP BY period, a.account_type
     ORDER BY period`,
    [outletId, from, to],
  );

  const periodDeltas = new Map<string, AccountTypeDelta>();
  for (const r of rows) {
    const period = String(r.period);
    const delta = periodDeltas.get(period) ?? {
      assetsDelta: 0,
      liabilitiesDelta: 0,
      equityDelta: 0,
      netProfitDelta: 0,
    };
    applyAccountTypeDelta(delta, String(r.accountType), Number(r.debitBalance), Number(r.creditBalance));
    periodDeltas.set(period, delta);
  }

  const result: BalanceSheetReportRow[] = [];
  for (const period of Array.from(periodDeltas.keys()).sort()) {
    const delta = periodDeltas.get(period)!;
    running.assetsDelta += delta.assetsDelta;
    running.liabilitiesDelta += delta.liabilitiesDelta;
    running.equityDelta += delta.equityDelta;
    running.netProfitDelta += delta.netProfitDelta;

    const totalAssets = running.assetsDelta;
    const totalLiabilities = running.liabilitiesDelta;
    const totalEquity = running.equityDelta + running.netProfitDelta;
    result.push({
      period,
      totalAssets,
      totalLiabilities,
      totalEquity,
      balanceCheck: totalAssets - (totalLiabilities + totalEquity),
    });
  }

  return result;
}
