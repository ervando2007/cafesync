import "server-only";
import type { PoolConnection } from "mysql2/promise";
import type { RowDataPacket } from "mysql2";

/**
 * Next order number for an outlet: INV-<OUTLETCODE>-YYMMDD-NNNN.
 *
 * order_no is UNIQUE across all outlets, so the outlet code is part of the
 * number (two outlets' first order of the day no longer collide). Must be
 * called inside the transaction that inserts the order: the outlet row is
 * locked FOR UPDATE so concurrent orders at one outlet get distinct numbers.
 */
export async function nextOrderNo(conn: PoolConnection, outletId: number): Promise<string> {
  const [outletRows] = await conn.query<RowDataPacket[]>(
    "SELECT code, DATE_FORMAT(CURDATE(), '%y%m%d') AS day FROM outlets WHERE id = ? FOR UPDATE",
    [outletId],
  );
  if (!outletRows.length) throw new Error(`nextOrderNo: outlet ${outletId} not found`);
  const prefix = `INV-${String(outletRows[0].code)}-${String(outletRows[0].day)}-`;

  const [rows] = await conn.query<RowDataPacket[]>(
    "SELECT MAX(CAST(SUBSTRING(order_no, ?) AS UNSIGNED)) AS lastSeq FROM orders WHERE order_no LIKE ?",
    [prefix.length + 1, `${prefix.replace(/[\\%_]/g, "\\$&")}%`],
  );
  const seq = Number(rows[0]?.lastSeq ?? 0) + 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}
