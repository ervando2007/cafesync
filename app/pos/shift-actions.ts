"use server";

import { getShiftDetail, type ShiftDetail } from "@/lib/shift-summary";
import { requireMenu } from "@/lib/menu-access";


/** Fresh numbers each time the shift detail opens (the sidebar card is rendered once per layout). */
export async function getMyShiftDetail(): Promise<ShiftDetail> {
  const session = await requireMenu("pos");
  return getShiftDetail(Number(session.user.id));
}
