import "server-only";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";

export type DiningTableStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "INACTIVE";

export interface DiningTableRecord {
  id: number;
  code: string;
  name: string;
  capacity: number;
  status: DiningTableStatus;
}

export async function getTablesForManagement(outletId: number): Promise<DiningTableRecord[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, code, name, capacity, status FROM dining_tables WHERE outlet_id = ? ORDER BY code",
    [outletId],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    code: String(r.code),
    name: String(r.name),
    capacity: Number(r.capacity ?? 0),
    status: String(r.status) as DiningTableStatus,
  }));
}

/** Customer self-order link for one table; the order page preselects outlet + table from it. */
export function tableOrderUrl(baseUrl: string, outletCode: string, tableCode: string): string {
  const params = new URLSearchParams({ outlet: outletCode, table: tableCode });
  return `${baseUrl}/order?${params.toString()}`;
}
