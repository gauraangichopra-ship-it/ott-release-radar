// npm run db:push -> creates the tables on the Supabase (Mumbai) database (safe to re-run)
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";
import { Pool } from "pg";

config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set in .env.local");
  const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
  try {
    await pool.query(readFileSync(resolve(process.cwd(), "db/schema.sql"), "utf8"));
    console.log("Schema applied.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("DB PUSH FAILED:", err.message ?? err);
  process.exit(1);
});
