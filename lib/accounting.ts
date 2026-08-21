import "server-only";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";

export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";

export interface AccountOption {
  id: number;
  code: string;
  name: string;
  accountType: AccountType;
  isCashBank: boolean;
}

export async function getAccounts(): Promise<AccountOption[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, code, name, account_type AS accountType, is_cash_bank AS isCashBank FROM accounts WHERE status = 'ACTIVE' ORDER BY code",
  );
  return rows.map((r) => ({
    id: Number(r.id),
    code: String(r.code),
    name: String(r.name),
    accountType: r.accountType as AccountType,
    isCashBank: Boolean(r.isCashBank),
  }));
}

export interface JournalLineRow {
  accountId: number;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  memo: string | null;
}

export interface JournalEntryRow {
  id: number;
  journalNo: string;
  entryDate: string;
  outletName: string | null;
  sourceType: string | null;
  memo: string | null;
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
  const [headers] = await pool.query<RowDataPacket[]>(
    `SELECT je.id, je.journal_no AS journalNo, je.entry_date AS entryDate, o.name AS outletName,
            je.source_type AS sourceType, je.memo, je.status, u.name AS createdByName,
            je.created_at AS createdAt
     FROM journal_entries je
     LEFT JOIN outlets o ON o.id = je.outlet_id
     LEFT JOIN users u ON u.id = je.created_by
     WHERE je.outlet_id = ? AND je.entry_date BETWEEN ? AND ?
     ORDER BY je.entry_date DESC, je.id DESC`,
    [outletId, from, to],
  );
  if (!headers.length) return [];

  const ids = headers.map((h) => Number(h.id));
  const [lineRows] = await pool.query<RowDataPacket[]>(
    `SELECT jl.journal_entry_id AS journalEntryId, jl.account_id AS accountId,
            a.code AS accountCode, a.name AS accountName, jl.debit, jl.credit, jl.memo
     FROM journal_lines jl
     JOIN accounts a ON a.id = jl.account_id
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
      }));
    return {
      id: Number(h.id),
      journalNo: String(h.journalNo),
      entryDate: String(h.entryDate),
      outletName: h.outletName === null ? null : String(h.outletName),
      sourceType: h.sourceType === null ? null : String(h.sourceType),
      memo: h.memo === null ? null : String(h.memo),
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
            ct.txn_date AS txnDate, ct.description, u.name AS createdByName
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
  const openingBalance = Number(openingRows[0].balance);

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
