import { connectTelegram } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, Pill } from "@/components/ui";
import { env } from "@/lib/env";
import { getProfile } from "@/lib/queries";
import { botUsername } from "@/lib/telegram";

export const dynamic = "force-dynamic";

function Row({ ok, label, hint }: { ok: boolean; label: string; hint: string }) {
  return (
    <li className="flex items-start gap-3 py-2 border-b border-line last:border-0">
      <Pill tone={ok ? "ok" : "bad"}>{ok ? "ready" : "missing"}</Pill>
      <div><div className="text-sm font-medium">{label}</div><div className="text-xs text-muted">{hint}</div></div>
    </li>
  );
}

export default async function Setup({ searchParams }: { searchParams: Promise<{ webhook?: string; error?: string }> }) {
  const sp = await searchParams;
  const [profile, bot] = await Promise.all([getProfile(), botUsername()]);

  return (
    <div className="space-y-5 max-w-3xl">
      <h1 className="text-2xl font-semibold">Setup</h1>
      {sp.webhook && <p className="text-sm text-ok">Telegram webhook set.</p>}
      {sp.error && <p className="text-sm text-bad">{sp.error}</p>}
      <Card title="Connections">
        <ul>
          <Row ok={Boolean(env.databaseUrl)} label="Supabase Postgres (Mumbai)" hint="DATABASE_URL (transaction pooler, ap-south-1)" />
          <Row ok={Boolean(env.tmdbToken)} label="TMDB API" hint="TMDB_READ_ACCESS_TOKEN (free at themoviedb.org → Settings → API)" />
          <Row ok={Boolean(env.geminiApiKey)} label="Gemini Flash" hint={`GEMINI_API_KEY · models tried in order: ${env.geminiModels.join(", ")}`} />
          <Row ok={Boolean(bot)} label={bot ? `Telegram bot @${bot}` : "Telegram bot"} hint="TELEGRAM_BOT_TOKEN from @BotFather" />
          <Row ok={Boolean(profile.chat_id)} label="Naman's chat" hint={profile.chat_id ? `Connected (chat ${profile.chat_id})` : `Open the bot${bot ? ` (t.me/${bot})` : ""} and send /start`} />
        </ul>
      </Card>
      <Card title="Telegram webhook">
        <p className="text-sm text-muted mb-3">Points the bot at <code>{env.appUrl || "APP_URL"}/api/telegram/webhook</code> so /start, /now and the buttons work.</p>
        <form action={connectTelegram}><SubmitButton tone="secondary">Set webhook</SubmitButton></form>
      </Card>
      <Card title="Schedule">
        <p className="text-sm">Vercel Cron runs <code>30 12 * * 5</code> (UTC) = <b>every Friday, 6:00pm IST</b>. The 7-day window is Saturday → Friday, India time.</p>
      </Card>
    </div>
  );
}
