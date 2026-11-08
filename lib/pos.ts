import "server-only";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import type { Session } from "next-auth";
import {
  getProductAvailability,
  NO_RECIPE_AVAILABILITY,
  type ProductStockStatus,
} from "@/lib/product-availability";

export { PRICING_CHANNELS, pricingChannelFor, type PricingChannel } from "@/lib/pricing-channel";

export interface OutletOption {
  id: number;
  code: string;
  name: string;
}

export async function getOutletsForUser(session: Session): Promise<OutletOption[]> {
  const isGlobal = session.user.roles.some((r) => r === "ADMIN" || r === "GM");

  if (isGlobal) {
    const [rows] = await pool.query<(OutletOption & RowDataPacket)[]>(
      "SELECT id, code, name FROM outlets WHERE status = 'ACTIVE' ORDER BY name",
    );
    return rows;
  }

  const [rows] = await pool.query<(OutletOption & RowDataPacket)[]>(
    `SELECT o.id, o.code, o.name FROM outlets o
     JOIN user_outlets uo ON uo.outlet_id = o.id
     WHERE uo.user_id = ? AND o.status = 'ACTIVE'
     ORDER BY uo.is_default DESC, o.name`,
    [session.user.id],
  );
  return rows;
}

export interface CatalogProduct {
  productId: number;
  name: string;
  categoryName: string;
  productType: string;
  imageUrl: string | null;
  sellingPrice: number;
  taxRate: number;
  stockStatus: ProductStockStatus;
  /** Whole portions current stock can make; null when the product has no recipe. */
  portionsLeft: number | null;
  /** Ingredients causing a LOW / OUT status. */
  stockIngredients: string[];
  /** OUT because the product has no active recipe at this outlet. */
  noRecipe: boolean;
}

export async function getPosCatalog(outletId: number, channel: string): Promise<CatalogProduct[]> {
  const [[rows], availability] = await Promise.all([
    pool.query<RowDataPacket[]>(
      `SELECT p.id AS productId, p.name, c.name AS categoryName, p.product_type AS productType,
              p.image_url AS imageUrl, op.selling_price AS sellingPrice, op.tax_rate AS taxRate
       FROM outlet_products op
       JOIN products p ON p.id = op.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE op.outlet_id = ? AND op.channel = ? AND op.is_available = 1 AND p.status = 'ACTIVE'
       ORDER BY c.name, p.name`,
      [outletId, channel],
    ),
    getProductAvailability(outletId),
  ]);
  return rows.map((r) => {
    const stock = availability.get(Number(r.productId)) ?? NO_RECIPE_AVAILABILITY;
    return {
      productId: Number(r.productId),
      name: String(r.name),
      categoryName: String(r.categoryName ?? ""),
      productType: String(r.productType),
      imageUrl: r.imageUrl === null ? null : String(r.imageUrl),
      sellingPrice: Number(r.sellingPrice),
      taxRate: Number(r.taxRate),
      stockStatus: stock.status,
      portionsLeft: stock.portionsLeft,
      stockIngredients: stock.ingredients,
      noRecipe: stock.noRecipe,
    };
  });
}

export interface DiningTableOption {
  id: number;
  code: string;
  name: string;
  status: string;
}

export async function getDiningTables(outletId: number): Promise<DiningTableOption[]> {
  const [rows] = await pool.query<(DiningTableOption & RowDataPacket)[]>(
    "SELECT id, code, name, status FROM dining_tables WHERE outlet_id = ? ORDER BY code",
    [outletId],
  );
  return rows;
}

export interface HeldOrderSummary {
  id: number;
  orderNo: string;
  channel: string;
  tableName: string | null;
  guestName: string | null;
  itemCount: number;
  grandTotal: number;
  orderedAt: string;
}

export async function getHeldOrders(outletId: number): Promise<HeldOrderSummary[]> {
  const [rows] = await pool.query<(HeldOrderSummary & RowDataPacket)[]>(
    `SELECT o.id, o.order_no AS orderNo, o.order_channel AS channel,
            t.name AS tableName, o.guest_name AS guestName,
            o.grand_total AS grandTotal, o.ordered_at AS orderedAt,
            (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS itemCount
     FROM orders o
     LEFT JOIN dining_tables t ON t.id = o.table_id
     WHERE o.outlet_id = ? AND o.status = 'OPEN'
     ORDER BY o.ordered_at DESC`,
    [outletId],
  );
  return rows.map((r) => ({ ...r, grandTotal: Number(r.grandTotal) }));
}

export interface OrderItemDetail {
  productId: number;
  name: string;
  qty: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
}

export interface OrderDetail {
  id: number;
  orderNo: string;
  outletId: number;
  tableId: number | null;
  guestName: string | null;
  channel: string;
  status: string;
  subtotal: number;
  discountTotal: number;
  discountPercent: number | null;
  taxTotal: number;
  serviceChargeTotal: number;
  grandTotal: number;
  items: OrderItemDetail[];
}

export async function getOrderDetail(orderId: number): Promise<OrderDetail | null> {
  const [orderRows] = await pool.query<(RowDataPacket & Record<string, unknown>)[]>(
    `SELECT id, order_no, outlet_id, table_id, guest_name, order_channel, status,
            subtotal, discount_total, discount_percent, tax_total, service_charge_total, grand_total
     FROM orders WHERE id = ? LIMIT 1`,
    [orderId],
  );
  const order = orderRows[0];
  if (!order) return null;

  const [itemRows] = await pool.query<(RowDataPacket & Record<string, unknown>)[]>(
    `SELECT oi.product_id, p.name, oi.qty, oi.unit_price, oi.discount, oi.line_total
     FROM order_items oi JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ?`,
    [orderId],
  );

  return {
    id: Number(order.id),
    orderNo: String(order.order_no),
    outletId: Number(order.outlet_id),
    tableId: order.table_id === null ? null : Number(order.table_id),
    guestName: order.guest_name ? String(order.guest_name) : null,
    channel: String(order.order_channel),
    status: String(order.status),
    subtotal: Number(order.subtotal),
    discountTotal: Number(order.discount_total),
    discountPercent: order.discount_percent === null ? null : Number(order.discount_percent),
    taxTotal: Number(order.tax_total),
    serviceChargeTotal: Number(order.service_charge_total),
    grandTotal: Number(order.grand_total),
    items: itemRows.map((r) => ({
      productId: Number(r.product_id),
      name: String(r.name),
      qty: Number(r.qty),
      unitPrice: Number(r.unit_price),
      discount: Number(r.discount),
      lineTotal: Number(r.line_total),
    })),
  };
}
