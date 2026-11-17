import "server-only";
import type { Session } from "next-auth";
import { getVisibleMenuKeyList } from "@/lib/menu-nav";
import { getT } from "@/lib/i18n/server";
import { navItemsForMenuKeys } from "@/app/ui/sidebar-nav-items";

/**
 * Where a signed-in user goes first: the first link of their own sidebar, in
 * menu order (Dashboard, POS, Attendance, Inventory, ...). It follows the menu
 * access matrix, so unticking a menu never locks a role out at sign-in.
 * "/unauthorized" only when nothing at all is ticked for the user's roles.
 */
export async function landingPathFor(session: Session): Promise<string> {
  const { t } = await getT();
  const [first] = navItemsForMenuKeys(await getVisibleMenuKeyList(session), t);
  if (!first) return "/unauthorized";
  return "children" in first ? first.children[0].href : first.href;
}
