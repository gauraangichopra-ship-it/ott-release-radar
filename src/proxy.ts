import { NextResponse, type NextRequest } from "next/server";

// Password-protects the dashboard (Naman's profile and history live behind it).
// Browser shows its built-in login box; any username, password = APP_PASSWORD.
// Locally (npm run dev) there is no prompt. Deployed, APP_PASSWORD is required.

const REALM = 'Basic realm="OTT Release Radar", charset="UTF-8"';

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// The Telegram webhook and cron check their own secrets.
const PUBLIC = ["/api/telegram/", "/api/cron/", "/api/health"];

export function proxy(req: NextRequest) {
  if (PUBLIC.some((p) => req.nextUrl.pathname.startsWith(p))) return NextResponse.next();
  const password = (process.env.APP_PASSWORD ?? "").trim();
  const deployed = Boolean(process.env.VERCEL) || process.env.NODE_ENV === "production";

  // On your own laptop (npm run dev) there's no prompt; only the deployed app is locked.
  if (!deployed) return NextResponse.next();
  if (!password) {
    return new NextResponse("APP_PASSWORD is not set - the app is locked until it is.", { status: 503 });
  }

  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const given = decoded.slice(decoded.indexOf(":") + 1);
      if (safeEqual(given, password)) return NextResponse.next();
    } catch {
      // fall through to 401
    }
  }
  return new NextResponse("Password required", { status: 401, headers: { "WWW-Authenticate": REALM } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
