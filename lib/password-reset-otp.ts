import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "crypto";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp";

export const OTP_TTL_MINUTES = 10;
/** Wrong guesses allowed per code before it is burned. */
const MAX_ATTEMPTS = 5;
/** Minimum gap between two OTPs for the same user. */
const RESEND_COOLDOWN_SECONDS = 60;
/** OTPs per user per day — caps total guesses at MAX_OTPS_PER_DAY * MAX_ATTEMPTS. */
const MAX_OTPS_PER_DAY = 5;

function hashOtp(userId: number, otp: string): string {
  const secret = process.env.AUTH_SECRET ?? "";
  return createHmac("sha256", secret).update(`${userId}:${otp}`).digest("hex");
}

/**
 * The single active user whose saved WhatsApp number matches. Numbers are
 * stored free-form (profile form), so they're compared after normalising.
 * Ambiguous matches (two users on one number) return null: we can't tell
 * whose password to reset.
 */
export async function findUserIdByWhatsApp(rawNumber: string): Promise<{ userId: number; number: string } | null> {
  const wanted = normalizeWhatsAppNumber(rawNumber);
  if (!wanted) return null;

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, whatsapp_number FROM users
     WHERE status = 'ACTIVE' AND password_hash IS NOT NULL
       AND whatsapp_number IS NOT NULL AND whatsapp_number <> ''`,
  );
  const matches = rows.filter((r) => normalizeWhatsAppNumber(String(r.whatsapp_number)) === wanted);
  return matches.length === 1 ? { userId: Number(matches[0].id), number: wanted } : null;
}

/** Creates a fresh OTP (invalidating older unused ones), or null while in cooldown. */
export async function createResetOtp(userId: number): Promise<string | null> {
  const [recent] = await pool.query<RowDataPacket[]>(
    `SELECT 1 FROM password_reset_otps
     WHERE user_id = ? AND created_at > NOW() - INTERVAL ? SECOND LIMIT 1`,
    [userId, RESEND_COOLDOWN_SECONDS],
  );
  if (recent.length) return null;

  const [[today]] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS c FROM password_reset_otps WHERE user_id = ? AND created_at > NOW() - INTERVAL 1 DAY",
    [userId],
  );
  if (Number(today.c) >= MAX_OTPS_PER_DAY) return null;

  const otp = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await pool.query(
    "UPDATE password_reset_otps SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL",
    [userId],
  );
  await pool.query(
    `INSERT INTO password_reset_otps (user_id, otp_hash, expires_at)
     VALUES (?, ?, NOW() + INTERVAL ? MINUTE)`,
    [userId, hashOtp(userId, otp), OTP_TTL_MINUTES],
  );
  return otp;
}

/**
 * Checks the OTP and, when it matches, sets the new password and burns the
 * code in one transaction. Every wrong guess counts toward MAX_ATTEMPTS.
 */
export async function consumeResetOtp(userId: number, otp: string, newPasswordHash: string): Promise<boolean> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT id, otp_hash, attempts FROM password_reset_otps
       WHERE user_id = ? AND used_at IS NULL AND expires_at > NOW()
       ORDER BY id DESC LIMIT 1 FOR UPDATE`,
      [userId],
    );
    const row = rows[0];
    if (!row || Number(row.attempts) >= MAX_ATTEMPTS) {
      await conn.rollback();
      return false;
    }

    const expected = Buffer.from(String(row.otp_hash), "hex");
    const given = Buffer.from(hashOtp(userId, otp), "hex");
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
      await conn.query("UPDATE password_reset_otps SET attempts = attempts + 1 WHERE id = ?", [row.id]);
      await conn.commit();
      return false;
    }

    await conn.query("UPDATE users SET password_hash = ? WHERE id = ?", [newPasswordHash, userId]);
    await conn.query("UPDATE password_reset_otps SET used_at = NOW() WHERE id = ?", [row.id]);
    await conn.commit();
    return true;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
