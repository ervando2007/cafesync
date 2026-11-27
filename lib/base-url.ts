import "server-only";
import { headers } from "next/headers";

/**
 * Public origin of the app, e.g. for QR / email links. Prefers the configured
 * AUTH_URL: request headers (Host, X-Forwarded-*) are client-controlled, and a
 * forged Host must never end up in a password-reset link.
 */
export async function getRequestBaseUrl(): Promise<string> {
  const configured = process.env.AUTH_URL?.trim();
  if (configured) return new URL(configured).origin;

  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const proto =
    headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
