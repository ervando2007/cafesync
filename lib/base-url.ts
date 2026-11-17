import "server-only";
import { headers } from "next/headers";

/** Public origin of the current request (behind the proxy), e.g. for QR / email links. */
export async function getRequestBaseUrl(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const proto =
    headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
