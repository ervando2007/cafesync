import "server-only";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import {
  getOpeningBalancesByAccount,
  openingIneligibleReason,
  type OpeningBalanceEntry,
  type OpeningIneligibleReason,
} from "@/lib/opening-balances";

export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";

export interface AccountOption {
  id: number;
  code: string;
  name: string;
  description: string | null;
  accountType: AccountType;
  isCashBank: boolean;
}

export async function getAccounts(): Promise<AccountOption[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, code, name, description, account_type AS accountType, is_cash_bank AS isCashBank FROM accounts WHERE status = 'ACTIVE' ORDER BY code",
  );
  return rows.map((r) => ({
    id: Number(r.id),
    code: String(r.code),
    name: String(r.name),
    description: r.description === null ? null : String(r.description),
    accountType: r.accountType as AccountType,
    isCashBank: Boolean(r.isCashBank),
  }));
}

export interface AccountRecord {
  id: number;
  code: string;
  name: string;
  description: string | null;
  accountType: AccountType;
  isCashBank: boolean;
  /** Per-outlet opening balances, Dr-signed (debit +, credit −); non-zero entries only. */
  openingBalances: OpeningBalanceEntry[];
  /** Why this account can't hold an opening balance, or null when it can. */
  openingIneligible: OpeningIneligibleReason | null;
  status: "ACTIVE" | "INACTIVE";
  parentId: number | null;
  parentCode: string | null;
  parentName: string | null;
}

/** Every account (both statuses), for the Master Data > Chart of Accounts management page. */
export async function getAllAccountsForManagement(): Promise<AccountRecord[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT a.id, a.code, a.name, a.description, a.account_type AS accountType, a.is_cash_bank AS isCashBank,
            EXISTS (SELECT 1 FROM accounts c WHERE c.parent_id = a.id) AS hasChildren,
            a.status, a.parent_id AS parentId, p.code AS parentCode, p.name AS parentName
     FROM accounts a
     LEFT JOIN accounts p ON p.id = a.parent_id
     ORDER BY a.code`,
  );
  const openings = await getOpeningBalancesByAccount();
  return rows.map((r) => ({
    id: Number(r.id),
    code: String(r.code),
    name: String(r.name),
    description: r.description === null ? null : String(r.description),
    accountType: r.accountType as AccountType,
    isCashBank: Boolean(r.isCashBank),
    openingBalances: openings.get(Number(r.id)) ?? [],
    openingIneligible: openingIneligibleReason({
      accountType: r.accountType as AccountType,
      code: String(r.code),
      hasChildren: Boolean(r.hasChildren),
    }),
    status: r.status as "ACTIVE" | "INACTIVE",
    parentId: r.parentId === null ? null : Number(r.parentId),
    parentCode: r.parentCode === null ? null : String(r.parentCode),
    parentName: r.parentName === null ? null : String(r.parentName),
  }));
}

export interface JournalLineRow {
  accountId: number;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  memo: string | null;
  stockItemId: number | null;
  stockItemName: string | null;
  unitName: string | null;
  qty: number | null;
}

export interface JournalEntryRow {
  id: number;
  journalNo: string;
  voucherNo: string | null;
  entryDate: string;
  outletName: string | null;
  pic: string | null;
  sourceType: string | null;
  memo: string | null;
  approvedBy: string | null;
  acknowledgedBy: string | null;
  status: "POSTED" | "REVERSED";
  createdByName: string | null;
  createdAt: string;
  lines: JournalLineRow[];
  totalDebit: number;
}

export async function getJournalEntries(
  outletId: number,
  from: string,
  to: string,
): Promise<JournalEntryRow[]> {
  return loadJournalEntries("je.outlet_id = ? AND je.entry_date BETWEEN ? AND ?", [outletId, from, to]);
}

/** One entry with its lines, plus its outlet id (for access checks). */
export async function getJournalEntryById(
  id: number,
): Promise<(JournalEntryRow & { outletId: number | null }) | null> {
  const [entry] = await loadJournalEntries("je.id = ?", [id]);
  if (!entry) return null;
  const [rows] = await pool.query<RowDataPacket[]>("SELECT outlet_id FROM journal_entries WHERE id = ?", [id]);
  return { ...entry, outletId: rows[0]?.outlet_id == null ? null : Number(rows[0].outlet_id) };
}

async function loadJournalEntries(where: string, params: unknown[]): Promise<JournalEntryRow[]> {
  const [headers] = await pool.query<RowDataPacket[]>(
    `SELECT je.id, je.journal_no AS journalNo, je.voucher_no AS voucherNo,
            DATE_FORMAT(je.entry_date, '%Y-%m-%d') AS entryDate, o.name AS outletName, je.pic,
            je.source_type AS sourceType, je.memo, je.approved_by AS approvedBy,
            je.acknowledged_by AS acknowledgedBy, je.status, u.name AS createdByName,
            je.created_at AS createdAt
     FROM journal_entries je
     LEFT JOIN outlets o ON o.id = je.outlet_id
     LEFT JOIN users u ON u.id = je.created_by
     WHERE ${where}
     ORDER BY je.entry_date DESC, je.id DESC`,
    params,
  );
  if (!headers.length) return [];

  const ids = headers.map((h) => Number(h.id));
  const [lineRows] = await pool.query<RowDataPacket[]>(
    `SELECT jl.journal_entry_id AS journalEntryId, jl.account_id AS accountId,
            a.code AS accountCode, a.name AS accountName, jl.debit, jl.credit, jl.memo,
            jl.stock_item_id AS stockItemId, si.name AS stockItemName, u2.name AS unitName, jl.qty
     FROM journal_lines jl
     JOIN accounts a ON a.id = jl.account_id
     LEFT JOIN stock_items si ON si.id = jl.stock_item_id
     LEFT JOIN units u2 ON u2.id = si.unit_id
     WHERE jl.journal_entry_id IN (${ids.map(() => "?").join(",")})
     ORDER BY jl.id`,
    ids,
  );

  return headers.map((h) => {
    const lines = lineRows
      .filter((l) => Number(l.journalEntryId) === Number(h.id))
      .map((l) => ({
        accountId: Number(l.accountId),
        accountCode: String(l.accountCode),
        accountName: String(l.accountName),
        debit: Number(l.debit),
        credit: Number(l.credit),
        memo: l.memo === null ? null : String(l.memo),
        stockItemId: l.stockItemId === null ? null : Number(l.stockItemId),
        stockItemName: l.stockItemName === null ? null : String(l.stockItemName),
        unitName: l.unitName === null ? null : String(l.unitName),
        qty: l.qty === null ? null : Number(l.qty),
      }));
    return {
      id: Number(h.id),
      journalNo: String(h.journalNo),
      voucherNo: h.voucherNo === null ? null : String(h.voucherNo),
      entryDate: String(h.entryDate),
      outletName: h.outletName === null ? null : String(h.outletName),
      pic: h.pic === null ? null : String(h.pic),
      sourceType: h.sourceType === null ? null : String(h.sourceType),
      memo: h.memo === null ? null : String(h.memo),
      approvedBy: h.approvedBy === null ? null : String(h.approvedBy),
      acknowledgedBy: h.acknowledgedBy === null ? null : String(h.acknowledgedBy),
      status: h.status as "POSTED" | "REVERSED",
      createdByName: h.createdByName === null ? null : String(h.createdByName),
      createdAt: String(h.createdAt),
      lines,
      totalDebit: lines.reduce((sum, l) => sum + l.debit, 0),
    };
  });
}

export interface CashTransactionRow {
  id: number;
  accountName: string;
  txnType: "IN" | "OUT";
  amount: number;
  txnDate: string;
  description: string | null;
  createdByName: string | null;
}

export async function getCashTransactions(
  outletId: number,
  from: string,
  to: string,
): Promise<CashTransactionRow[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ct.id, a.name AS accountName, ct.txn_type AS txnType, ct.amount,
            DATE_FORMAT(ct.txn_date, '%Y-%m-%d') AS txnDate, ct.description, u.name AS createdByName
     FROM cash_transactions ct
     JOIN accounts a ON a.id = ct.account_id
     LEFT JOIN users u ON u.id = ct.created_by
     WHERE ct.outlet_id = ? AND ct.txn_date BETWEEN ? AND ?
     ORDER BY ct.txn_date DESC, ct.id DESC`,
    [outletId, from, to],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    accountName: String(r.accountName),
    txnType: r.txnType as "IN" | "OUT",
    amount: Number(r.amount),
    txnDate: String(r.txnDate),
    description: r.description === null ? null : String(r.description),
    createdByName: r.createdByName === null ? null : String(r.createdByName),
  }));
}

export interface ProfitAndLossLine {
  accountId: number;
  accountCode: string;
  accountName: string;
  amount: number;
}

export interface ProfitAndLossReport {
  revenue: ProfitAndLossLine[];
  totalRevenue: number;
  expenses: ProfitAndLossLine[];
  totalExpenses: number;
  netProfit: number;
}

export async function getProfitAndLoss(
  outletId: number,
  from: string,
  to: string,
): Promise<ProfitAndLossReport> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT a.id AS accountId, a.code AS accountCode, a.name AS accountName, a.account_type AS accountType,
            SUM(jl.credit) AS totalCredit, SUM(jl.debit) AS totalDebit
     FROM journal_lines jl
     JOIN journal_entries je ON je.id = jl.journal_entry_id
     JOIN accounts a ON a.id = jl.account_id
     WHERE je.outlet_id = ? AND je.status = 'POSTED' AND je.entry_date BETWEEN ? AND ?
       AND a.account_type IN ('REVENUE', 'EXPENSE')
     GROUP BY a.id
     ORDER BY a.code`,
    [outletId, from, to],
  );

  const revenue: ProfitAndLossLine[] = [];
  const expenses: ProfitAndLossLine[] = [];

  for (const r of rows) {
    const totalCredit = Number(r.totalCredit);
    const totalDebit = Number(r.totalDebit);
    const line = {
      accountId: Number(r.accountId),
      accountCode: String(r.accountCode),
      accountName: String(r.accountName),
      amount: r.accountType === "REVENUE" ? totalCredit - totalDebit : totalDebit - totalCredit,
    };
    if (r.accountType === "REVENUE") revenue.push(line);
    else expenses.push(line);
  }

  const totalRevenue = revenue.reduce((sum, l) => sum + l.amount, 0);
  const totalExpenses = expenses.reduce((sum, l) => sum + l.amount, 0);

  return {
    revenue,
    totalRevenue,
    expenses,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
  };
}

export interface CashFlowReport {
  openingBalance: number;
  cashIn: number;
  cashOut: number;
  closingBalance: number;
}

export async function getCashFlowReport(
  outletId: number,
  from: string,
  to: string,
): Promise<CashFlowReport> {
  const [openingRows] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(jl.debit - jl.credit), 0) AS balance
     FROM journal_lines jl
     JOIN journal_entries je ON je.id = jl.journal_entry_id
     JOIN accounts a ON a.id = jl.account_id
     WHERE je.outlet_id = ? AND je.status = 'POSTED' AND je.entry_date < ? AND a.is_cash_bank = 1`,
    [outletId, from],
  );
  const [obRows] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(b.amount), 0) AS amount
     FROM account_opening_balances b JOIN accounts a ON a.id = b.account_id
     WHERE b.outlet_id = ? AND a.is_cash_bank = 1`,
    [outletId],
  );
  const openingBalance = Number(openingRows[0].balance) + Number(obRows[0].amount);

  const [periodRows] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(jl.debit), 0) AS cashIn, COALESCE(SUM(jl.credit), 0) AS cashOut
     FROM journal_lines jl
     JOIN journal_entries je ON je.id = jl.journal_entry_id
     JOIN accounts a ON a.id = jl.account_id
     WHERE je.outlet_id = ? AND je.status = 'POSTED' AND je.entry_date BETWEEN ? AND ? AND a.is_cash_bank = 1`,
    [outletId, from, to],
  );
  const cashIn = Number(periodRows[0].cashIn);
  const cashOut = Number(periodRows[0].cashOut);

  return {
    openingBalance,
    cashIn,
    cashOut,
    closingBalance: openingBalance + cashIn - cashOut,
  };
}
