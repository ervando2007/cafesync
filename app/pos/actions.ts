"use server";

import pool from "@/lib/db";
import { hasOutletAccess, requireRole } from "@/lib/auth-guard";
import { getHeldOrders, getOrderDetail, type HeldOrderSummary, type OrderDetail } from "@/lib/pos";
import { nextOrderNo } from "@/lib/order-no";
import { nextJournalNo } from "@/lib/journal-no";
import { getT } from "@/lib/i18n/server";

const ALLOWED_ROLES = ["ADMIN", "GM", "MANAGER", "CASHIER"];
// DINE_IN_QR isn't offered as a creation choice in the POS header (staff always pick
// Dine In/Take Away/Delivery) — it's included so resuming a customer-placed QR order
// (app/order/actions.ts) and re-submitting it (Save/Hold/Pay) doesn't fail validation.
const CHANNELS = ["DINE_IN_STAFF", "DINE_IN_QR", "TAKEAWAY", "DELIVERY"] as const;
const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "QRIS", "CARD", "OTHER"] as const;

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
  discountTotal: number;
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

/**
 * Deducts each sold product's recipe ingredients from inventory and freezes
 * the resulting cost onto order_items.hpp_total. Products with no active
 * recipe configured are skipped (hpp_total stays 0) — not every sellable
 * item needs a recipe (e.g. merchandise). Stock is allowed to go negative
 * here: blocking a paid sale over an inventory data gap would be worse than
 * a reconciliation discrepancy an ADMIN/MANAGER can fix via Adjustments.
 */
async function applyRecipeConsumption(
  conn: import("mysql2/promise").PoolConnection,
  outletId: number,
  orderId: number,
  lines: { productId: number; qty: number }[],
  createdBy: number,
): Promise<number> {
  let orderHppTotal = 0;

  for (const line of lines) {
    const [recipeRows] = await conn.query<import("mysql2").RowDataPacket[]>(
      "SELECT id, yield_qty FROM recipes WHERE outlet_id = ? AND product_id = ? AND is_active = 1 LIMIT 1",
      [outletId, line.productId],
    );
    const recipe = recipeRows[0];
    if (!recipe) continue;

    const recipeId = Number(recipe.id);
    const yieldQty = Number(recipe.yield_qty) || 1;

    const [itemRows] = await conn.query<import("mysql2").RowDataPacket[]>(
      "SELECT stock_item_id, qty FROM recipe_items WHERE recipe_id = ?",
      [recipeId],
    );

    let hppTotal = 0;
    for (const ingredient of itemRows) {
      const stockItemId = Number(ingredient.stock_item_id);
      const requiredQty = (Number(ingredient.qty) * line.qty) / yieldQty;

      const [stockRows] = await conn.query<import("mysql2").RowDataPacket[]>(
        "SELECT qty_on_hand, avg_cost FROM inventory_stocks WHERE outlet_id = ? AND stock_item_id = ? FOR UPDATE",
        [outletId, stockItemId],
      );
      const current = stockRows[0];
      const avgCost = current ? Number(current.avg_cost) : 0;
      const newQty = (current ? Number(current.qty_on_hand) : 0) - requiredQty;

      await conn.query(
        `INSERT INTO inventory_stocks (outlet_id, stock_item_id, qty_on_hand, avg_cost)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE qty_on_hand = VALUES(qty_on_hand)`,
        [outletId, stockItemId, newQty, avgCost],
      );

      await conn.query(
        `INSERT INTO inventory_movements
           (outlet_id, stock_item_id, movement_type, qty, unit_cost, reference_type, created_by)
         VALUES (?, ?, 'SALE_OUT', ?, ?, ?, ?)`,
        [outletId, stockItemId, requiredQty, avgCost, `ORDER:${orderId}`, createdBy],
      );

      hppTotal += requiredQty * avgCost;
    }

    await conn.query("UPDATE order_items SET hpp_total = ? WHERE order_id = ? AND product_id = ?", [
      hppTotal,
      orderId,
      line.productId,
    ]);
    orderHppTotal += hppTotal;
  }

  return orderHppTotal;
}

/**
 * Posts the PRD's two required journal entries for a paid sale: Dr Kas/Bank,
 * Cr Penjualan for the sale itself, and (only when a recipe consumed stock)
 * Dr Beban Bahan Baku, Cr Persediaan for COGS. Silently does nothing if the
 * chart of accounts is missing an expected code — accounting posting failing
 * should never be the reason a paid sale can't complete.
 */
async function applySalePosting(
  conn: import("mysql2/promise").PoolConnection,
  outletId: number,
  orderId: number,
  grandTotal: number,
  paymentMethod: PaymentMethod,
  hppTotal: number,
  createdBy: number,
): Promise<void> {
  const [accountRows] = await conn.query<import("mysql2").RowDataPacket[]>(
    "SELECT id, code FROM accounts WHERE code IN ('1100', '1110', '1200', '4100', '5100')",
  );
  const accountByCode = new Map(accountRows.map((r) => [String(r.code), Number(r.id)]));
  const kasId = accountByCode.get("1100");
  const bankId = accountByCode.get("1110");
  const persediaanId = accountByCode.get("1200");
  const penjualanId = accountByCode.get("4100");
  const bebanBahanBakuId = accountByCode.get("5100");
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
  await conn.query(
    "INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, 0, ?)",
    [saleJournalEntryId, penjualanId, grandTotal],
  );

  if (hppTotal > 0 && persediaanId && bebanBahanBakuId) {
    const cogsJournalNo = await nextJournalNo(conn);
    const [cogsResult] = await conn.query(
      `INSERT INTO journal_entries
         (journal_no, entry_date, outlet_id, source_type, source_id, memo, status, created_by)
       VALUES (?, CURDATE(), ?, 'ORDER_COGS', ?, ?, 'POSTED', ?)`,
      [cogsJournalNo, outletId, orderId, `COGS — order #${orderId}`, createdBy],
    );
    const cogsJournalEntryId = (cogsResult as { insertId: number }).insertId;
    await conn.query(
      "INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, 0)",
      [cogsJournalEntryId, bebanBahanBakuId, hppTotal],
    );
    await conn.query(
      "INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, 0, ?)",
      [cogsJournalEntryId, persediaanId, hppTotal],
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
      `SELECT op.product_id, op.selling_price, op.tax_rate
       FROM outlet_products op
       WHERE op.outlet_id = ? AND op.is_available = 1
         AND op.product_id IN (${input.items.map(() => "?").join(",") || "NULL"})`,
      [input.outletId, ...input.items.map((i) => i.productId)],
    );
    const priceMap = new Map(
      productRows.map((r) => [
        Number(r.product_id),
        { price: Number(r.selling_price), taxRate: Number(r.tax_rate) },
      ]),
    );

    let subtotal = 0;
    let taxTotal = 0;
    const lines: { productId: number; qty: number; unitPrice: number; lineTotal: number }[] = [];

    for (const item of input.items) {
      const priced = priceMap.get(item.productId);
      if (!priced || item.qty <= 0) {
        await conn.rollback();
        return { ok: false, message: t("pos.errItemsUnavailable") };
      }
      const lineTotal = priced.price * item.qty;
      subtotal += lineTotal;
      taxTotal += lineTotal * priced.taxRate;
      lines.push({
        productId: item.productId,
        qty: item.qty,
        unitPrice: priced.price,
        lineTotal,
      });
    }

    const discountTotal = Math.max(0, Math.min(input.discountTotal, subtotal));
    const grandTotal = subtotal - discountTotal + taxTotal;
    const status = input.mode === "pay" ? "PAID" : "OPEN";
    const closedAt = input.mode === "pay" ? new Date() : null;

    let orderId: number;

    if (input.holdOrderId) {
      const [updateResult] = await conn.query<import("mysql2").ResultSetHeader>(
        `UPDATE orders SET table_id = ?, order_channel = ?, subtotal = ?, discount_total = ?,
                tax_total = ?, grand_total = ?, status = ?, closed_at = ?
         WHERE id = ? AND outlet_id = ? AND status = 'OPEN'`,
        [
          input.tableId,
          input.channel,
          subtotal,
          discountTotal,
          taxTotal,
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
            tax_total, grand_total, ordered_at, closed_at, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
        [
          orderNo,
          input.outletId,
          input.tableId,
          input.channel,
          status,
          subtotal,
          discountTotal,
          taxTotal,
          grandTotal,
          closedAt,
          Number(session.user.id),
        ],
      );
      orderId = result.insertId;
    }

    for (const line of lines) {
      await conn.query(
        `INSERT INTO order_items (order_id, product_id, qty, unit_price, discount, line_total)
         VALUES (?, ?, ?, ?, 0, ?)`,
        [orderId, line.productId, line.qty, line.unitPrice, line.lineTotal],
      );
    }

    if (status === "PAID" && input.paymentMethod) {
      const hppTotal = await applyRecipeConsumption(
        conn,
        input.outletId,
        orderId,
        lines,
        Number(session.user.id),
      );
      await applySalePosting(
        conn,
        input.outletId,
        orderId,
        grandTotal,
        input.paymentMethod,
        hppTotal,
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

export async function cancelHeldOrder(orderId: number, outletId: number): Promise<{ ok: boolean }> {
  const session = await requireRole(ALLOWED_ROLES);
  if (!(await hasOutletAccess(session, outletId))) return { ok: false };

  const [result] = await pool.query<import("mysql2").ResultSetHeader>(
    "UPDATE orders SET status = 'CANCELLED' WHERE id = ? AND outlet_id = ? AND status = 'OPEN'",
    [orderId, outletId],
  );
  return { ok: result.affectedRows > 0 };
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
