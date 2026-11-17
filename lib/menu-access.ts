import "server-only";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { requireSession } from "@/lib/auth-guard";
import { getVisibleMenuKeys } from "@/lib/menu-permissions";

/**
 * Whether the session may use a menu entry (see lib/menu-rules.ts): ADMIN
 * always; otherwise the entry must be ticked for one of the user's roles — for
 * a matrix sub-entry like "reports.sales" its section ("reports") too — and,
 * when `onlyRoles` is given, the user must also hold one of those.
 */
export async function hasMenuAccess(
  session: Session,
  menuKey: string,
  onlyRoles?: readonly string[],
): Promise<boolean> {
  const roles = session.user.roles;
  if (roles.includes("ADMIN")) return true;
  if (onlyRoles && !roles.some((role) => onlyRoles.includes(role))) return false;
  const keys = await getVisibleMenuKeys(session);
  const section = menuKey.split(".")[0];
  return keys.has(section) && keys.has(menuKey);
}

/** Page / server-action guard: like requireRole, but driven by the menu matrix. */
export async function requireMenu(menuKey: string, onlyRoles?: readonly string[]): Promise<Session> {
  const session = await requireSession();
  if (!(await hasMenuAccess(session, menuKey, onlyRoles))) redirect("/unauthorized");
  return session;
}

/** Route-handler variant (exports): returns a Response to send back on failure. */
export async function authorizeMenuRoute(
  menuKey: string,
  onlyRoles?: readonly string[],
): Promise<Session | Response> {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  if (!(await hasMenuAccess(session, menuKey, onlyRoles))) {
    return new Response("Forbidden", { status: 403 });
  }
  return session;
}
