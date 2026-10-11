// One-off: fills poster_path for items saved before posters were stored.
import { resolve } from "node:path";
import { config } from "dotenv";
import { Pool } from "pg";

config({ path: resolve(process.cwd(), ".env.local"), quiet: true });

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED, ssl: { rejectUnauthorized: false } });
  const { rows } = await pool.query<{ media_type: string; tmdb_id: number }>(
    "select distinct media_type, tmdb_id from items where poster_path is null",
  );
  for (const r of rows) {
    const res = await fetch(`https://api.themoviedb.org/3/${r.media_type}/${r.tmdb_id}`, {
      headers: { authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}` },
    });
    const d = (await res.json()) as { poster_path?: string };
    if (d.poster_path) {
      await pool.query("update items set poster_path = $1 where media_type = $2 and tmdb_id = $3", [d.poster_path, r.media_type, r.tmdb_id]);
    }
  }
  console.log(`Posters filled for ${rows.length} titles.`);
  await pool.end();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
