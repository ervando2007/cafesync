import "server-only";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";

export interface DbUser {
  id: number;
  email: string;
  name: string;
  password_hash: string | null;
  avatar_url: string | null;
  whatsapp_number: string | null;
  address: string | null;
  google_sub: string | null;
  status: "ACTIVE" | "INACTIVE" | "LOCKED";
}

const USER_COLUMNS =
  "id, email, name, password_hash, avatar_url, whatsapp_number, address, google_sub, status";

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const [rows] = await pool.query<(DbUser & RowDataPacket)[]>(
    `SELECT ${USER_COLUMNS} FROM users WHERE email = ? LIMIT 1`,
    [email],
  );
  return rows[0] ?? null;
}

export async function findUserByGoogleSub(
  googleSub: string,
): Promise<DbUser | null> {
  const [rows] = await pool.query<(DbUser & RowDataPacket)[]>(
    `SELECT ${USER_COLUMNS} FROM users WHERE google_sub = ? LIMIT 1`,
    [googleSub],
  );
  return rows[0] ?? null;
}

export async function findUserById(id: number | string): Promise<DbUser | null> {
  const [rows] = await pool.query<(DbUser & RowDataPacket)[]>(
    `SELECT ${USER_COLUMNS} FROM users WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function findUserRoleCodes(userId: number | string): Promise<string[]> {
  const [rows] = await pool.query<(RowDataPacket & { code: string })[]>(
    `SELECT r.code FROM roles r
     JOIN user_roles ur ON ur.role_id = r.id
     WHERE ur.user_id = ?`,
    [userId],
  );
  return rows.map((row) => row.code);
}

export async function touchLastLogin(userId: number): Promise<void> {
  await pool.query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [
    userId,
  ]);
}

export async function linkGoogleAccount(
  userId: number,
  googleSub: string,
): Promise<void> {
  await pool.query("UPDATE users SET google_sub = ? WHERE id = ?", [
    googleSub,
    userId,
  ]);
}

export interface UserRoleRef {
  id: number;
  code: string;
  name: string;
}

export interface UserOutletRef {
  id: number;
  code: string;
  name: string;
}

export interface UserRecord {
  id: number;
  name: string;
  email: string;
  status: "ACTIVE" | "INACTIVE" | "LOCKED";
  roles: UserRoleRef[];
  outlets: UserOutletRef[];
}

export async function getAllUsersForAdmin(): Promise<UserRecord[]> {
  const [users] = await pool.query<RowDataPacket[]>(
    "SELECT id, name, email, status FROM users ORDER BY name",
  );
  const [roleRows] = await pool.query<RowDataPacket[]>(
    `SELECT ur.user_id AS userId, r.id, r.code, r.name
     FROM user_roles ur JOIN roles r ON r.id = ur.role_id`,
  );
  const [outletRows] = await pool.query<RowDataPacket[]>(
    `SELECT uo.user_id AS userId, o.id, o.code, o.name
     FROM user_outlets uo JOIN outlets o ON o.id = uo.outlet_id`,
  );

  return users.map((u) => {
    const userId = Number(u.id);
    return {
      id: userId,
      name: String(u.name),
      email: String(u.email),
      status: u.status as "ACTIVE" | "INACTIVE" | "LOCKED",
      roles: roleRows
        .filter((r) => Number(r.userId) === userId)
        .map((r) => ({ id: Number(r.id), code: String(r.code), name: String(r.name) })),
      outlets: outletRows
        .filter((o) => Number(o.userId) === userId)
        .map((o) => ({ id: Number(o.id), code: String(o.code), name: String(o.name) })),
    };
  });
}

export async function createGoogleUser(
  email: string,
  name: string,
  googleSub: string,
): Promise<DbUser> {
  const [result] = await pool.query(
    "INSERT INTO users (email, name, google_sub, status) VALUES (?, ?, ?, 'ACTIVE')",
    [email, name, googleSub],
  );
  const insertId = (result as { insertId: number }).insertId;
  return {
    id: insertId,
    email,
    name,
    password_hash: null,
    avatar_url: null,
    whatsapp_number: null,
    address: null,
    google_sub: googleSub,
    status: "ACTIVE",
  };
}
