import { NextResponse } from "next/server";
import { runRadar } from "@/lib/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Vercel Cron: Friday 12:30 UTC = 18:00 IST (see vercel.json).
// Vercel sends "Authorization: Bearer $CRON_SECRET" when CRON_SECRET is set.
export async function GET(req: Request) {
  const secret = (process.env.CRON_SECRET ?? "").trim();
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const result = await runRadar("cron");
  return NextResponse.json({ ok: result.status !== "failed", ...result });
}
