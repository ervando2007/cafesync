"use server";

import { refresh } from "next/cache";
import { hasOutletAccess, requireRole } from "@/lib/auth-guard";
import { ATTENDANCE_ROLES, clockIn, clockOut, NOTE_MAX_LENGTH } from "@/lib/attendance";
import { getT } from "@/lib/i18n/server";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

function cleanNote(note: string): string | null {
  const trimmed = note.trim().slice(0, NOTE_MAX_LENGTH);
  return trimmed || null;
}

export async function clockInAction(input: { outletId: number; note: string }): Promise<ActionResult> {
  const session = await requireRole(ATTENDANCE_ROLES);
  const { t } = await getT();
  const outletId = Number(input.outletId);
  if (!Number.isInteger(outletId) || outletId <= 0 || !(await hasOutletAccess(session, outletId))) {
    return { ok: false, message: t("attendance.errOutletRequired") };
  }

  try {
    const result = await clockIn(Number(session.user.id), outletId, cleanNote(input.note));
    if (!result.ok) {
      return { ok: false, message: t(result.reason === "ALREADY_IN" ? "attendance.errAlreadyIn" : "common.somethingWentWrong") };
    }
  } catch (error) {
    console.error("clockIn failed", error);
    return { ok: false, message: t("common.somethingWentWrong") };
  }
  refresh();
  return { ok: true };
}

export async function clockOutAction(input: { note: string }): Promise<ActionResult> {
  const session = await requireRole(ATTENDANCE_ROLES);
  const { t } = await getT();

  try {
    const result = await clockOut(Number(session.user.id), cleanNote(input.note));
    if (!result.ok) {
      return { ok: false, message: t(result.reason === "NOT_IN" ? "attendance.errNotIn" : "common.somethingWentWrong") };
    }
  } catch (error) {
    console.error("clockOut failed", error);
    return { ok: false, message: t("common.somethingWentWrong") };
  }
  refresh();
  return { ok: true };
}
