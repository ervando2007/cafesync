import "server-only";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import type { AccountType } from "@/lib/accounting";

/**
 * Per-outlet account opening balances (account_opening_balances).
 *
 * amount is Dr-signed (debit +, credit −). Rules, enforced on input:
 *  - balance-sheet accounts only (ASSET / LIABILITY / EQUITY) — profit & loss
 *    accounts start every period at 0; prior profit goes to 3100 LABA RUGI TAHUN LALU;
 *  - posting (leaf) accounts only — a parent's balance is the sum of its children;
 *  - not Persediaan (1200 / 1200.*) — opening stock must come in through a journal
 *    with ingredient + qty, otherwise stock and ledger disagree;
 *  - per outlet, debits must equal credits (checked and shown on the COA page;
 *    entry is account by account, so an unbalanced state is allowed while typing).
 */

export type OpeningIneligibleReason = "PROFIT_LOSS" | "HAS_CHILDREN" | "INVENTORY";

export function isInventoryAccountCode(code: string): boolean {
  return code === "1200" || code.startsWith("1200.");
}

export function openingIneligibleReason(account: {
  accountType: AccountType;
  code: string;
  hasChildren: boolean;
}): OpeningIneligibleReason | null {
  if (account.accountType === "REVENUE" || account.accountType === "EXPENSE") return "PROFIT_LOSS";
  if (account.hasChildren) return "HAS_CHILDREN";
  if (isInventoryAccountCode(account.code)) return "INVENTORY";
  return null;
}

export interface OpeningBalanceEntry {
  outletId: number;
  /** Dr-signed. */
  amount: number;
}

/** accountId → entries (non-zero only). */
export async function getOpeningBalancesByAccount(): Promise<Map<number, OpeningBalanceEntry[]>> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT account_id AS accountId, outlet_id AS outletId, amount FROM account_opening_balances WHERE amount <> 0",
  );
  const map = new Map<number, OpeningBalanceEntry[]>();
  for (const r of rows) {
    const list = map.get(Number(r.accountId)) ?? [];
    list.push({ outletId: Number(r.outletId), amount: Number(r.amount) });
    map.set(Number(r.accountId), list);
  }
  return map;
}

export interface OutletOpeningCheck {
  outletId: number;
  code: string;
  name: string;
  debit: number;
  credit: number;
  /** debit − credit; 0 when balanced. */
  difference: number;
}

/** Per active outlet: total opening debits vs credits. */
export async function getOpeningBalanceCheck(): Promise<OutletOpeningCheck[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT o.id, o.code, o.name,
            COALESCE(SUM(CASE WHEN b.amount > 0 THEN b.amount END), 0) AS debit,
            COALESCE(SUM(CASE WHEN b.amount < 0 THEN -b.amount END), 0) AS credit
     FROM outlets o
     LEFT JOIN account_opening_balances b ON b.outlet_id = o.id
     WHERE o.status = 'ACTIVE'
     GROUP BY o.id
     ORDER BY o.code`,
  );
  return rows.map((r) => {
    const debit = Number(r.debit);
    const credit = Number(r.credit);
    return {
      outletId: Number(r.id),
      code: String(r.code),
      name: String(r.name),
      debit,
      credit,
      difference: Math.round((debit - credit) * 100) / 100,
    };
  });
}

/** Dr-signed opening balance per account, summed over the given outlets. */
export async function getOpeningBalanceSums(outletIds: number[]): Promise<Map<number, number>> {
  if (!outletIds.length) return new Map();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT account_id AS accountId, SUM(amount) AS amount
     FROM account_opening_balances WHERE outlet_id IN (?) GROUP BY account_id`,
    [outletIds],
  );
  return new Map(rows.map((r) => [Number(r.accountId), Number(r.amount)]));
}
