import "server-only";
import type { Session } from "next-auth";
import { auth } from "@/auth";

export const ACCOUNTING_REPORT_ROLES = ["ADMIN", "GM", "ACCOUNTING"];

/** Session + role gate for report export routes; returns a Response to send back on failure. */
export async function authorizeExport(roles: string[]): Promise<Session | Response> {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  if (!session.user.roles.some((role) => roles.includes(role))) {
    return new Response("Forbidden", { status: 403 });
  }
  return session;
}
