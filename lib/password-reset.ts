import "server-only";
import { randomBytes, createHash } from "crypto";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export async function createResetToken(userId: number): Promise<string> {
  const rawToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await pool.query(
    "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
    [userId, hashToken(rawToken), expiresAt],
  );

  return rawToken;
}

export interface ValidResetToken {
  id: number;
  userId: number;
}

export async function findValidResetToken(rawToken: string): Promise<ValidResetToken | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, user_id AS userId FROM password_reset_tokens
     WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()
     LIMIT 1`,
    [hashToken(rawToken)],
  );
  const row = rows[0];
  return row ? { id: Number(row.id), userId: Number(row.userId) } : null;
}

export async function consumeResetToken(tokenId: number, userId: number, newPasswordHash: string): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("UPDATE users SET password_hash = ? WHERE id = ?", [newPasswordHash, userId]);
    await conn.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?", [tokenId]);
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
