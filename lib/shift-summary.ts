import "server-only";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { getOpenAttendance } from "@/lib/attendance";

/**
 * Until real shifts exist, a cashier's "shift" is their current attendance
 * session (clock IN → now). Without an open session we fall back to today.
 * Sales are the orders this user created, counted when they were closed (paid/voided).
 */

export interface ShiftCard {
  /** Clocked in right now. */
  isIn: boolean;
  outletName: string | null;
  /** HH:MM of the clock-in. */
  clockIn: string | null;
  /** YYYY-MM-DD of the clock-in, or today when not IN. */
  date: string;
}

export interface ShiftDetail extends ShiftCard {
  /** YYYY-MM-DD HH:MM:SS the summary starts from. */
  since: string;
  /** Whole minutes since clock-in; null when not IN. */
  durationMinutes: number | null;
  paidCount: number;
  paidTotal: number;
  openCount: number;
  openTotal: number;
  voidedCount: number;
  voidedTotal: number;
  byMethod: { method: string; count: number; amount: number }[];
}

export async function getShiftCard(userId: number): Promise<ShiftCard> {
  const open = await getOpenAttendance(userId);
  if (open) return { isIn: true, outletName: open.outletName, clockIn: open.clockIn.slice(0, 5), date: open.workDate };
  const [[row]] = await pool.query<RowDataPacket[]>("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS today");
  return { isIn: false, outletName: null, clockIn: null, date: String(row.today) };
}

export async function getShiftDetail(userId: number): Promise<ShiftDetail> {
  const open = await getOpenAttendance(userId);
  const [[clock]] = await pool.query<RowDataPacket[]>(
    `SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d 00:00:00') AS midnight,
            DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS today, NOW() AS now`,
  );
  const since = open ? `${open.workDate} ${open.clockIn}` : String(clock.midnight);

  const [[orders]] = await pool.query<RowDataPacket[]>(
    `SELECT
       COALESCE(SUM(status = 'PAID'), 0) AS paidCount,
       COALESCE(SUM(CASE WHEN status = 'PAID' THEN grand_total END), 0) AS paidTotal,
       COALESCE(SUM(status = 'OPEN'), 0) AS openCount,
       COALESCE(SUM(CASE WHEN status = 'OPEN' THEN grand_total END), 0) AS openTotal,
       COALESCE(SUM(status = 'VOIDED'), 0) AS voidedCount,
       COALESCE(SUM(CASE WHEN status = 'VOIDED' THEN grand_total END), 0) AS voidedTotal
     FROM orders
     WHERE created_by = ?
       AND (
         (status = 'OPEN' AND ordered_at >= ?)
         OR (status = 'PAID' AND COALESCE(closed_at, ordered_at) >= ?)
         OR (status = 'VOIDED' AND COALESCE(voided_at, ordered_at) >= ?)
       )`,
    [userId, since, since, since],
  );

  const [methods] = await pool.query<RowDataPacket[]>(
    `SELECT p.method, COUNT(*) AS count, COALESCE(SUM(p.amount), 0) AS amount
     FROM payments p JOIN orders o ON o.id = p.order_id
     WHERE o.created_by = ? AND o.status = 'PAID' AND p.status = 'SUCCESS'
       AND COALESCE(o.closed_at, o.ordered_at) >= ?
     GROUP BY p.method ORDER BY amount DESC`,
    [userId, since],
  );

  const [[dur]] = await pool.query<RowDataPacket[]>("SELECT TIMESTAMPDIFF(MINUTE, ?, NOW()) AS minutes", [since]);

  return {
    isIn: Boolean(open),
    outletName: open?.outletName ?? null,
    clockIn: open ? open.clockIn.slice(0, 5) : null,
    date: open ? open.workDate : String(clock.today),
    since,
    durationMinutes: open ? Number(dur.minutes) : null,
    paidCount: Number(orders.paidCount),
    paidTotal: Number(orders.paidTotal),
    openCount: Number(orders.openCount),
    openTotal: Number(orders.openTotal),
    voidedCount: Number(orders.voidedCount),
    voidedTotal: Number(orders.voidedTotal),
    byMethod: methods.map((m) => ({ method: String(m.method), count: Number(m.count), amount: Number(m.amount) })),
  };
}
