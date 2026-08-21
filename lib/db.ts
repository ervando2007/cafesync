import "server-only";
import mysql from "mysql2/promise";

// Cached on globalThis so Next.js dev-mode Fast Refresh (which re-evaluates
// this module on every file change) reuses the same pool instead of leaking
// a fresh one each time — left unguarded, a long dev session can accumulate
// enough abandoned connections to hit MySQL's max_connections.
declare global {
  var __cafesyncDbPool: ReturnType<typeof mysql.createPool> | undefined;
}

const pool =
  globalThis.__cafesyncDbPool ??
  mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__cafesyncDbPool = pool;
}

export default pool;
