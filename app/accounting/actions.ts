"use server";

import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { hasOutletAccess, requireRole } from "@/lib/auth-guard";
import { nextJournalNo, nextVoucherNo } from "@/lib/journal-no";
import { getT } from "@/lib/i18n/server";
import type { TranslateFn } from "@/lib/i18n/translate";
import { getOrLockStock, insertMovement, upsertStock } from "@/lib/inventory-mutations";
import { isInventoryAccountCode } from "@/lib/opening-balances";

const ALLOWED_ROLES = ["ADMIN", "ACCOUNTING"];

export interface ActionResult {
  ok: boolean;
  message?: string;
}

export interface JournalLineInput {
  accountId: number;
  debit: number;
  credit: number;
  memo?: string;
  /** Only on Persediaan (1200.xxx) lines: which ingredient, and how much in its stock unit. */
  stockItemId?: number;
  qty?: number;
}

export interface CreateJournalEntryInput {
  outletId: number;
  entryDate: string;
  pic?: string;
  memo: string;
  approvedBy?: string;
  acknowledgedBy?: string;
  lines: JournalLineInput[];
}

function validateLines(lines: JournalLineInput[], t: TranslateFn): string | null {
  if (lines.length < 2) return t("accounting.errMinTwoLines");
  for (const line of lines) {
    if (line.debit < 0 || line.credit < 0) return t("accounting.errAmountsNegative");
    if (line.debit > 0 && line.credit > 0) return t("accounting.errBothDebitCredit");
    if (line.debit === 0 && line.credit === 0) return t("accounting.errLineNeedsAmount");
    if (line.qty != null && (!Number.isFinite(line.qty) || line.qty <= 0)) {
      return t("accounting.errStockQtyRequired");
    }
  }
  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return t("accounting.errEntryNotBalanced", { debit: totalDebit, credit: totalCredit });
  }
  return null;
}

export async function createJournalEntry(input: CreateJournalEntryInput): Promise<ActionResult> {
  const session = await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  if (!(await hasOutletAccess(session, input.outletId))) {
    return { ok: false, message: t("pos.errNoOutletAccess") };
  }
  if (!input.memo.trim()) return { ok: false, message: t("accounting.errMemoRequired") };
  const lineError = validateLines(input.lines, t);
  if (lineError) return { ok: false, message: lineError };

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const journalNo = await nextJournalNo(conn);
    const voucherNo = await nextVoucherNo(conn);
    const [result] = await conn.query(
      `INSERT INTO journal_entries
         (journal_no, voucher_no, entry_date, outlet_id, pic, source_type, memo, approved_by, acknowledged_by, status, created_by)
       VALUES (?, ?, ?, ?, ?, 'MANUAL', ?, ?, ?, 'POSTED', ?)`,
      [
        journalNo,
        voucherNo,
        input.entryDate,
        input.outletId,
        input.pic?.trim() || null,
        input.memo.trim(),
        input.approvedBy?.trim() || null,
        input.acknowledgedBy?.trim() || null,
        Number(session.user.id),
      ],
    );
    const journalEntryId = (result as { insertId: number }).insertId;

    // Stock moves only through Persediaan lines: a purchase is
    // "Dr 1200.001 Persediaan (ingredient + qty) / Cr Kas|Bank|Hutang".
    // The ingredient's cost reaches HPP later, when the POS consumes it
    // (Dr 5000.xxx / Cr Persediaan) — never at purchase time.
    const [accountRows] = await conn.query<RowDataPacket[]>(
      "SELECT id, code FROM accounts WHERE id IN (?)",
      [Array.from(new Set(input.lines.map((l) => l.accountId)))],
    );
    const inventoryAccountIds = new Set(
      accountRows.filter((r) => isInventoryAccountCode(String(r.code))).map((r) => Number(r.id)),
    );
    const requestedStockIds = Array.from(
      new Set(input.lines.map((l) => l.stockItemId).filter((id): id is number => id != null)),
    );
    const activeStockIds = new Set<number>();
    if (requestedStockIds.length > 0) {
      const [stockRows] = await conn.query<RowDataPacket[]>(
        "SELECT id FROM stock_items WHERE id IN (?) AND status = 'ACTIVE'",
        [requestedStockIds],
      );
      for (const row of stockRows) activeStockIds.add(Number(row.id));
    }

    for (const line of input.lines) {
      const isInventoryLine = inventoryAccountIds.has(line.accountId);
      const stockItemId = isInventoryLine ? (line.stockItemId ?? null) : null;
      const qty = isInventoryLine ? (line.qty ?? null) : null;
      if (isInventoryLine && (stockItemId == null || qty == null || !activeStockIds.has(stockItemId))) {
        await conn.rollback();
        return { ok: false, message: t("accounting.errInventoryLineNeedsItem") };
      }

      await conn.query(
        `INSERT INTO journal_lines (journal_entry_id, account_id, stock_item_id, qty, debit, credit, memo)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          journalEntryId,
          line.accountId,
          stockItemId,
          qty,
          line.debit,
          line.credit,
          line.memo?.trim() || null,
        ],
      );

      if (stockItemId == null || qty == null) continue;

      const existing = await getOrLockStock(conn, input.outletId, stockItemId);
      const oldQty = existing?.qtyOnHand ?? 0;
      const oldAvg = existing?.avgCost ?? 0;

      if (line.debit > 0) {
        // Purchase: weighted-average the new batch's unit cost into the stock.
        const unitCost = line.debit / qty;
        const newQty = oldQty + qty;
        const newAvg = newQty > 0 ? (oldQty * oldAvg + qty * unitCost) / newQty : unitCost;
        await upsertStock(conn, input.outletId, stockItemId, newQty, newAvg);
        await insertMovement(conn, {
          outletId: input.outletId,
          stockItemId,
          movementType: "PURCHASE_IN",
          qty,
          unitCost,
          referenceType: "JOURNAL",
          referenceId: journalEntryId,
          createdBy: Number(session.user.id),
        });
      } else {
        // Credit on Persediaan (e.g. return to supplier): remove the qty and
        // exactly the credited value, so stock value keeps matching the ledger.
        if (qty > oldQty + 1e-9) {
          await conn.rollback();
          return { ok: false, message: t("inventory.errNotEnoughStock") };
        }
        const newQty = oldQty - qty;
        const newAvg = newQty > 1e-9 ? Math.max(0, oldQty * oldAvg - line.credit) / newQty : oldAvg;
        await upsertStock(conn, input.outletId, stockItemId, newQty, newAvg);
        await insertMovement(conn, {
          outletId: input.outletId,
          stockItemId,
          movementType: "ADJUSTMENT_OUT",
          qty,
          unitCost: line.credit / qty,
          referenceType: "JOURNAL",
          referenceId: journalEntryId,
          createdBy: Number(session.user.id),
        });
      }
    }

    await conn.commit();
    return { ok: true };
  } catch (error) {
    await conn.rollback();
    console.error("createJournalEntry failed", error);
    return { ok: false, message: t("accounting.errCouldNotSaveJournalEntry") };
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
  const { t } = await getT();
  if (!(await hasOutletAccess(session, input.outletId))) {
    return { ok: false, message: t("pos.errNoOutletAccess") };
  }
  if (input.txnType !== "IN" && input.txnType !== "OUT") {
    return { ok: false, message: t("accounting.errInvalidTxnType") };
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, message: t("accounting.errAmountPositive") };
  }
  if (input.cashAccountId === input.counterpartAccountId) {
    return { ok: false, message: t("accounting.errChooseTwoDifferentAccounts") };
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
      return { ok: false, message: t("accounting.errInvalidCashAccount") };
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
    return { ok: false, message: t("accounting.errCouldNotSaveCashTxn") };
  } finally {
    conn.release();
  }
}
