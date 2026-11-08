import "server-only";
import type { RowDataPacket } from "mysql2";
import type { Session } from "next-auth";
import pool from "@/lib/db";
import { getOutletsForUser, type OutletOption } from "@/lib/pos";
import { getOpeningBalanceSums } from "@/lib/opening-balances";

/**
 * General-ledger reporting core, shaped after "RULES SISTEM CAFE.xlsx":
 * Buku Besar History, Buku Besar Summary, Laba Rugi and Neraca all derive
 * from posted journal lines here.
 *
 * Amounts are debit-positive internally ("Dr-signed"): a credit balance is
 * negative. Statements flip the sign for revenue / liability / equity lines.
 */

export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";

/** Which outlets a report covers (journals and per-outlet opening balances are both filtered by it). */
export interface LedgerScope {
  outletIds: number[];
  /** 0 = all outlets the user can access. */
  selectedOutletId: number;
  label: string;
  outlets: OutletOption[];
}

export const ALL_OUTLETS = 0;

export async function resolveLedgerScope(
  session: Session,
  outletParam: string | undefined,
  allLabel: string,
): Promise<LedgerScope> {
  const outlets = await getOutletsForUser(session);
  const requested = outletParam === undefined ? ALL_OUTLETS : Number(outletParam);
  const single = outlets.find((o) => o.id === requested);
  if (single) {
    return { outletIds: [single.id], selectedOutletId: single.id, label: single.name, outlets };
  }
  return {
    outletIds: outlets.map((o) => o.id),
    selectedOutletId: ALL_OUTLETS,
    label: allLabel,
    outlets,
  };
}

export interface AccountMovement {
  id: number;
  code: string;
  name: string;
  accountType: AccountType;
  parentId: number | null;
  /** Dr-signed balance before `from` (incl. the scope's per-outlet opening balances). */
  beginning: number;
  debit: number;
  credit: number;
  /** Dr-signed balance at the end of `to`. */
  ending: number;
}

/** Every account with its beginning balance and period movement for the scope. */
export async function getAccountMovements(
  scope: LedgerScope,
  from: string,
  to: string,
): Promise<AccountMovement[]> {
  const outletIds = scope.outletIds.length ? scope.outletIds : [-1];
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT a.id, a.code, a.name, a.account_type AS accountType, a.parent_id AS parentId, a.status,
            COALESCE(SUM(CASE WHEN je.entry_date < ? THEN jl.debit - jl.credit END), 0) AS prior,
            COALESCE(SUM(CASE WHEN je.entry_date BETWEEN ? AND ? THEN jl.debit END), 0) AS debit,
            COALESCE(SUM(CASE WHEN je.entry_date BETWEEN ? AND ? THEN jl.credit END), 0) AS credit
     FROM accounts a
     LEFT JOIN journal_lines jl ON jl.account_id = a.id
     LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id
          AND je.status = 'POSTED' AND je.outlet_id IN (?)
     GROUP BY a.id
     ORDER BY a.code`,
    [from, from, to, from, to, outletIds],
  );
  const openings = await getOpeningBalanceSums(scope.outletIds);
  const result: AccountMovement[] = [];
  for (const r of rows) {
    const accountType = r.accountType as AccountType;
    const opening = openings.get(Number(r.id)) ?? 0;
    const beginning = opening + Number(r.prior);
    const debit = Number(r.debit);
    const credit = Number(r.credit);
    // Inactive accounts only appear when they actually carry a balance or movement.
    if (r.status === "INACTIVE" && beginning === 0 && debit === 0 && credit === 0) continue;
    result.push({
      id: Number(r.id),
      code: String(r.code),
      name: String(r.name),
      accountType,
      parentId: r.parentId === null ? null : Number(r.parentId),
      beginning,
      debit,
      credit,
      ending: beginning + debit - credit,
    });
  }
  return result;
}

export function hasActivity(a: Pick<AccountMovement, "beginning" | "debit" | "credit">): boolean {
  return Math.abs(a.beginning) > 0.004 || Math.abs(a.debit) > 0.004 || Math.abs(a.credit) > 0.004;
}

// ── Buku Besar History (General Ledger History) ─────────────────────────

export interface LedgerHistoryRow {
  date: string;
  sourceType: string;
  sourceNo: string;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
}

export async function getLedgerHistory(
  scope: LedgerScope,
  from: string,
  to: string,
  accountId: number | null,
): Promise<LedgerHistoryRow[]> {
  const outletIds = scope.outletIds.length ? scope.outletIds : [-1];
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT DATE_FORMAT(je.entry_date, '%Y-%m-%d') AS date, je.source_type AS sourceType,
            COALESCE(je.voucher_no, je.journal_no) AS sourceNo,
            a.code AS accountCode, a.name AS accountName,
            COALESCE(NULLIF(jl.memo, ''), je.memo, '') AS description,
            jl.debit, jl.credit
     FROM journal_lines jl
     JOIN journal_entries je ON je.id = jl.journal_entry_id
     JOIN accounts a ON a.id = jl.account_id
     WHERE je.status = 'POSTED' AND je.outlet_id IN (?) AND je.entry_date BETWEEN ? AND ?
       ${accountId ? "AND jl.account_id = ?" : ""}
     ORDER BY je.entry_date, je.id, jl.id`,
    accountId ? [outletIds, from, to, accountId] : [outletIds, from, to],
  );
  return rows.map((r) => ({
    date: String(r.date),
    sourceType: r.sourceType === null ? "MANUAL" : String(r.sourceType),
    sourceNo: String(r.sourceNo),
    accountCode: String(r.accountCode),
    accountName: String(r.accountName),
    description: String(r.description ?? ""),
    debit: Number(r.debit),
    credit: Number(r.credit),
  }));
}

// ── Buku Besar Summary (General Ledger Summary) ─────────────────────────

export interface LedgerSummaryRow {
  code: string;
  name: string;
  /** 0 = top-level account, 1 = child. */
  level: 0 | 1;
  beginning: number;
  debit: number;
  credit: number;
  netChange: number;
  ending: number;
}

/**
 * Parent rows aggregate themselves + their children (Accurate-style). A
 * parent that was also posted to directly (e.g. COGS falling back to the
 * "5000 HPP" header) gets that direct amount shown as its own child line.
 */
export function buildLedgerSummary(accounts: AccountMovement[], showZero: boolean): LedgerSummaryRow[] {
  const children = new Map<number, AccountMovement[]>();
  for (const a of accounts) {
    if (a.parentId !== null) children.set(a.parentId, [...(children.get(a.parentId) ?? []), a]);
  }
  const ids = new Set(accounts.map((a) => a.id));
  const tops = accounts.filter((a) => a.parentId === null || !ids.has(a.parentId));

  const toRow = (a: Pick<AccountMovement, "code" | "name" | "beginning" | "debit" | "credit">, level: 0 | 1) => ({
    code: a.code,
    name: a.name,
    level,
    beginning: a.beginning,
    debit: a.debit,
    credit: a.credit,
    netChange: a.debit - a.credit,
    ending: a.beginning + a.debit - a.credit,
  });

  const rows: LedgerSummaryRow[] = [];
  for (const top of tops) {
    const kids = children.get(top.id) ?? [];
    const sum = (k: "beginning" | "debit" | "credit") => top[k] + kids.reduce((s, c) => s + c[k], 0);
    const aggregate = { code: top.code, name: top.name, beginning: sum("beginning"), debit: sum("debit"), credit: sum("credit") };
    if (!showZero && !hasActivity(aggregate)) continue;
    rows.push(toRow(aggregate, 0));
    if (kids.length > 0 && hasActivity(top)) rows.push(toRow(top, 1));
    for (const kid of kids) {
      if (showZero || hasActivity(kid)) rows.push(toRow(kid, 1));
    }
  }
  return rows;
}

// ── Financial statements (Laba Rugi / Neraca) ───────────────────────────

export type StatementRow =
  | { kind: "section"; label: string }
  | { kind: "group"; label: string }
  | { kind: "line"; code: string; label: string; amount: number }
  | { kind: "subtotal"; label: string; amount: number }
  | { kind: "total"; label: string; amount: number };

export interface StatementLabels {
  sales: string;
  totalSales: string;
  cogs: string;
  totalCogs: string;
  grossProfit: string;
  operatingExpenses: string;
  totalOperatingExpenses: string;
  otherIncome: string;
  totalOtherIncome: string;
  otherExpenses: string;
  totalOtherExpenses: string;
  profitBeforeTax: string;
  incomeTax: string;
  profitAfterTax: string;
  assets: string;
  currentAssets: string;
  totalCurrentAssets: string;
  otherAssets: string;
  totalOtherAssets: string;
  fixedAssets: string;
  bookValue: string;
  totalAssets: string;
  liabilitiesHeading: string;
  currentLiabilities: string;
  totalCurrentLiabilities: string;
  longTermLiabilities: string;
  totalLongTermLiabilities: string;
  otherLiabilities: string;
  totalOtherLiabilities: string;
  equity: string;
  retainedEarningsPrior: string;
  retainedEarningsCurrent: string;
  totalEquity: string;
  totalLiabilitiesEquity: string;
}

/** Leaf-level lines of a set of accounts; a parent with its own postings appears as a line too. */
function leafLines(accounts: AccountMovement[], value: (a: AccountMovement) => number, showZero: boolean) {
  const parentIds = new Set(accounts.map((a) => a.parentId).filter((id): id is number => id !== null));
  return accounts
    .filter((a) => !parentIds.has(a.id) || Math.abs(value(a)) > 0.004)
    .filter((a) => showZero || Math.abs(value(a)) > 0.004)
    .map((a) => ({ kind: "line" as const, code: a.code, label: a.name, amount: value(a) }));
}

const firstDigit = (code: string) => code.trim().charAt(0);

export interface ProfitLossStatement {
  rows: StatementRow[];
  netProfit: number;
}

/**
 * Laba Rugi for [from, to]. Account classes follow the cafe COA:
 * 4xxx revenue = Penjualan, 5xxx = HPP, 6xxx = Biaya Operasional (grouped by
 * parent, e.g. 6100 / 6200), other revenue = Pendapatan Lain-lain, 7xxx
 * expense = Biaya Lain-lain, 8xxx/9xxx expense = Pajak Penghasilan.
 */
export function buildProfitLoss(
  accounts: AccountMovement[],
  labels: StatementLabels,
  showZero: boolean,
): ProfitLossStatement {
  const credit = (a: AccountMovement) => a.credit - a.debit;
  const debit = (a: AccountMovement) => a.debit - a.credit;
  const revenue = accounts.filter((a) => a.accountType === "REVENUE");
  const expense = accounts.filter((a) => a.accountType === "EXPENSE");
  const sales = revenue.filter((a) => firstDigit(a.code) === "4");
  const otherIncome = revenue.filter((a) => firstDigit(a.code) !== "4");
  const cogs = expense.filter((a) => firstDigit(a.code) === "5");
  const opex = expense.filter((a) => firstDigit(a.code) === "6");
  const otherExpense = expense.filter((a) => firstDigit(a.code) === "7");
  const tax = expense.filter((a) => ["8", "9"].includes(firstDigit(a.code)));
  const sum = (list: AccountMovement[], f: (a: AccountMovement) => number) => list.reduce((s, a) => s + f(a), 0);

  const totalSales = sum(sales, credit);
  const totalCogs = sum(cogs, debit);
  const grossProfit = totalSales - totalCogs;
  const totalOpex = sum(opex, debit);
  const totalOtherIncome = sum(otherIncome, credit);
  const totalOtherExpense = sum(otherExpense, debit);
  const profitBeforeTax = grossProfit - totalOpex + totalOtherIncome - totalOtherExpense;
  const totalTax = sum(tax, debit);

  const rows: StatementRow[] = [];
  rows.push({ kind: "section", label: labels.sales }, ...leafLines(sales, credit, showZero));
  rows.push({ kind: "subtotal", label: labels.totalSales, amount: totalSales });
  rows.push({ kind: "section", label: labels.cogs }, ...leafLines(cogs, debit, showZero));
  rows.push({ kind: "subtotal", label: labels.totalCogs, amount: totalCogs });
  rows.push({ kind: "total", label: labels.grossProfit, amount: grossProfit });

  rows.push({ kind: "section", label: labels.operatingExpenses });
  const opexParents = opex.filter((a) => a.parentId === null);
  const opexById = new Map(opex.map((a) => [a.id, a]));
  for (const parent of opexParents) {
    const group = opex.filter((a) => a.id === parent.id || a.parentId === parent.id);
    if (!showZero && Math.abs(sum(group, debit)) < 0.005) continue;
    rows.push({ kind: "group", label: `${parent.code} ${parent.name}` }, ...leafLines(group, debit, showZero));
  }
  // Children whose parent isn't itself a 6xxx account.
  const orphans = opex.filter((a) => a.parentId !== null && !opexById.has(a.parentId));
  rows.push(...leafLines(orphans, debit, showZero));
  rows.push({ kind: "subtotal", label: labels.totalOperatingExpenses, amount: totalOpex });

  rows.push({ kind: "section", label: labels.otherIncome }, ...leafLines(otherIncome, credit, showZero));
  rows.push({ kind: "subtotal", label: labels.totalOtherIncome, amount: totalOtherIncome });
  rows.push({ kind: "section", label: labels.otherExpenses }, ...leafLines(otherExpense, debit, showZero));
  rows.push({ kind: "subtotal", label: labels.totalOtherExpenses, amount: totalOtherExpense });
  rows.push({ kind: "total", label: labels.profitBeforeTax, amount: profitBeforeTax });
  rows.push({ kind: "line", code: "", label: labels.incomeTax, amount: totalTax });
  rows.push({ kind: "total", label: labels.profitAfterTax, amount: profitBeforeTax - totalTax });
  return { rows, netProfit: profitBeforeTax - totalTax };
}

export interface BalanceSheetStatement {
  rows: StatementRow[];
  totalAssets: number;
  totalLiabilitiesEquity: number;
}

/**
 * Neraca as of `asOf` (accounts' `ending`). P&L accounts never get closed by a
 * journal in this app, so retained earnings are derived: P&L before the
 * as-of year → "Saldo Laba Tahun Lalu"; P&L from 1 Jan → "Saldo Laba Tahun
 * Berjalan" (each added to the 3100 / 3200 account's own posted balance).
 *
 * Grouping by code: assets 1000–1299 lancar, 1300–1699 lainnya, 1700+ tetap
 * (accumulated depreciation nets in as negative → Nilai Buku); liabilities
 * 2000–2099 lancar, 2100–2199 lainnya (gaji, PB1, pajak), 2200+ jangka panjang.
 */
export function buildBalanceSheet(
  balancesAsOf: AccountMovement[],
  profitBeforeYear: number,
  profitThisYear: number,
  labels: StatementLabels,
  showZero: boolean,
): BalanceSheetStatement {
  const dr = (a: AccountMovement) => a.ending;
  const cr = (a: AccountMovement) => -a.ending;
  const codeNum = (a: AccountMovement) => Number(a.code.split(".")[0]);
  const sum = (list: AccountMovement[], f: (a: AccountMovement) => number) => list.reduce((s, a) => s + f(a), 0);

  const assets = balancesAsOf.filter((a) => a.accountType === "ASSET");
  const current = assets.filter((a) => codeNum(a) < 1300);
  const otherAssets = assets.filter((a) => codeNum(a) >= 1300 && codeNum(a) < 1700);
  const fixed = assets.filter((a) => codeNum(a) >= 1700);
  const liabilities = balancesAsOf.filter((a) => a.accountType === "LIABILITY");
  const currentLiab = liabilities.filter((a) => codeNum(a) < 2100);
  const otherLiab = liabilities.filter((a) => codeNum(a) >= 2100 && codeNum(a) < 2200);
  const longLiab = liabilities.filter((a) => codeNum(a) >= 2200);
  const equity = balancesAsOf.filter((a) => a.accountType === "EQUITY");

  const totalCurrent = sum(current, dr);
  const totalOtherAssets = sum(otherAssets, dr);
  const bookValue = sum(fixed, dr);
  const totalAssets = totalCurrent + totalOtherAssets + bookValue;

  const rows: StatementRow[] = [];
  rows.push({ kind: "section", label: labels.assets });
  rows.push({ kind: "group", label: labels.currentAssets }, ...leafLines(current, dr, showZero));
  rows.push({ kind: "subtotal", label: labels.totalCurrentAssets, amount: totalCurrent });
  rows.push({ kind: "group", label: labels.otherAssets }, ...leafLines(otherAssets, dr, showZero));
  rows.push({ kind: "subtotal", label: labels.totalOtherAssets, amount: totalOtherAssets });
  rows.push({ kind: "group", label: labels.fixedAssets }, ...leafLines(fixed, dr, showZero));
  rows.push({ kind: "subtotal", label: labels.bookValue, amount: bookValue });
  rows.push({ kind: "total", label: labels.totalAssets, amount: totalAssets });

  const totalCurrentLiab = sum(currentLiab, cr);
  const totalLongLiab = sum(longLiab, cr);
  const totalOtherLiab = sum(otherLiab, cr);
  rows.push({ kind: "section", label: labels.liabilitiesHeading });
  rows.push({ kind: "group", label: labels.currentLiabilities }, ...leafLines(currentLiab, cr, showZero));
  rows.push({ kind: "subtotal", label: labels.totalCurrentLiabilities, amount: totalCurrentLiab });
  rows.push({ kind: "group", label: labels.longTermLiabilities }, ...leafLines(longLiab, cr, showZero));
  rows.push({ kind: "subtotal", label: labels.totalLongTermLiabilities, amount: totalLongLiab });
  rows.push({ kind: "group", label: labels.otherLiabilities }, ...leafLines(otherLiab, cr, showZero));
  rows.push({ kind: "subtotal", label: labels.totalOtherLiabilities, amount: totalOtherLiab });

  const priorAccount = equity.find((a) => a.code === "3100");
  const currentAccount = equity.find((a) => a.code === "3200");
  const plainEquity = equity.filter((a) => a !== priorAccount && a !== currentAccount);
  const retainedPrior = (priorAccount ? cr(priorAccount) : 0) + profitBeforeYear;
  const retainedCurrent = (currentAccount ? cr(currentAccount) : 0) + profitThisYear;
  const totalEquity = sum(plainEquity, cr) + retainedPrior + retainedCurrent;
  rows.push({ kind: "group", label: labels.equity }, ...leafLines(plainEquity, cr, showZero));
  rows.push({ kind: "line", code: priorAccount?.code ?? "", label: labels.retainedEarningsPrior, amount: retainedPrior });
  rows.push({ kind: "line", code: currentAccount?.code ?? "", label: labels.retainedEarningsCurrent, amount: retainedCurrent });
  rows.push({ kind: "subtotal", label: labels.totalEquity, amount: totalEquity });

  const totalLiabilitiesEquity = totalCurrentLiab + totalLongLiab + totalOtherLiab + totalEquity;
  rows.push({ kind: "total", label: labels.totalLiabilitiesEquity, amount: totalLiabilitiesEquity });
  return { rows, totalAssets, totalLiabilitiesEquity };
}

/** Net profit (revenue − expense, incl. opening balances when in scope) over a set of movements' period. */
export function periodProfit(accounts: AccountMovement[], field: "period" | "beginning"): number {
  return accounts.reduce((s, a) => {
    if (a.accountType !== "REVENUE" && a.accountType !== "EXPENSE") return s;
    const drSigned = field === "period" ? a.debit - a.credit : a.beginning;
    return s - drSigned;
  }, 0);
}

/** Everything a Neraca page/export needs, as of `asOf`. */
export async function getBalanceSheet(
  scope: LedgerScope,
  asOf: string,
  labels: StatementLabels,
  showZero: boolean,
): Promise<BalanceSheetStatement> {
  const yearStart = `${asOf.slice(0, 4)}-01-01`;
  const accounts = await getAccountMovements(scope, yearStart, asOf);
  // beginning = before 1 Jan (prior years), debit/credit = this year up to asOf.
  return buildBalanceSheet(accounts, periodProfit(accounts, "beginning"), periodProfit(accounts, "period"), labels, showZero);
}
