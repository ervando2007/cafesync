import "server-only";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import type { RowDataPacket } from "mysql2";
import { auth } from "@/auth";
import pool from "@/lib/db";

export async function requireSession(): Promise<Session> {
  const session = await auth();
  if (!session?.user) redirect("/");
  return session;
}

export async function requireRole(allowedRoles: string[]): Promise<Session> {
  const session = await requireSession();
  const hasRole = session.user.roles.some((role) => allowedRoles.includes(role));
  if (!hasRole) redirect("/unauthorized");
  return session;
}

/**
 * ADMIN/GM are global; every other role must be explicitly assigned to the
 * outlet via user_outlets. Callers that accept an outletId from the client
 * (POS actions, etc.) must check this — the outlet picker is a UI filter,
 * not a security boundary.
 */
export async function hasOutletAccess(session: Session, outletId: number): Promise<boolean> {
  if (session.user.roles.some((role) => role === "ADMIN" || role === "GM")) return true;

  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT 1 FROM user_outlets WHERE user_id = ? AND outlet_id = ? LIMIT 1",
    [session.user.id, outletId],
  );
  return rows.length > 0;
}
