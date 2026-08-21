"use server";

import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { hasOutletAccess, requireRole } from "@/lib/auth-guard";
import { nextJournalNo } from "@/lib/journal-no";

const ALLOWED_ROLES = ["ADMIN", "ACCOUNTING"];

export interface ActionResult {
  ok: boolean;
  message?: string;
}

export interface JournalLineInput {
  accountId: number;
  debit: number;
  credit: number;
}

export interface CreateJournalEntryInput {
  outletId: number;
  entryDate: string;
  memo: string;
  lines: JournalLineInput[];
}

function validateLines(lines: JournalLineInput[]): string | null {
  if (lines.length < 2) return "A journal entry needs at least two lines.";
  for (const line of lines) {
    if (line.debit < 0 || line.credit < 0) return "Amounts cannot be negative.";
    if (line.debit > 0 && line.credit > 0) return "A line cannot have both a debit and a credit.";
    if (line.debit === 0 && line.credit === 0) return "Every line needs a debit or credit amount.";
  }
  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return `Entry does not balance (debit ${totalDebit} vs credit ${totalCredit}).`;
  }
  return null;
}

export async function createJournalEntry(input: CreateJournalEntryInput): Promise<ActionResult> {
  const session = await requireRole(ALLOWED_ROLES);
  if (!(await hasOutletAccess(session, input.outletId))) {
    return { ok: false, message: "You do not have access to this outlet." };
  }
  if (!input.memo.trim()) return { ok: false, message: "A memo is required." };
  const lineError = validateLines(input.lines);
  if (lineError) return { ok: false, message: lineError };

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const journalNo = await nextJournalNo(conn);
    const [result] = await conn.query(
      `INSERT INTO journal_entries (journal_no, entry_date, outlet_id, source_type, memo, status, created_by)
       VALUES (?, ?, ?, 'MANUAL', ?, 'POSTED', ?)`,
      [journalNo, input.entryDate, input.outletId, input.memo.trim(), Number(session.user.id)],
    );
    const journalEntryId = (result as { insertId: number }).insertId;

    for (const line of input.lines) {
      await conn.query(
        "INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, ?)",
        [journalEntryId, line.accountId, line.debit, line.credit],
      );
    }

    await conn.commit();
    return { ok: true };
  } catch (error) {
    await conn.rollback();
    console.error("createJournalEntry failed", error);
    return { ok: false, message: "Could not save journal entry. Please try again." };
  } finally {
    conn.release();
  }
}

export interface CreateCashTransactionInput {
  outletId: number;
  cashAccountId: number;
  counterpartAccountId: number;
  txnType: "IN" | "OUT";
  amount: number;
  txnDate: string;
  description: string;
}

export async function createCashTransaction(
  input: CreateCashTransactionInput,
): Promise<ActionResult> {
  const session = await requireRole(ALLOWED_ROLES);
  if (!(await hasOutletAccess(session, input.outletId))) {
    return { ok: false, message: "You do not have access to this outlet." };
  }
  if (input.txnType !== "IN" && input.txnType !== "OUT") {
    return { ok: false, message: "Invalid transaction type." };
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, message: "Amount must be greater than zero." };
  }
  if (input.cashAccountId === input.counterpartAccountId) {
    return { ok: false, message: "Choose two different accounts." };
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [accountRows] = await conn.query<RowDataPacket[]>(
      "SELECT id, is_cash_bank FROM accounts WHERE id = ?",
      [input.cashAccountId],
    );
    if (!accountRows.length || !accountRows[0].is_cash_bank) {
      await conn.rollback();
      return { ok: false, message: "Selected cash/bank account is invalid." };
    }

    await conn.query(
      `INSERT INTO cash_transactions
         (outlet_id, account_id, txn_type, amount, txn_date, reference_type, description, created_by)
       VALUES (?, ?, ?, ?, ?, 'MANUAL', ?, ?)`,
      [
        input.outletId,
        input.cashAccountId,
        input.txnType,
        input.amount,
        input.txnDate,
        input.description.trim() || null,
        Number(session.user.id),
      ],
    );

    const journalNo = await nextJournalNo(conn);
    const [jeResult] = await conn.query(
      `INSERT INTO journal_entries (journal_no, entry_date, outlet_id, source_type, memo, status, created_by)
       VALUES (?, ?, ?, 'CASH_TXN', ?, 'POSTED', ?)`,
      [
        journalNo,
        input.txnDate,
        input.outletId,
        input.description.trim() || (input.txnType === "IN" ? "Cash In" : "Cash Out"),
        Number(session.user.id),
      ],
    );
    const journalEntryId = (jeResult as { insertId: number }).insertId;

    // Cash In: Dr cash/bank account, Cr counterpart. Cash Out: reverse.
    const cashDebit = input.txnType === "IN" ? input.amount : 0;
    const cashCredit = input.txnType === "OUT" ? input.amount : 0;
    const counterpartDebit = input.txnType === "OUT" ? input.amount : 0;
    const counterpartCredit = input.txnType === "IN" ? input.amount : 0;

    await conn.query(
      "INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, ?)",
      [journalEntryId, input.cashAccountId, cashDebit, cashCredit],
    );
    await conn.query(
      "INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, ?)",
      [journalEntryId, input.counterpartAccountId, counterpartDebit, counterpartCredit],
    );

    await conn.commit();
    return { ok: true };
  } catch (error) {
    await conn.rollback();
    console.error("createCashTransaction failed", error);
    return { ok: false, message: "Could not save cash transaction. Please try again." };
  } finally {
    conn.release();
  }
}
