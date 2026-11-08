import "server-only";
import type { PoolConnection } from "mysql2/promise";
import type { RowDataPacket } from "mysql2";

export async function nextJournalNo(conn: PoolConnection): Promise<string> {
  const today = new Date();
  const yy = String(today.getFullYear()).slice(2);
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const datePart = `${yy}${mm}${dd}`;

  const [rows] = await conn.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS c FROM journal_entries WHERE DATE(created_at) = CURDATE()",
  );
  const seq = Number(rows[0].c) + 1;
  return `JRN-${datePart}-${String(seq).padStart(4, "0")}`;
}

export async function nextVoucherNo(conn: PoolConnection): Promise<string> {
  const today = new Date();
  const yy = String(today.getFullYear()).slice(2);
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const datePart = `${yy}${mm}${dd}`;

  const [rows] = await conn.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS c FROM journal_entries WHERE voucher_no IS NOT NULL AND DATE(created_at) = CURDATE()",
  );
  const seq = Number(rows[0].c) + 1;
  return `VC-${datePart}-${String(seq).padStart(4, "0")}`;
}
