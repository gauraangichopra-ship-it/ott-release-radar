#!/bin/bash
# Asks for the Supabase database password (hidden), puts it into .env.local
# and sends both connection strings to Vercel. The password is never printed.
set -e
cd "$(dirname "$0")/.."

printf "Type the Supabase database password (hidden), then press Enter: "
read -rs PW
echo
if [ -z "$PW" ]; then echo "Nothing typed. Run again."; exit 1; fi
if [[ ! "$PW" =~ ^[A-Za-z0-9]+$ ]]; then
  echo "Use letters and numbers only (symbols break the connection string). Reset it in Supabase and run again."
  exit 1
fi

PW="$PW" python3 - <<'EOF'
import os, re
pw = os.environ["PW"]
p = ".env.local"
s = open(p).read()
s = s.replace("[YOUR-PASSWORD]", pw)
s = re.sub(r"(postgres\.utkttfidjrjzzspojjgb:)[^@]*@", lambda m: m.group(1) + pw + "@", s)
open(p, "w").write(s)
EOF
echo "Saved to .env.local."

for k in DATABASE_URL DATABASE_URL_UNPOOLED; do
  v=$(grep -E "^$k=" .env.local | cut -d= -f2-)
  npx vercel env rm "$k" production --yes >/dev/null 2>&1 || true
  printf '%s' "$v" | npx vercel env add "$k" production >/dev/null 2>&1 && echo "Sent $k to Vercel."
done

echo "Checking the connection..."
npx tsx -e '
import { config } from "dotenv"; config({ path: ".env.local", quiet: true });
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED, ssl: { rejectUnauthorized: false } });
pool.query("select 1").then(() => { console.log("✅ Connected to the Mumbai database. Go back to Claude and say done."); process.exit(0); })
  .catch((e) => { console.log("❌ Could not connect: " + e.message.replace(/postgres(ql)?:\/\/[^\s]+/g, "[url]") + "\nThe password probably does not match. Reset it in Supabase and run this again."); process.exit(1); });
'
