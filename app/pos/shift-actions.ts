"use server";

import { requireRole } from "@/lib/auth-guard";
import { getShiftDetail, type ShiftDetail } from "@/lib/shift-summary";

const POS_ROLES = ["ADMIN", "GM", "MANAGER", "CASHIER"];

/** Fresh numbers each time the shift detail opens (the sidebar card is rendered once per layout). */
export async function getMyShiftDetail(): Promise<ShiftDetail> {
  const session = await requireRole(POS_ROLES);
  return getShiftDetail(Number(session.user.id));
}
