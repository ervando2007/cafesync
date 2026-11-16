import { timingSafeEqual } from "crypto";
import { parseAttlogPayload, processAttlogScan } from "@/lib/attendance-device";

/**
 * Fingerspot cloud webhook (set per device in the Fingerspot portal):
 *   https://<app-domain>/api/attendance/webhook?token=<ATTENDANCE_WEBHOOK_TOKEN>
 *
 * Fingerspot signs nothing, so the secret token in the URL is the only gate.
 * Fingerspot treats this as fire-and-forget; we still answer 200 for anything
 * we accepted (including scans we chose not to turn into IN/OUT — they're in
 * attendance_scans) so it doesn't keep retrying.
 */

function tokenMatches(given: string | null): boolean {
  const expected = process.env.ATTENDANCE_WEBHOOK_TOKEN;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!process.env.ATTENDANCE_WEBHOOK_TOKEN) {
    return Response.json({ ok: false, error: "webhook not configured" }, { status: 503 });
  }
  const url = new URL(request.url);
  if (!tokenMatches(url.searchParams.get("token") ?? request.headers.get("x-webhook-token"))) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  // Other Fingerspot callbacks (set_userinfo, get_attlog results, ...) share the same URL.
  if ((body as { type?: unknown } | null)?.type !== "attlog") {
    return Response.json({ ok: true, ignored: true });
  }

  const scan = parseAttlogPayload(body);
  if (!scan) return Response.json({ ok: false, error: "invalid attlog payload" }, { status: 400 });

  try {
    const result = await processAttlogScan(scan);
    return Response.json({ ok: true, result });
  } catch (error) {
    console.error("attendance webhook failed", error);
    return Response.json({ ok: false, error: "internal error" }, { status: 500 });
  }
}
