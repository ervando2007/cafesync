import "server-only";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import type { Session } from "next-auth";

export type OutletMasterStatus = "ACTIVE" | "INACTIVE";

export interface OutletRecord {
  id: number;
  code: string;
  name: string;
  address: string | null;
  timezone: string;
  status: OutletMasterStatus;
}

function mapRow(r: RowDataPacket): OutletRecord {
  return {
    id: Number(r.id),
    code: String(r.code),
    name: String(r.name),
    address: r.address === null ? null : String(r.address),
    timezone: String(r.timezone),
    status: r.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
  };
}

export async function getOutletsForManagement(session: Session): Promise<OutletRecord[]> {
  const isGlobal = session.user.roles.some((r) => r === "ADMIN" || r === "GM");

  if (isGlobal) {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, code, name, address, timezone, status FROM outlets ORDER BY name",
    );
    return rows.map(mapRow);
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT o.id, o.code, o.name, o.address, o.timezone, o.status FROM outlets o
     JOIN user_outlets uo ON uo.outlet_id = o.id
     WHERE uo.user_id = ? AND o.status = 'ACTIVE'
     ORDER BY uo.is_default DESC, o.name`,
    [session.user.id],
  );
  return rows.map(mapRow);
}
