import "server-only";
import type { Session } from "next-auth";
import { getVisibleMenuKeys } from "@/lib/menu-permissions";

export async function getVisibleMenuKeyList(session: Session): Promise<string[]> {
  const allowedKeys = await getVisibleMenuKeys(session);
  return [...allowedKeys];
}
