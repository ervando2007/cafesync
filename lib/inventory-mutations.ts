import "server-only";
import type { RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";

interface StockRow {
  qty_on_hand: string | number;
  avg_cost: string | number;
}

export async function getOrLockStock(
  conn: PoolConnection,
  outletId: number,
  stockItemId: number,
): Promise<{ qtyOnHand: number; avgCost: number } | null> {
  const [rows] = await conn.query<(RowDataPacket & StockRow)[]>(
    "SELECT qty_on_hand, avg_cost FROM inventory_stocks WHERE outlet_id = ? AND stock_item_id = ? FOR UPDATE",
    [outletId, stockItemId],
  );
  if (!rows.length) return null;
  return { qtyOnHand: Number(rows[0].qty_on_hand), avgCost: Number(rows[0].avg_cost) };
}

export async function upsertStock(
  conn: PoolConnection,
  outletId: number,
  stockItemId: number,
  qtyOnHand: number,
  avgCost: number,
): Promise<void> {
  await conn.query(
    `INSERT INTO inventory_stocks (outlet_id, stock_item_id, qty_on_hand, avg_cost)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE qty_on_hand = VALUES(qty_on_hand), avg_cost = VALUES(avg_cost)`,
    [outletId, stockItemId, qtyOnHand, avgCost],
  );
}

export async function insertMovement(
  conn: PoolConnection,
  params: {
    outletId: number;
    stockItemId: number;
    movementType: string;
    qty: number;
    unitCost: number;
    referenceType: string;
    referenceId?: number;
    createdBy: number;
  },
): Promise<void> {
  await conn.query(
    `INSERT INTO inventory_movements
       (outlet_id, stock_item_id, movement_type, qty, unit_cost, reference_type, reference_id, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      params.outletId,
      params.stockItemId,
      params.movementType,
      params.qty,
      params.unitCost,
      params.referenceType,
      params.referenceId ?? null,
      params.createdBy,
    ],
  );
}

export async function validStockItemIds(conn: PoolConnection, ids: number[]): Promise<Set<number>> {
  if (!ids.length) return new Set();
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT id FROM stock_items WHERE status = 'ACTIVE' AND id IN (${ids.map(() => "?").join(",")})`,
    ids,
  );
  return new Set(rows.map((r: RowDataPacket) => Number(r.id)));
}
