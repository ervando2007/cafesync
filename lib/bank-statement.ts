import "server-only";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import type { LedgerScope } from "@/lib/ledger";

/**
 * Bank / Kas report laid out like a bank statement (rekening koran): one row per
 * posted journal line on the chosen accounts, with a running balance that starts
 * from the per-outlet COA opening balances of the outlets in scope.
 *
 * Columns follow the BANK's point of view, as on the printed statement:
 * "Debet" = money leaving the account (a credit in our books) and
 * "Kredit" = money coming in (a debit in our books), so the report can be
 * ticked off line by line against the bank's own statement.
 */

/** Bank leaf accounts under "1000 KAS DAN BANK" (everything except KAS itself). */
export const BANK_ACCOUNT_CODES = ["1000.002", "1000.003", "1000.004"];
/** The cash-on-hand account. */
export const CASH_ACCOUNT_CODES = ["1000.001"];

export interface BankAccountOption {
  id: number;
  code: string;
  name: string;
}

export interface BankStatementRow {
  /** "YYYY-MM-DD" (journal entry date). */
  date: string;
  /** "HH:MM:SS" (time the entry was recorded). */
  time: string;
  description: string;
  sourceNo: string;
  accountCode: string;
  accountName: string;
  /** Who recorded the entry (user name, or the voucher's PIC). */
  userId: string;
  /** Money out (bank-statement "Debet"). */
  debit: number;
  /** Money in (bank-statement "Kredit"). */
  credit: number;
  balance: number;
}

export interface BankStatement {
  opening: number;
  rows: BankStatementRow[];
  totalDebit: number;
  totalCredit: number;
  closing: number;
}

export async function getStatementAccounts(codes: string[]): Promise<BankAccountOption[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, code, name FROM accounts WHERE code IN (?) ORDER BY code",
    [codes],
  );
  return rows.map((r) => ({ id: Number(r.id), code: String(r.code), name: String(r.name) }));
}

export async function getBankStatement(
  scope: LedgerScope,
  accountIds: number[],
  from: string,
  to: string,
): Promise<BankStatement> {
  const outletIds = scope.outletIds.length ? scope.outletIds : [-1];
  const ids = accountIds.length ? accountIds : [-1];

  const [[prior]] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(jl.debit - jl.credit), 0) AS amount
     FROM journal_lines jl
     JOIN journal_entries je ON je.id = jl.journal_entry_id
     WHERE je.status = 'POSTED' AND je.outlet_id IN (?) AND jl.account_id IN (?) AND je.entry_date < ?`,
    [outletIds, ids, from],
  );
  // Per-outlet opening balances (Dr-signed) for the chosen accounts and outlets.
  const [[ob]] = await pool.query<RowDataPacket[]>(
    "SELECT COALESCE(SUM(amount), 0) AS amount FROM account_opening_balances WHERE account_id IN (?) AND outlet_id IN (?)",
    [ids, outletIds],
  );
  const opening = Number(prior.amount) + Number(ob.amount);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT DATE_FORMAT(je.entry_date, '%Y-%m-%d') AS date, DATE_FORMAT(je.created_at, '%H:%i:%s') AS time,
            COALESCE(NULLIF(jl.memo, ''), je.memo, '') AS description,
            COALESCE(je.voucher_no, je.journal_no) AS sourceNo,
            a.code AS accountCode, a.name AS accountName,
            COALESCE(u.name, je.pic, '') AS userId,
            jl.debit AS bookDebit, jl.credit AS bookCredit
     FROM journal_lines jl
     JOIN journal_entries je ON je.id = jl.journal_entry_id
     JOIN accounts a ON a.id = jl.account_id
     LEFT JOIN users u ON u.id = je.created_by
     WHERE je.status = 'POSTED' AND je.outlet_id IN (?) AND jl.account_id IN (?)
       AND je.entry_date BETWEEN ? AND ?
     ORDER BY je.entry_date, je.created_at, je.id, jl.id`,
    [outletIds, ids, from, to],
  );

  let balance = opening;
  let totalDebit = 0;
  let totalCredit = 0;
  const result: BankStatementRow[] = rows.map((r) => {
    const moneyIn = Number(r.bookDebit);
    const moneyOut = Number(r.bookCredit);
    balance += moneyIn - moneyOut;
    totalDebit += moneyOut;
    totalCredit += moneyIn;
    return {
      date: String(r.date),
      time: String(r.time),
      description: String(r.description ?? ""),
      sourceNo: String(r.sourceNo),
      accountCode: String(r.accountCode),
      accountName: String(r.accountName),
      userId: String(r.userId ?? ""),
      debit: moneyOut,
      credit: moneyIn,
      balance,
    };
  });

  return { opening, rows: result, totalDebit, totalCredit, closing: balance };
}
