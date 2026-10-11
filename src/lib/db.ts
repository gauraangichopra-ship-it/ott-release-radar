import "server-only";
import { Pool, types } from "pg";
import { env, requireEnv } from "./env";

// NUMERIC (costs, budgets) comes back as a JS number, not a string.
types.setTypeParser(1700, (v) => parseFloat(v));

let pool: Pool | null = null;

// Server-side only. The browser never talks to the database.
function getPool(): Pool {
  if (!pool) {
    requireEnv("databaseUrl");
    // Supabase (Mumbai) transaction pooler. Small pool: serverless functions are short-lived.
    pool = new Pool({ connectionString: env.databaseUrl, max: 3, ssl: { rejectUnauthorized: false } });
  }
  return pool;
}

export async function query<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await getPool().query(text, params);
  return res.rows as T[];
}

export async function maybeOne<T>(text: string, params: unknown[] = []): Promise<T | null> {
  return (await query<T>(text, params))[0] ?? null;
}

export async function one<T>(text: string, params: unknown[] = []): Promise<T> {
  const row = await maybeOne<T>(text, params);
  if (!row) throw new Error("Expected a row, got none");
  return row;
}
