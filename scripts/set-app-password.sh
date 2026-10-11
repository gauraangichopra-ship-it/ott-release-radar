#!/bin/bash
# Asks for a new dashboard login password (hidden), saves it to .env.local,
# sends it to Vercel and redeploys. The password is never printed.
set -e
cd "$(dirname "$0")/.."

printf "Type the new website password (hidden), then press Enter: "
read -rs PW
echo
if [ ${#PW} -lt 8 ]; then echo "Use at least 8 characters. Run again."; exit 1; fi

PW="$PW" python3 - <<'EOF'
import os, re
p = ".env.local"
s = open(p).read()
s = re.sub(r"^APP_PASSWORD=.*$", "APP_PASSWORD=" + os.environ["PW"].replace("\\", "\\\\"), s, flags=re.M)
open(p, "w").write(s)
EOF
echo "Saved to .env.local."

npx vercel env rm APP_PASSWORD production --yes >/dev/null 2>&1 || true
printf '%s' "$PW" | npx vercel env add APP_PASSWORD production >/dev/null 2>&1 && echo "Sent to Vercel."
echo "Redeploying (about a minute)..."
npx vercel deploy --prod --yes >/dev/null 2>&1 && echo "✅ Done. Log in at https://ott-release-radar-sable.vercel.app with any username and your new password."
