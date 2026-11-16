import "server-only";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";

/** Roles that clock IN/OUT themselves (everyone on staff; not CUSTOMER). */
export const ATTENDANCE_ROLES = ["ADMIN", "GM", "MANAGER", "CASHIER", "ACCOUNTING"];
/** Roles that see the IN/OUT report (scoped to their outlets via resolveLedgerScope). */
export const ATTENDANCE_REPORT_ROLES = ["ADMIN", "GM", "MANAGER", "ACCOUNTING"];

export const NOTE_MAX_LENGTH = 255;

/**
 * A session left without OUT for longer than this counts as a forgotten OUT:
 * it stays in the report (flagged) but no longer blocks a new IN, and a later
 * OUT never closes it.
 */
export const OPEN_WINDOW_HOURS = 16;

export type AttendanceSource = "WEB" | "DEVICE";

export interface AttendanceRow {
  id: number;
  userId: number;
  employeeName: string;
  employeeEmail: string;
  outletId: number;
  outletName: string;
  source: AttendanceSource;
  /** YYYY-MM-DD of the clock-in (the work day the row belongs to). */
  workDate: string;
  /** HH:MM:SS */
  clockIn: string;
  /** YYYY-MM-DD HH:MM:SS, null while still clocked in. */
  clockOutAt: string | null;
  /** HH:MM:SS, null while still clocked in. */
  clockOut: string | null;
  /** True when OUT fell on a later calendar day than IN (overnight). */
  outNextDay: boolean;
  /** Whole minutes between IN and OUT; null while still clocked in. */
  durationMinutes: number | null;
  /** No OUT and older than OPEN_WINDOW_HOURS. */
  missedOut: boolean;
  noteIn: string | null;
  noteOut: string | null;
}

const ROW_SELECT = `
  SELECT a.id, a.user_id AS userId, u.name AS employeeName, u.email AS employeeEmail,
         a.outlet_id AS outletId, o.name AS outletName, a.source,
         DATE_FORMAT(a.clock_in_at, '%Y-%m-%d') AS workDate,
         DATE_FORMAT(a.clock_in_at, '%H:%i:%s') AS clockIn,
         DATE_FORMAT(a.clock_out_at, '%Y-%m-%d %H:%i:%s') AS clockOutAt,
         DATE_FORMAT(a.clock_out_at, '%H:%i:%s') AS clockOut,
         DATE(a.clock_out_at) > DATE(a.clock_in_at) AS outNextDay,
         TIMESTAMPDIFF(MINUTE, a.clock_in_at, a.clock_out_at) AS durationMinutes,
         (a.clock_out_at IS NULL AND a.clock_in_at < NOW() - INTERVAL ${OPEN_WINDOW_HOURS} HOUR) AS missedOut,
         a.note_in AS noteIn, a.note_out AS noteOut
  FROM attendances a
  JOIN users u ON u.id = a.user_id
  JOIN outlets o ON o.id = a.outlet_id`;

function mapRow(r: RowDataPacket): AttendanceRow {
  return {
    id: Number(r.id),
    userId: Number(r.userId),
    employeeName: String(r.employeeName),
    employeeEmail: String(r.employeeEmail),
    outletId: Number(r.outletId),
    outletName: String(r.outletName),
    source: r.source === "DEVICE" ? "DEVICE" : "WEB",
    workDate: String(r.workDate),
    clockIn: String(r.clockIn),
    clockOutAt: r.clockOutAt === null ? null : String(r.clockOutAt),
    clockOut: r.clockOut === null ? null : String(r.clockOut),
    outNextDay: Number(r.outNextDay) === 1,
    durationMinutes: r.durationMinutes === null ? null : Number(r.durationMinutes),
    missedOut: Number(r.missedOut) === 1,
    noteIn: r.noteIn === null ? null : String(r.noteIn),
    noteOut: r.noteOut === null ? null : String(r.noteOut),
  };
}

/** "125" minutes → "2:05". */
export function formatDuration(minutes: number | null): string {
  if (minutes === null) return "-";
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

/** SQL condition: session `alias` is open and recent enough to still be "IN" at `atSql`. */
export function openSessionSql(alias: string, atSql: string): string {
  return `${alias}.clock_out_at IS NULL AND ${alias}.clock_in_at <= ${atSql}
          AND ${alias}.clock_in_at >= ${atSql} - INTERVAL ${OPEN_WINDOW_HOURS} HOUR`;
}

/** The user's session that is still clocked in (at most one), if any. */
export async function getOpenAttendance(userId: number): Promise<AttendanceRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${ROW_SELECT} WHERE a.user_id = ? AND ${openSessionSql("a", "NOW()")} ORDER BY a.clock_in_at DESC LIMIT 1`,
    [userId],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function getRecentAttendance(userId: number, limit = 20): Promise<AttendanceRow[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${ROW_SELECT} WHERE a.user_id = ? ORDER BY a.clock_in_at DESC LIMIT ?`,
    [userId, limit],
  );
  return rows.map(mapRow);
}

/** Serialises IN/OUT per user so a double click (or two scans) can't open two sessions. */
export async function lockUser(conn: PoolConnection, userId: number): Promise<boolean> {
  const [rows] = await conn.query<RowDataPacket[]>("SELECT id FROM users WHERE id = ? FOR UPDATE", [userId]);
  return rows.length > 0;
}

export type ClockResult = { ok: true } | { ok: false; reason: "ALREADY_IN" | "NOT_IN" | "NO_USER" };

export async function clockIn(userId: number, outletId: number, note: string | null): Promise<ClockResult> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (!(await lockUser(conn, userId))) {
      await conn.rollback();
      return { ok: false, reason: "NO_USER" };
    }
    const [open] = await conn.query<RowDataPacket[]>(
      `SELECT a.id FROM attendances a WHERE a.user_id = ? AND ${openSessionSql("a", "NOW()")} LIMIT 1`,
      [userId],
    );
    if (open.length) {
      await conn.rollback();
      return { ok: false, reason: "ALREADY_IN" };
    }
    await conn.query<ResultSetHeader>(
      "INSERT INTO attendances (user_id, outlet_id, source, clock_in_at, note_in) VALUES (?, ?, 'WEB', NOW(), ?)",
      [userId, outletId, note],
    );
    await conn.commit();
    return { ok: true };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function clockOut(userId: number, note: string | null): Promise<ClockResult> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (!(await lockUser(conn, userId))) {
      await conn.rollback();
      return { ok: false, reason: "NO_USER" };
    }
    const [result] = await conn.query<ResultSetHeader>(
      `UPDATE attendances a SET a.clock_out_at = NOW(), a.note_out = ?
       WHERE a.user_id = ? AND ${openSessionSql("a", "NOW()")}
       ORDER BY a.clock_in_at DESC LIMIT 1`,
      [note, userId],
    );
    await conn.commit();
    return result.affectedRows ? { ok: true } : { ok: false, reason: "NOT_IN" };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export type AttendanceStatusFilter = "ALL" | "OPEN" | "DONE" | "MISSED";

export interface AttendanceReportParams {
  outletIds: number[];
  from: string;
  to: string;
  userId: number | null;
  status: AttendanceStatusFilter;
}

export function parseAttendanceStatus(value: string | null | undefined): AttendanceStatusFilter {
  return value === "OPEN" || value === "DONE" || value === "MISSED" ? value : "ALL";
}

export function parseUserId(value: string | null | undefined): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** IN/OUT rows whose clock-in falls within [from, to] in the scope's outlets. */
export async function getAttendanceReport(p: AttendanceReportParams): Promise<AttendanceRow[]> {
  const where = ["a.outlet_id IN (?)", "a.clock_in_at >= ?", "a.clock_in_at < DATE_ADD(?, INTERVAL 1 DAY)"];
  const args: unknown[] = [p.outletIds.length ? p.outletIds : [-1], p.from, p.to];
  if (p.userId) {
    where.push("a.user_id = ?");
    args.push(p.userId);
  }
  if (p.status === "OPEN") where.push(openSessionSql("a", "NOW()"));
  if (p.status === "MISSED") where.push(`a.clock_out_at IS NULL AND a.clock_in_at < NOW() - INTERVAL ${OPEN_WINDOW_HOURS} HOUR`);
  if (p.status === "DONE") where.push("a.clock_out_at IS NOT NULL");

  const [rows] = await pool.query<RowDataPacket[]>(
    `${ROW_SELECT} WHERE ${where.join(" AND ")} ORDER BY a.clock_in_at, u.name`,
    args,
  );
  return rows.map(mapRow);
}

/** Employees who have any attendance in the scope's outlets — for the report's employee filter. */
export async function getAttendanceEmployees(outletIds: number[]): Promise<{ id: number; name: string }[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT u.id, u.name FROM attendances a JOIN users u ON u.id = a.user_id
     WHERE a.outlet_id IN (?) ORDER BY u.name`,
    [outletIds.length ? outletIds : [-1]],
  );
  return rows.map((r) => ({ id: Number(r.id), name: String(r.name) }));
}

export function summarizeAttendance(rows: AttendanceRow[]) {
  const done = rows.filter((r) => r.durationMinutes !== null);
  return {
    records: rows.length,
    employees: new Set(rows.map((r) => r.userId)).size,
    totalMinutes: done.reduce((s, r) => s + (r.durationMinutes ?? 0), 0),
    stillIn: rows.filter((r) => r.durationMinutes === null && !r.missedOut).length,
    missedOut: rows.filter((r) => r.missedOut).length,
  };
}
