import "server-only";
import type { PoolConnection } from "mysql2/promise";
import type { RowDataPacket } from "mysql2";

export async function nextOrderNo(conn: PoolConnection, outletId: number): Promise<string> {
  const today = new Date();
  const yy = String(today.getFullYear()).slice(2);
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const datePart = `${yy}${mm}${dd}`;

  const [rows] = await conn.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS c FROM orders WHERE outlet_id = ? AND DATE(ordered_at) = CURDATE()",
    [outletId],
  );
  const seq = Number(rows[0].c) + 1;
  return `INV-${datePart}-${String(seq).padStart(4, "0")}`;
}
