import "server-only";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";

export interface PublicOutlet {
  id: number;
  code: string;
  name: string;
  address: string | null;
}

export async function getActiveOutlets(): Promise<PublicOutlet[]> {
  const [rows] = await pool.query<(PublicOutlet & RowDataPacket)[]>(
    "SELECT id, code, name, address FROM outlets WHERE status = 'ACTIVE' ORDER BY name",
  );
  return rows;
}

export interface MenuItem {
  productId: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  categoryName: string;
  productType: string;
  sellingPrice: number;
  taxRate: number;
  popularityScore: number;
}

export async function getMenuCatalog(outletId: number): Promise<MenuItem[]> {
  const [rows] = await pool.query<(MenuItem & RowDataPacket)[]>(
    `SELECT p.id AS productId, p.name, p.description, p.image_url AS imageUrl, c.name AS categoryName,
            p.product_type AS productType, op.selling_price AS sellingPrice, op.tax_rate AS taxRate,
            COALESCE(pop.totalQty, 0) AS popularityScore
     FROM outlet_products op
     JOIN products p ON p.id = op.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN (
       SELECT oi.product_id, SUM(oi.qty) AS totalQty
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.status = 'PAID'
       GROUP BY oi.product_id
     ) pop ON pop.product_id = p.id
     WHERE op.outlet_id = ? AND op.is_available = 1 AND p.status = 'ACTIVE'
     ORDER BY c.name, p.name`,
    [outletId],
  );
  return rows.map((r) => ({
    ...r,
    sellingPrice: Number(r.sellingPrice),
    taxRate: Number(r.taxRate),
    popularityScore: Number(r.popularityScore),
  }));
}

export interface PublicTable {
  id: number;
  code: string;
  name: string;
  status: string;
}

export async function getTablesForOutlet(outletId: number): Promise<PublicTable[]> {
  const [rows] = await pool.query<(PublicTable & RowDataPacket)[]>(
    "SELECT id, code, name, status FROM dining_tables WHERE outlet_id = ? ORDER BY code",
    [outletId],
  );
  return rows;
}

export interface TrackedOrderItem {
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface TrackedOrder {
  orderNo: string;
  status: string;
  channel: string;
  outletName: string;
  tableName: string | null;
  guestName: string | null;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  orderedAt: string;
  items: TrackedOrderItem[];
}

export async function getOrderByNo(orderNo: string): Promise<TrackedOrder | null> {
  const [orderRows] = await pool.query<(RowDataPacket & Record<string, unknown>)[]>(
    `SELECT o.order_no, o.status, o.order_channel, o.subtotal, o.discount_total, o.tax_total,
            o.grand_total, o.ordered_at, o.guest_name, ot.name AS outlet_name, t.name AS table_name
     FROM orders o
     JOIN outlets ot ON ot.id = o.outlet_id
     LEFT JOIN dining_tables t ON t.id = o.table_id
     WHERE o.order_no = ? LIMIT 1`,
    [orderNo],
  );
  const order = orderRows[0];
  if (!order) return null;

  const [itemRows] = await pool.query<(RowDataPacket & Record<string, unknown>)[]>(
    `SELECT p.name, oi.qty, oi.unit_price, oi.line_total
     FROM order_items oi JOIN products p ON p.id = oi.product_id
     JOIN orders o ON o.id = oi.order_id
     WHERE o.order_no = ?`,
    [orderNo],
  );

  return {
    orderNo: String(order.order_no),
    status: String(order.status),
    channel: String(order.order_channel),
    outletName: String(order.outlet_name),
    tableName: order.table_name ? String(order.table_name) : null,
    guestName: order.guest_name ? String(order.guest_name) : null,
    subtotal: Number(order.subtotal),
    discountTotal: Number(order.discount_total),
    taxTotal: Number(order.tax_total),
    grandTotal: Number(order.grand_total),
    orderedAt: String(order.ordered_at),
    items: itemRows.map((r) => ({
      name: String(r.name),
      qty: Number(r.qty),
      unitPrice: Number(r.unit_price),
      lineTotal: Number(r.line_total),
    })),
  };
}
