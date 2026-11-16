import "server-only";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";
import { lockUser, openSessionSql } from "@/lib/attendance";

/**
 * Fingerspot (Revo) machines → CafeSync, via the Fingerspot cloud "attlog" webhook.
 * Scan time is the machine's own clock (outlet local time), not the time the
 * webhook arrived, so delayed deliveries still land on the right minute.
 */

export type ScanMode = "STATUS" | "TOGGLE";
export type ScanResult =
  | "IN"
  | "OUT"
  | "DUPLICATE"
  | "ALREADY_IN"
  | "NO_OPEN_IN"
  | "BREAK"
  | "UNKNOWN_DEVICE"
  | "UNKNOWN_PIN";

/** A second scan by the same person within this window is a double tap, not IN→OUT. */
export const DEBOUNCE_SECONDS = 60;

export interface AttlogScan {
  cloudId: string;
  pin: string;
  /** YYYY-MM-DD HH:MM:SS */
  scanAt: string;
  verify: number | null;
  statusScan: number | null;
}

/** "2026-11-16 08:01" / "2026-11-16 08:01:30" → "2026-11-16 08:01:30"; anything else → null. */
export function normalizeScanTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const m = value.trim().match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(:\d{2})?$/);
  if (!m) return null;
  const out = `${m[1]} ${m[2]}${m[3] ?? ":00"}`;
  const d = new Date(out.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : out;
}

function smallInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n < 100 ? n : null;
}

/** Validates the Fingerspot payload; returns null when it isn't a usable attlog. */
export function parseAttlogPayload(body: unknown): AttlogScan | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const data = (b.data ?? {}) as Record<string, unknown>;
  const cloudId = typeof b.cloud_id === "string" ? b.cloud_id.trim() : "";
  const pin = data.pin === undefined || data.pin === null ? "" : String(data.pin).trim();
  const scanAt = normalizeScanTime(data.scan);
  if (!cloudId || cloudId.length > 64 || !pin || pin.length > 20 || !scanAt) return null;
  return { cloudId, pin, scanAt, verify: smallInt(data.verify), statusScan: smallInt(data.status_scan) };
}

/** Records the scan and turns it into an IN / OUT on `attendances`. Idempotent per (cloud_id, pin, scan time). */
export async function processAttlogScan(scan: AttlogScan): Promise<ScanResult> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [already] = await conn.query<RowDataPacket[]>(
      "SELECT result FROM attendance_scans WHERE cloud_id = ? AND pin = ? AND scan_at = ?",
      [scan.cloudId, scan.pin, scan.scanAt],
    );
    if (already.length) {
      // Webhook retry of a scan we already handled.
      await conn.commit();
      return already[0].result as ScanResult;
    }

    const record = async (result: ScanResult, deviceId: number | null, userId: number | null, attendanceId: number | null) => {
      await conn.query(
        `INSERT IGNORE INTO attendance_scans
           (cloud_id, device_id, pin, scan_at, verify, status_scan, user_id, attendance_id, result)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [scan.cloudId, deviceId, scan.pin, scan.scanAt, scan.verify, scan.statusScan, userId, attendanceId, result],
      );
      await conn.commit();
      return result;
    };

    const [devices] = await conn.query<RowDataPacket[]>(
      "SELECT id, outlet_id AS outletId, scan_mode AS scanMode FROM attendance_devices WHERE cloud_id = ? AND status = 'ACTIVE'",
      [scan.cloudId],
    );
    const device = devices[0];
    if (!device) return await record("UNKNOWN_DEVICE", null, null, null);
    const deviceId = Number(device.id);
    await conn.query("UPDATE attendance_devices SET last_seen_at = NOW() WHERE id = ?", [deviceId]);

    const [users] = await conn.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE attendance_pin = ? AND status = 'ACTIVE'",
      [scan.pin],
    );
    if (!users[0]) return await record("UNKNOWN_PIN", deviceId, null, null);
    const userId = Number(users[0].id);
    await lockUser(conn, userId);

    const [recent] = await conn.query<RowDataPacket[]>(
      `SELECT attendance_id AS attendanceId FROM attendance_scans
       WHERE user_id = ? AND result IN ('IN', 'OUT')
         AND scan_at BETWEEN ? - INTERVAL ? SECOND AND ? + INTERVAL ? SECOND
       LIMIT 1`,
      [userId, scan.scanAt, DEBOUNCE_SECONDS, scan.scanAt, DEBOUNCE_SECONDS],
    );
    if (recent.length) return await record("DUPLICATE", deviceId, userId, recent[0].attendanceId ?? null);

    const [open] = await conn.query<RowDataPacket[]>(
      `SELECT a.id FROM attendances a
       WHERE a.user_id = ? AND ${openSessionSql("a", "?")}
       ORDER BY a.clock_in_at DESC LIMIT 1`,
      [userId, scan.scanAt, scan.scanAt],
    );
    const openId = open[0] ? Number(open[0].id) : null;

    let action: "IN" | "OUT" | "BREAK";
    if ((device.scanMode as ScanMode) === "TOGGLE" || scan.statusScan === null) {
      action = openId ? "OUT" : "IN";
    } else if (scan.statusScan === 0) {
      action = "IN";
    } else if (scan.statusScan === 1) {
      action = "OUT";
    } else {
      // 2 = break in, 3 = break out — kept in the scan log until shifts/breaks exist.
      action = "BREAK";
    }

    if (action === "BREAK") return await record("BREAK", deviceId, userId, openId);

    if (action === "IN") {
      if (openId) return await record("ALREADY_IN", deviceId, userId, openId);
      const [ins] = await conn.query<ResultSetHeader>(
        "INSERT INTO attendances (user_id, outlet_id, source, clock_in_at) VALUES (?, ?, 'DEVICE', ?)",
        [userId, Number(device.outletId), scan.scanAt],
      );
      return await record("IN", deviceId, userId, ins.insertId);
    }

    if (!openId) return await record("NO_OPEN_IN", deviceId, userId, null);
    await conn.query("UPDATE attendances SET clock_out_at = ? WHERE id = ?", [scan.scanAt, openId]);
    return await record("OUT", deviceId, userId, openId);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export interface AttendanceDevice {
  id: number;
  cloudId: string;
  name: string;
  outletId: number;
  outletName: string;
  scanMode: ScanMode;
  status: "ACTIVE" | "INACTIVE";
  lastSeenAt: string | null;
}

export async function getAttendanceDevices(): Promise<AttendanceDevice[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT d.id, d.cloud_id AS cloudId, d.name, d.outlet_id AS outletId, o.name AS outletName,
            d.scan_mode AS scanMode, d.status,
            DATE_FORMAT(d.last_seen_at, '%Y-%m-%d %H:%i:%s') AS lastSeenAt
     FROM attendance_devices d JOIN outlets o ON o.id = d.outlet_id
     ORDER BY o.name, d.name`,
  );
  return rows.map((r) => ({
    id: Number(r.id),
    cloudId: String(r.cloudId),
    name: String(r.name),
    outletId: Number(r.outletId),
    outletName: String(r.outletName),
    scanMode: r.scanMode === "TOGGLE" ? "TOGGLE" : "STATUS",
    status: r.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    lastSeenAt: r.lastSeenAt === null ? null : String(r.lastSeenAt),
  }));
}

export interface ScanLogRow {
  id: number;
  receivedAt: string;
  scanAt: string;
  cloudId: string;
  deviceName: string | null;
  pin: string;
  employeeName: string | null;
  verify: number | null;
  statusScan: number | null;
  result: ScanResult;
}

export async function getRecentScans(limit = 50): Promise<ScanLogRow[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT s.id, DATE_FORMAT(s.received_at, '%Y-%m-%d %H:%i:%s') AS receivedAt,
            DATE_FORMAT(s.scan_at, '%Y-%m-%d %H:%i:%s') AS scanAt,
            s.cloud_id AS cloudId, d.name AS deviceName, s.pin, u.name AS employeeName,
            s.verify, s.status_scan AS statusScan, s.result
     FROM attendance_scans s
     LEFT JOIN attendance_devices d ON d.id = s.device_id
     LEFT JOIN users u ON u.id = s.user_id
     ORDER BY s.id DESC LIMIT ?`,
    [limit],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    receivedAt: String(r.receivedAt),
    scanAt: String(r.scanAt),
    cloudId: String(r.cloudId),
    deviceName: r.deviceName === null ? null : String(r.deviceName),
    pin: String(r.pin),
    employeeName: r.employeeName === null ? null : String(r.employeeName),
    verify: r.verify === null ? null : Number(r.verify),
    statusScan: r.statusScan === null ? null : Number(r.statusScan),
    result: r.result as ScanResult,
  }));
}
