"use server";

import { refresh } from "next/cache";
import type { RowDataPacket } from "mysql2";
import { requireRole } from "@/lib/auth-guard";
import pool from "@/lib/db";
import { getT } from "@/lib/i18n/server";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

export interface DeviceInput {
  id?: number;
  cloudId: string;
  name: string;
  outletId: number;
  scanMode: "STATUS" | "TOGGLE";
  status: "ACTIVE" | "INACTIVE";
}

function isDuplicate(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "ER_DUP_ENTRY";
}

export async function saveAttendanceDevice(input: DeviceInput): Promise<ActionResult> {
  await requireRole(["ADMIN"]);
  const { t } = await getT();
  const cloudId = input.cloudId.trim();
  const name = input.name.trim();
  if (!cloudId || cloudId.length > 64) return { ok: false, message: t("attendanceDevices.errCloudIdRequired") };
  if (!name || name.length > 100) return { ok: false, message: t("inventory.errNameRequired") };
  const scanMode = input.scanMode === "TOGGLE" ? "TOGGLE" : "STATUS";
  const status = input.status === "INACTIVE" ? "INACTIVE" : "ACTIVE";

  const [outlet] = await pool.query<RowDataPacket[]>("SELECT id FROM outlets WHERE id = ?", [Number(input.outletId)]);
  if (!outlet.length) return { ok: false, message: t("attendance.errOutletRequired") };

  try {
    if (input.id) {
      await pool.query(
        "UPDATE attendance_devices SET cloud_id = ?, name = ?, outlet_id = ?, scan_mode = ?, status = ? WHERE id = ?",
        [cloudId, name, Number(input.outletId), scanMode, status, Number(input.id)],
      );
    } else {
      await pool.query(
        "INSERT INTO attendance_devices (cloud_id, name, outlet_id, scan_mode, status) VALUES (?, ?, ?, ?, ?)",
        [cloudId, name, Number(input.outletId), scanMode, status],
      );
    }
  } catch (error) {
    if (isDuplicate(error)) return { ok: false, message: t("attendanceDevices.errCloudIdExists") };
    console.error("saveAttendanceDevice failed", error);
    return { ok: false, message: t("common.somethingWentWrong") };
  }
  refresh();
  return { ok: true };
}
