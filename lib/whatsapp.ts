import "server-only";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";

/**
 * Outbound WhatsApp messages via Whapi.cloud (POST /messages/text).
 * Env: WHAPI_TOKEN (channel token), optional WHAPI_API_URL
 * (default https://gate.whapi.cloud).
 */

/**
 * Normalise an Indonesian-style phone number to international digits without
 * "+" (the format Whapi expects): "0812-3456 789" / "+62 812..." -> "62812...".
 * Returns null when it can't be a phone number.
 */
export function normalizeWhatsAppNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8")) digits = `62${digits}`;
  return digits.length >= 9 && digits.length <= 15 ? digits : null;
}

export async function sendWhatsAppText(to: string, body: string): Promise<void> {
  const token = process.env.WHAPI_TOKEN;
  if (!token) {
    // Same dev fallback as the mailer: never surfaced to the client.
    console.warn(`[whatsapp] WHAPI_TOKEN not configured. Message to ${to}: ${body}`);
    return;
  }

  const baseUrl = (process.env.WHAPI_API_URL || "https://gate.whapi.cloud").replace(/\/+$/, "");
  const res = await fetch(`${baseUrl}/messages/text`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ to, body }),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as { sent?: boolean; error?: { message?: string } } | null;
  if (!res.ok || data?.sent === false) {
    throw new Error(`Whapi send failed (${res.status}): ${data?.error?.message ?? "unknown error"}`);
  }
}

export type WhatsAppCheck = { ok: true; value: string | null } | { ok: false; reason: "invalid" | "taken" };

/**
 * Validates a WhatsApp number before saving it on a user. Empty = cleared.
 * Saved normalised (62...) and unique across users, because the
 * forgot-password OTP can only go out when exactly one user owns the number.
 */
export async function checkWhatsAppNumberForUser(
  raw: string | undefined,
  excludeUserId?: number,
): Promise<WhatsAppCheck> {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return { ok: true, value: null };
  const value = normalizeWhatsAppNumber(trimmed);
  if (!value) return { ok: false, reason: "invalid" };

  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, whatsapp_number FROM users WHERE whatsapp_number IS NOT NULL AND whatsapp_number <> '' AND id <> ?",
    [excludeUserId ?? 0],
  );
  const taken = rows.some((r) => normalizeWhatsAppNumber(String(r.whatsapp_number)) === value);
  return taken ? { ok: false, reason: "taken" } : { ok: true, value };
}
