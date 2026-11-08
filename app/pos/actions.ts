"use server";

import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { hasOutletAccess, requireRole } from "@/lib/auth-guard";
import {
  getDiningTables,
  getHeldOrders,
  getOrderDetail,
  getPosCatalog,
  PRICING_CHANNELS,
  type CatalogProduct,
  type DiningTableOption,
  type HeldOrderSummary,
  type OrderDetail,
} from "@/lib/pos";
import { pricingChannelFor } from "@/lib/pricing-channel";
import { nextOrderNo } from "@/lib/order-no";
import { nextJournalNo } from "@/lib/journal-no";
import { findUserByEmail, findUserRoleCodes } from "@/lib/users";
import { getT } from "@/lib/i18n/server";
import { getOrLockStock, insertMovement, upsertStock } from "@/lib/inventory-mutations";
import { loadActiveRecipeLines, productsWithoutRecipe } from "@/lib/product-availability";
import type { PricingChannel } from "@/lib/pricing-channel";

const ALLOWED_ROLES = ["ADMIN", "GM", "MANAGER", "CASHIER"];
const MANAGER_ROLES = ["ADMIN", "GM", "MANAGER"];
// DINE_IN_QR isn't offered as a creation choice in the POS header (staff always pick
// Dine In/Take Away/Delivery) — it's included so resuming a customer-placed QR order
// (app/order/actions.ts) and re-submitting it (Hold/Pay) doesn't fail validation.
const CHANNELS = ["DINE_IN_STAFF", "DINE_IN_QR", "TAKEAWAY", "DELIVERY"] as const;
const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "QRIS", "CARD", "OTHER"] as const;

// PB1 (restaurant tax) and service charge are now flat outlet-wide rates applied
// to the gross (bruto) subtotal, replacing the old per-product outlet_products.tax_rate
// math. Discount is a fixed set of percentages rather than a free-typed Rupiah amount.
const PB1_RATE = 0.11;
const SERVICE_CHARGE_RATE = 0.035;
const DISCOUNT_PERCENT_OPTIONS = [0, 2, 5, 10];
const PB1_ACCOUNT_CODE = "2100.002"; // HUTANG PB1 — a real liability, not revenue.

export type OrderChannel = (typeof CHANNELS)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface CartItemInput {
  productId: number;
  qty: number;
}

export interface SubmitOrderInput {
  outletId: number;
  tableId: number | null;
  channel: OrderChannel;
  items: CartItemInput[];
  discountPercent: number;
  mode: "hold" | "pay";
  paymentMethod?: PaymentMethod;
  holdOrderId?: number;
}

export interface SubmitOrderResult {
  ok: true;
  order: OrderDetail;
}

export interface SubmitOrderError {
  ok: false;
  message: string;
}

/** Thrown inside the pay transaction when an ingredient can't cover the order. */
class InsufficientStockError extends Error {
  constructor(public readonly ingredients: string[]) {
    super("INSUFFICIENT_STOCK");
  }
}

interface ConsumptionResult {
  hppTotal: number;
  /** COGS per stock item's linked 5000.xxx account (null = item has no linked account). */
  hppByAccount: Map<number | null, number>;
}

/**
 * Deducts each sold product's recipe ingredients from inventory and freezes
 * the resulting cost onto order_items.hpp_total. A product with no active
 * recipe has no stock and is refused like any other shortfall.
 *
 * Stock may NOT go negative: every ingredient row is locked first (in id
 * order, so two tills can't deadlock), the whole order's requirement is
 * checked — two products sharing an ingredient are summed — and only then
 * is anything deducted. A shortfall throws InsufficientStockError, which
 * rolls back the entire payment.
 */
async function applyRecipeConsumption(
  conn: import("mysql2/promise").PoolConnection,
  outletId: number,
  orderId: number,
  lines: { orderItemId: number; productId: number; qty: number }[],
  createdBy: number,
): Promise<ConsumptionResult> {
  const productIds = Array.from(new Set(lines.map((l) => l.productId)));
  const recipeLines = await loadActiveRecipeLines(conn, outletId, productIds);

  // No active recipe = no stock (stock is fully system-controlled), so it can't be sold.
  const noRecipe = productsWithoutRecipe(recipeLines, productIds);
  if (noRecipe.length > 0) {
    const [rows] = await conn.query<import("mysql2").RowDataPacket[]>("SELECT name FROM products WHERE id IN (?)", [noRecipe]);
    throw new InsufficientStockError(rows.map((r) => String(r.name)));
  }

  const required = new Map<number, { name: string; accountId: number | null; qty: number }>();
  for (const line of lines) {
    for (const rl of recipeLines) {
      if (rl.productId !== line.productId || rl.perPortion <= 0) continue;
      const entry = required.get(rl.stockItemId) ?? {
        name: rl.stockItemName,
        accountId: rl.accountId,
        qty: 0,
      };
      entry.qty += rl.perPortion * line.qty;
      required.set(rl.stockItemId, entry);
    }
  }

  const stockItemIds = Array.from(required.keys()).sort((a, b) => a - b);
  const locked = new Map<number, { qtyOnHand: number; avgCost: number }>();
  const short: string[] = [];
  for (const stockItemId of stockItemIds) {
    const stock = await getOrLockStock(conn, outletId, stockItemId);
    const qtyOnHand = stock?.qtyOnHand ?? 0;
    locked.set(stockItemId, { qtyOnHand, avgCost: stock?.avgCost ?? 0 });
    if (qtyOnHand + 1e-9 < required.get(stockItemId)!.qty) short.push(required.get(stockItemId)!.name);
  }
  if (short.length > 0) throw new InsufficientStockError(short);

  const hppByAccount = new Map<number | null, number>();
  for (const stockItemId of stockItemIds) {
    const need = required.get(stockItemId)!;
    const { qtyOnHand, avgCost } = locked.get(stockItemId)!;
    await upsertStock(conn, outletId, stockItemId, qtyOnHand - need.qty, avgCost);
    await insertMovement(conn, {
      outletId,
      stockItemId,
      movementType: "SALE_OUT",
      qty: need.qty,
      unitCost: avgCost,
      referenceType: "ORDER",
      referenceId: orderId,
      createdBy,
    });
    hppByAccount.set(need.accountId, (hppByAccount.get(need.accountId) ?? 0) + need.qty * avgCost);
  }

  let hppTotal = 0;
  for (const line of lines) {
    let lineHpp = 0;
    for (const rl of recipeLines) {
      if (rl.productId !== line.productId || rl.perPortion <= 0) continue;
      lineHpp += rl.perPortion * line.qty * locked.get(rl.stockItemId)!.avgCost;
    }
    if (lineHpp > 0) {
      await conn.query("UPDATE order_items SET hpp_total = ? WHERE id = ?", [lineHpp, line.orderItemId]);
    }
    hppTotal += lineHpp;
  }

  return { hppTotal, hppByAccount };
}

// Chart of accounts codes from COA.pdf (database/18_new_coa_import.sql).
// Non-cash payment methods (BANK_TRANSFER/QRIS/CARD/OTHER) all post to the
// same default bank leaf (BRI) since orders don't record which specific bank
// account a transfer/QRIS payment landed in — a real limitation, not an
// oversight. COGS is itemized: each ingredient consumed debits its stock
// item's linked 5000.xxx account (falling back to the "5000 HPP" header for
// an item with no link), crediting 1200.001 Persediaan — the same account
// purchase journals debit, so the inventory ledger matches stock value.
const KAS_ACCOUNT_CODE = "1000.001";
const DEFAULT_BANK_ACCOUNT_CODE = "1000.002";
const PERSEDIAAN_ACCOUNT_CODE = "1200.001";
const PENJUALAN_ACCOUNT_CODE = "4000.001";
const HPP_ACCOUNT_CODE = "5000";

/**
 * Posts the PRD's two required journal entries for a paid sale: Dr Kas/Bank,
 * Cr Penjualan for the sale itself, and (only when a recipe consumed stock)
 * Dr HPP, Cr Persediaan for COGS. Silently does nothing if the
 * chart of accounts is missing an expected code — accounting posting failing
 * should never be the reason a paid sale can't complete.
 */
async function applySalePosting(
  conn: import("mysql2/promise").PoolConnection,
  outletId: number,
  orderId: number,
  grandTotal: number,
  pb1Tax: number,
  paymentMethod: PaymentMethod,
  consumption: ConsumptionResult,
  createdBy: number,
): Promise<void> {
  const [accountRows] = await conn.query<import("mysql2").RowDataPacket[]>(
    "SELECT id, code FROM accounts WHERE code IN (?, ?, ?, ?, ?, ?)",
    [
      KAS_ACCOUNT_CODE,
      DEFAULT_BANK_ACCOUNT_CODE,
      PERSEDIAAN_ACCOUNT_CODE,
      PENJUALAN_ACCOUNT_CODE,
      HPP_ACCOUNT_CODE,
      PB1_ACCOUNT_CODE,
    ],
  );
  const accountByCode = new Map(accountRows.map((r) => [String(r.code), Number(r.id)]));
  const kasId = accountByCode.get(KAS_ACCOUNT_CODE);
  const bankId = accountByCode.get(DEFAULT_BANK_ACCOUNT_CODE);
  const persediaanId = accountByCode.get(PERSEDIAAN_ACCOUNT_CODE);
  const penjualanId = accountByCode.get(PENJUALAN_ACCOUNT_CODE);
  const hppAccountId = accountByCode.get(HPP_ACCOUNT_CODE);
  const pb1AccountId = accountByCode.get(PB1_ACCOUNT_CODE);
  if (!kasId || !bankId || !penjualanId) return;

  const cashOrBankId = paymentMethod === "CASH" ? kasId : bankId;

  const saleJournalNo = await nextJournalNo(conn);
  const [saleResult] = await conn.query(
    `INSERT INTO journal_entries
       (journal_no, entry_date, outlet_id, source_type, source_id, memo, status, created_by)
     VALUES (?, CURDATE(), ?, 'ORDER_SALE', ?, ?, 'POSTED', ?)`,
    [saleJournalNo, outletId, orderId, `Sale revenue — order #${orderId}`, createdBy],
  );
  const saleJournalEntryId = (saleResult as { insertId: number }).insertId;
  await conn.query(
    "INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, 0)",
    [saleJournalEntryId, cashOrBankId, grandTotal],
  );
  // PB1 collected from the customer is a tax liability, not revenue — split it out
  // into its own credit line (2100.002 HUTANG PB1) when that account exists, rather
  // than inflating Penjualan with tax the business doesn't actually keep.
  if (pb1AccountId && pb1Tax > 0) {
    await conn.query(
      "INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, 0, ?)",
      [saleJournalEntryId, pb1AccountId, pb1Tax],
    );
    await conn.query(
      "INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, 0, ?)",
      [saleJournalEntryId, penjualanId, grandTotal - pb1Tax],
    );
  } else {
    await conn.query(
      "INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, 0, ?)",
      [saleJournalEntryId, penjualanId, grandTotal],
    );
  }

  const hppTotal = Math.round(consumption.hppTotal * 100) / 100;
  if (hppTotal > 0 && persediaanId && hppAccountId) {
    const cogsJournalNo = await nextJournalNo(conn);
    const [cogsResult] = await conn.query(
      `INSERT INTO journal_entries
         (journal_no, entry_date, outlet_id, source_type, source_id, memo, status, created_by)
       VALUES (?, CURDATE(), ?, 'ORDER_COGS', ?, ?, 'POSTED', ?)`,
      [cogsJournalNo, outletId, orderId, `COGS — order #${orderId}`, createdBy],
    );
    const cogsJournalEntryId = (cogsResult as { insertId: number }).insertId;

    // One debit per ingredient account, rounded to cents; the last one absorbs
    // the rounding remainder so the entry balances against the single credit.
    const debits = Array.from(consumption.hppByAccount.entries())
      .map(([accountId, amount]) => ({
        accountId: accountId ?? hppAccountId,
        amount: Math.round(amount * 100) / 100,
      }))
      .filter((d) => d.amount > 0);
    const roundingGap = hppTotal - debits.reduce((sum, d) => sum + d.amount, 0);
    if (debits.length > 0) debits[debits.length - 1].amount += roundingGap;

    for (const debit of debits) {
      await conn.query(
        "INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, 0)",
        [cogsJournalEntryId, debit.accountId, debit.amount.toFixed(2)],
      );
    }
    await conn.query(
      "INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, 0, ?)",
      [cogsJournalEntryId, persediaanId, hppTotal.toFixed(2)],
    );
  }
}

export async function submitOrder(
  input: SubmitOrderInput,
): Promise<SubmitOrderResult | SubmitOrderError> {
  const session = await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  if (!(await hasOutletAccess(session, input.outletId))) {
    return { ok: false, message: t("pos.errNoOutletAccess") };
  }

  if (!input.items.length) {
    return { ok: false, message: t("pos.errCartEmpty") };
  }
  if (!CHANNELS.includes(input.channel)) {
    return { ok: false, message: t("pos.errInvalidChannel") };
  }
  if (input.mode === "pay" && !input.paymentMethod) {
    return { ok: false, message: t("pos.errPaymentMethodRequired") };
  }
  if (input.paymentMethod && !PAYMENT_METHODS.includes(input.paymentMethod)) {
    return { ok: false, message: t("pos.errInvalidPaymentMethod") };
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [productRows] = await conn.query<import("mysql2").RowDataPacket[]>(
      `SELECT op.product_id, op.selling_price
       FROM outlet_products op
       WHERE op.outlet_id = ? AND op.channel = ? AND op.is_available = 1
         AND op.product_id IN (${input.items.map(() => "?").join(",") || "NULL"})`,
      [input.outletId, pricingChannelFor(input.channel), ...input.items.map((i) => i.productId)],
    );
    const priceMap = new Map(productRows.map((r) => [Number(r.product_id), Number(r.selling_price)]));

    let subtotal = 0;
    const lines: { productId: number; qty: number; unitPrice: number; lineTotal: number }[] = [];

    for (const item of input.items) {
      const price = priceMap.get(item.productId);
      if (price == null || item.qty <= 0) {
        await conn.rollback();
        return { ok: false, message: t("pos.errItemsUnavailable") };
      }
      const lineTotal = price * item.qty;
      subtotal += lineTotal;
      lines.push({
        productId: item.productId,
        qty: item.qty,
        unitPrice: price,
        lineTotal,
      });
    }

    const discountPercent = DISCOUNT_PERCENT_OPTIONS.includes(input.discountPercent)
      ? input.discountPercent
      : 0;
    const discountTotal = subtotal * (discountPercent / 100);
    const taxTotal = subtotal * PB1_RATE;
    const serviceChargeTotal = subtotal * SERVICE_CHARGE_RATE;
    const grandTotal = subtotal - discountTotal + serviceChargeTotal + taxTotal;
    const status = input.mode === "pay" ? "PAID" : "OPEN";
    const closedAt = input.mode === "pay" ? new Date() : null;

    let orderId: number;

    if (input.holdOrderId) {
      const [updateResult] = await conn.query<import("mysql2").ResultSetHeader>(
        `UPDATE orders SET table_id = ?, order_channel = ?, subtotal = ?, discount_total = ?,
                discount_percent = ?, tax_total = ?, service_charge_total = ?, grand_total = ?,
                status = ?, closed_at = ?
         WHERE id = ? AND outlet_id = ? AND status = 'OPEN'`,
        [
          input.tableId,
          input.channel,
          subtotal,
          discountTotal,
          discountPercent,
          taxTotal,
          serviceChargeTotal,
          grandTotal,
          status,
          closedAt,
          input.holdOrderId,
          input.outletId,
        ],
      );
      if (updateResult.affectedRows === 0) {
        await conn.rollback();
        return { ok: false, message: t("pos.errHeldOrderUnavailable") };
      }
      await conn.query("DELETE FROM order_items WHERE order_id = ?", [input.holdOrderId]);
      orderId = input.holdOrderId;
    } else {
      const orderNo = await nextOrderNo(conn, input.outletId);
      const [result] = await conn.query<import("mysql2").ResultSetHeader>(
        `INSERT INTO orders
           (order_no, outlet_id, table_id, order_channel, status, subtotal, discount_total,
            discount_percent, tax_total, service_charge_total, grand_total, ordered_at, closed_at, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
        [
          orderNo,
          input.outletId,
          input.tableId,
          input.channel,
          status,
          subtotal,
          discountTotal,
          discountPercent,
          taxTotal,
          serviceChargeTotal,
          grandTotal,
          closedAt,
          Number(session.user.id),
        ],
      );
      orderId = result.insertId;
    }

    const insertedLines: { orderItemId: number; productId: number; qty: number }[] = [];
    for (const line of lines) {
      const [itemResult] = await conn.query<import("mysql2").ResultSetHeader>(
        `INSERT INTO order_items (order_id, product_id, qty, unit_price, discount, line_total)
         VALUES (?, ?, ?, ?, 0, ?)`,
        [orderId, line.productId, line.qty, line.unitPrice, line.lineTotal],
      );
      insertedLines.push({ orderItemId: itemResult.insertId, productId: line.productId, qty: line.qty });
    }

    if (status === "PAID" && input.paymentMethod) {
      let consumption: ConsumptionResult;
      try {
        consumption = await applyRecipeConsumption(
          conn,
          input.outletId,
          orderId,
          insertedLines,
          Number(session.user.id),
        );
      } catch (error) {
        if (error instanceof InsufficientStockError) {
          await conn.rollback();
          return {
            ok: false,
            message: t("pos.errInsufficientStock", { items: error.ingredients.join(", ") }),
          };
        }
        throw error;
      }
      await applySalePosting(
        conn,
        input.outletId,
        orderId,
        grandTotal,
        taxTotal,
        input.paymentMethod,
        consumption,
        Number(session.user.id),
      );
    }

    if (input.mode === "pay" && input.paymentMethod) {
      await conn.query(
        `INSERT INTO payments (order_id, method, amount, status, paid_at)
         VALUES (?, ?, ?, 'SUCCESS', NOW())`,
        [orderId, input.paymentMethod, grandTotal],
      );
    }

    if (input.channel === "DINE_IN_STAFF" && input.tableId) {
      await conn.query(
        "UPDATE dining_tables SET status = 'OCCUPIED' WHERE id = ? AND status = 'AVAILABLE'",
        [input.tableId],
      );
    }

    await conn.commit();

    const order = await getOrderDetail(orderId);
    if (!order) return { ok: false, message: t("pos.errOrderSavedNotReloaded") };
    return { ok: true, order };
  } catch (error) {
    await conn.rollback();
    console.error("submitOrder failed", error);
    return { ok: false, message: t("pos.errCouldNotSaveOrder") };
  } finally {
    conn.release();
  }
}

export interface VoidOrderInput {
  outletId: number;
  // Omitted when discarding a cart that was never saved/held as a real order —
  // there's nothing in `orders` to update, but the void is still logged.
  orderId?: number;
  reason: string;
  managerEmail: string;
  managerPassword: string;
}

/**
 * Every void — clearing the current in-progress cart or cancelling a held
 * order — requires a reason and a live re-authentication of an
 * ADMIN/GM/MANAGER account (their own email + password, checked the same way
 * sign-in does), not just the cashier's own session. This is a real control,
 * not decoration: a CASHIER-only session can never self-approve a void.
 */
export async function voidOrder(
  input: VoidOrderInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  if (!(await hasOutletAccess(session, input.outletId))) {
    return { ok: false, message: t("pos.errNoOutletAccess") };
  }

  const reason = input.reason.trim();
  if (!reason) {
    return { ok: false, message: t("pos.errVoidReasonRequired") };
  }

  const manager = await findUserByEmail(input.managerEmail.trim().toLowerCase());
  if (!manager || !manager.password_hash || manager.status !== "ACTIVE") {
    return { ok: false, message: t("pos.errInvalidManagerCredentials") };
  }
  const passwordMatches = await bcrypt.compare(input.managerPassword, manager.password_hash);
  if (!passwordMatches) {
    return { ok: false, message: t("pos.errInvalidManagerCredentials") };
  }
  const managerRoles = await findUserRoleCodes(manager.id);
  if (!managerRoles.some((role) => MANAGER_ROLES.includes(role))) {
    return { ok: false, message: t("pos.errManagerRoleRequired") };
  }

  if (input.orderId) {
    const [result] = await pool.query<import("mysql2").ResultSetHeader>(
      `UPDATE orders SET status = 'VOIDED', void_reason = ?, voided_by = ?,
              void_authorized_by = ?, voided_at = NOW()
       WHERE id = ? AND outlet_id = ? AND status = 'OPEN'`,
      [reason, Number(session.user.id), manager.id, input.orderId, input.outletId],
    );
    if (result.affectedRows === 0) {
      return { ok: false, message: t("pos.errHeldOrderUnavailable") };
    }
    await pool.query(
      `UPDATE dining_tables dt JOIN orders o ON o.table_id = dt.id
       SET dt.status = 'AVAILABLE' WHERE o.id = ? AND dt.status = 'OCCUPIED'`,
      [input.orderId],
    );
  }

  await pool.query(
    `INSERT INTO audit_logs (user_id, outlet_id, action, entity_type, entity_id, after_json)
     VALUES (?, ?, 'VOID_ORDER', 'order', ?, ?)`,
    [
      Number(session.user.id),
      input.outletId,
      input.orderId ?? null,
      JSON.stringify({ reason, authorizedBy: manager.id, authorizedByEmail: manager.email }),
    ],
  );

  return { ok: true };
}

export async function loadHeldOrder(orderId: number): Promise<OrderDetail | null> {
  const session = await requireRole(ALLOWED_ROLES);
  const order = await getOrderDetail(orderId);
  if (!order) return null;
  if (!(await hasOutletAccess(session, order.outletId))) return null;
  return order;
}

export async function refreshHeldOrders(outletId: number): Promise<HeldOrderSummary[]> {
  const session = await requireRole(ALLOWED_ROLES);
  if (!(await hasOutletAccess(session, outletId))) return [];
  return getHeldOrders(outletId);
}

export async function refreshTables(outletId: number): Promise<DiningTableOption[] | null> {
  const session = await requireRole(ALLOWED_ROLES);
  if (!(await hasOutletAccess(session, outletId))) return null;
  return getDiningTables(outletId);
}

/**
 * "Kosongkan meja": the cashier frees an occupied Dine In table once the guests
 * have left. Refused while the table still has an open (held / QR) order — that
 * order must be paid or voided first, so a table is never freed under a running bill.
 */
export async function releaseTable(
  outletId: number,
  tableId: number,
): Promise<{ ok: true; tables: DiningTableOption[] } | { ok: false; message: string }> {
  const session = await requireRole(ALLOWED_ROLES);
  const { t } = await getT();
  if (!(await hasOutletAccess(session, outletId))) {
    return { ok: false, message: t("pos.errNoOutletAccess") };
  }

  const [open] = await pool.query<import("mysql2").RowDataPacket[]>(
    "SELECT order_no FROM orders WHERE table_id = ? AND outlet_id = ? AND status = 'OPEN' LIMIT 1",
    [tableId, outletId],
  );
  if (open.length > 0) {
    return { ok: false, message: t("pos.errTableHasOpenOrder", { orderNo: String(open[0].order_no) }) };
  }

  const [result] = await pool.query<import("mysql2").ResultSetHeader>(
    "UPDATE dining_tables SET status = 'AVAILABLE' WHERE id = ? AND outlet_id = ? AND status = 'OCCUPIED'",
    [tableId, outletId],
  );
  if (result.affectedRows > 0) {
    await pool.query(
      `INSERT INTO audit_logs (user_id, outlet_id, action, entity_type, entity_id)
       VALUES (?, ?, 'RELEASE_TABLE', 'dining_table', ?)`,
      [Number(session.user.id), outletId, tableId],
    );
  }
  return { ok: true, tables: await getDiningTables(outletId) };
}

/** Re-reads the outlet's catalog so stock badges (Low / Out) reflect the latest sales and purchases. */
export async function refreshCatalog(
  outletId: number,
): Promise<Record<PricingChannel, CatalogProduct[]> | null> {
  const session = await requireRole(ALLOWED_ROLES);
  if (!(await hasOutletAccess(session, outletId))) return null;
  const catalogs = await Promise.all(PRICING_CHANNELS.map((channel) => getPosCatalog(outletId, channel)));
  return Object.fromEntries(PRICING_CHANNELS.map((channel, i) => [channel, catalogs[i]])) as Record<
    PricingChannel,
    CatalogProduct[]
  >;
}
