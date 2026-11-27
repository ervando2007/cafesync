"use server";

import { randomBytes } from "crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import pool from "@/lib/db";
import { auth } from "@/auth";
import { nextOrderNo } from "@/lib/order-no";
import { pricingChannelFor } from "@/lib/pricing-channel";
import { getT } from "@/lib/i18n/server";
import { findShortIngredients } from "@/lib/product-availability";
import { clientIp, hit } from "@/lib/rate-limit";

export type CustomerOrderType = "DINE_IN_QR" | "TAKEAWAY";

export interface PlaceOrderItemInput {
  productId: number;
  qty: number;
  notes?: string;
}

export type PlaceOrderInput =
  | {
      outletId: number;
      orderType: "DINE_IN_QR";
      tableId: number;
      items: PlaceOrderItemInput[];
    }
  | {
      outletId: number;
      orderType: "TAKEAWAY";
      guestName: string;
      items: PlaceOrderItemInput[];
    };

export interface PlaceOrderResult {
  ok: true;
  orderNo: string;
  /** Secret for /order/track/<token>; the order number itself is guessable. */
  trackingToken: string;
}

const MAX_LINES = 50;
const MAX_QTY = 99;
const MAX_NOTES = 255;
const MAX_GUEST_NAME = 150;
/** Public, unauthenticated checkout: orders per client IP per window. */
const ORDER_LIMIT = 10;
const ORDER_WINDOW_SECONDS = 10 * 60;

const isId = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0;

export interface PlaceOrderError {
  ok: false;
  message: string;
}

export async function placeOrder(
  input: PlaceOrderInput,
): Promise<PlaceOrderResult | PlaceOrderError> {
  const { t } = await getT();
  if (!Array.isArray(input.items) || !input.items.length) {
    return { ok: false, message: t("order.cartEmpty") };
  }
  if (
    !isId(input.outletId) ||
    (input.orderType !== "DINE_IN_QR" && input.orderType !== "TAKEAWAY") ||
    (input.orderType === "DINE_IN_QR" && !isId(input.tableId)) ||
    input.items.length > MAX_LINES ||
    input.items.some(
      (item) =>
        !isId(item?.productId) ||
        !Number.isInteger(item.qty) ||
        item.qty < 1 ||
        item.qty > MAX_QTY ||
        (item.notes != null && (typeof item.notes !== "string" || item.notes.length > MAX_NOTES)),
    )
  ) {
    return { ok: false, message: t("order.errItemsNoLongerAvailable") };
  }

  const guestName =
    input.orderType === "TAKEAWAY" && typeof input.guestName === "string" ? input.guestName.trim() : null;
  if (input.orderType === "TAKEAWAY" && !guestName) {
    return { ok: false, message: t("order.enterYourName") };
  }
  if (guestName && guestName.length > MAX_GUEST_NAME) {
    return { ok: false, message: t("order.enterYourName") };
  }

  if (!hit(`order:${await clientIp()}`, ORDER_LIMIT, ORDER_WINDOW_SECONDS)) {
    return { ok: false, message: t("common.tooManyAttempts") };
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [outletRows] = await conn.query<RowDataPacket[]>(
      "SELECT id FROM outlets WHERE id = ? AND status = 'ACTIVE' LIMIT 1",
      [input.outletId],
    );
    if (!outletRows.length) {
      await conn.rollback();
      return { ok: false, message: t("order.errOutletNotAvailable") };
    }

    let tableId: number | null = null;
    if (input.orderType === "DINE_IN_QR") {
      const [tableRows] = await conn.query<RowDataPacket[]>(
        "SELECT id, status FROM dining_tables WHERE id = ? AND outlet_id = ? LIMIT 1",
        [input.tableId, input.outletId],
      );
      if (!tableRows.length || tableRows[0].status === "INACTIVE") {
        await conn.rollback();
        return { ok: false, message: t("order.errSelectValidTable") };
      }
      tableId = input.tableId;
    }

    const [productRows] = await conn.query<RowDataPacket[]>(
      `SELECT op.product_id, op.selling_price, op.tax_rate
       FROM outlet_products op
       WHERE op.outlet_id = ? AND op.channel = ? AND op.is_available = 1
         AND op.product_id IN (${input.items.map(() => "?").join(",") || "NULL"})`,
      [input.outletId, pricingChannelFor(input.orderType), ...input.items.map((i) => i.productId)],
    );
    const priceMap = new Map(
      productRows.map((r) => [
        Number(r.product_id),
        { price: Number(r.selling_price), taxRate: Number(r.tax_rate) },
      ]),
    );

    let subtotal = 0;
    let taxTotal = 0;
    const lines: {
      productId: number;
      qty: number;
      unitPrice: number;
      lineTotal: number;
      notes: string | null;
    }[] = [];

    for (const item of input.items) {
      const priced = priceMap.get(item.productId);
      if (!priced || item.qty <= 0) {
        await conn.rollback();
        return { ok: false, message: t("order.errItemsNoLongerAvailable") };
      }
      const lineTotal = priced.price * item.qty;
      subtotal += lineTotal;
      taxTotal += lineTotal * priced.taxRate;
      lines.push({
        productId: item.productId,
        qty: item.qty,
        unitPrice: priced.price,
        lineTotal,
        notes: item.notes?.trim() || null,
      });
    }

    const blocked = await findShortIngredients(conn, input.outletId, lines);
    if (blocked.ingredients.length > 0 || blocked.noRecipeProductIds.length > 0) {
      await conn.rollback();
      return { ok: false, message: t("order.errItemsOutOfStock") };
    }

    const grandTotal = subtotal + taxTotal;
    const session = await auth();
    const customerId =
      session?.user && session.user.roles.includes("CUSTOMER") ? Number(session.user.id) : null;

    const orderNo = await nextOrderNo(conn, input.outletId);
    const trackingToken = randomBytes(16).toString("hex");
    const [result] = await conn.query<ResultSetHeader>(
      `INSERT INTO orders
         (order_no, tracking_token, outlet_id, customer_id, guest_name, table_id, order_channel, status,
          subtotal, discount_total, tax_total, grand_total, ordered_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, 0, ?, ?, NOW(), NULL)`,
      [
        orderNo,
        trackingToken,
        input.outletId,
        customerId,
        guestName,
        tableId,
        input.orderType,
        subtotal,
        taxTotal,
        grandTotal,
      ],
    );
    const orderId = result.insertId;

    for (const line of lines) {
      await conn.query(
        `INSERT INTO order_items (order_id, product_id, qty, unit_price, discount, line_total, notes)
         VALUES (?, ?, ?, ?, 0, ?, ?)`,
        [orderId, line.productId, line.qty, line.unitPrice, line.lineTotal, line.notes],
      );
    }

    if (tableId) {
      await conn.query(
        "UPDATE dining_tables SET status = 'OCCUPIED' WHERE id = ? AND status = 'AVAILABLE'",
        [tableId],
      );
    }

    await conn.commit();
    return { ok: true, orderNo, trackingToken };
  } catch (error) {
    await conn.rollback();
    console.error("placeOrder failed", error);
    return { ok: false, message: t("order.errCouldNotPlaceOrder") };
  } finally {
    conn.release();
  }
}
