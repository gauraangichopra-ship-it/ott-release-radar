import { connectTelegram } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { Card } from "@/components/ui";
import { env } from "@/lib/env";
import { getProfile } from "@/lib/queries";
import { botUsername } from "@/lib/telegram";

export const dynamic = "force-dynamic";

function Step({ ok, title, children }: { ok: boolean; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 py-3 border-b border-line last:border-0">
      <span className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-sm ${ok ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad"}`}>{ok ? "✓" : "!"}</span>
      <div><div className="font-medium">{title}</div><div className="text-sm text-muted">{children}</div></div>
    </li>
  );
}

export default async function Setup({ searchParams }: { searchParams: Promise<{ webhook?: string; error?: string }> }) {
  const sp = await searchParams;
  const [profile, bot] = await Promise.all([getProfile(), botUsername()]);
  const allOk = Boolean(env.databaseUrl && env.tmdbToken && env.geminiApiKey && bot && profile.chat_id);

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">⚙️ Setup</h1>
        <p className="text-muted mt-1">{allOk ? "Everything is connected. Nothing to do here 🎉" : "A few things still need connecting."}</p>
        {sp.webhook && <p className="mt-3 text-sm bg-ok-soft text-ok rounded-xl px-3 py-2">✅ Telegram reconnected.</p>}
        {sp.error && <p className="mt-3 text-sm bg-bad-soft text-bad rounded-xl px-3 py-2">⚠️ {sp.error}</p>}
      </div>

      <Card title="Connections">
        <ul>
          <Step ok={Boolean(bot)} title={bot ? `Telegram bot @${bot}` : "Telegram bot"}>Delivers the digest every Friday.</Step>
          <Step ok={Boolean(profile.chat_id)} title="Your Telegram chat">
            {profile.chat_id ? "Connected." : <>Open <a className="text-accent underline" href={bot ? `https://t.me/${bot}` : "#"}>the bot</a> and send <b>/start</b>.</>}
          </Step>
          <Step ok={Boolean(env.tmdbToken)} title="Movie & TV database (TMDB)">Where new releases in India come from.</Step>
          <Step ok={Boolean(env.geminiApiKey)} title="AI recommender (Gemini Flash)">Writes the synopsis and the WATCH / SKIP call.</Step>
          <Step ok={Boolean(env.databaseUrl)} title="Database (Supabase · Mumbai)">Remembers your taste, what was sent and your taps.</Step>
        </ul>
      </Card>

      <Card title="📅 Schedule">
        <p className="text-sm">Every <b>Friday at 6:00 pm</b> (India time), covering releases from the previous Saturday to Friday.</p>
      </Card>

      <Card title="💬 Telegram commands">
        <ul className="text-sm space-y-1">
          <li><code className="bg-stone-100 rounded px-1.5">/now</code>: get this week&apos;s digest right away</li>
          <li><code className="bg-stone-100 rounded px-1.5">/help</code>: what the bot does</li>
          <li>Tap <b>✅ title</b> or <b>Not for me</b> under a digest to teach it your taste</li>
        </ul>
      </Card>

      <details className="bg-card border border-line rounded-2xl p-5">
        <summary className="font-semibold cursor-pointer">Bot not replying?</summary>
        <p className="text-sm text-muted mt-2 mb-3">This reconnects the bot to <code>{env.appUrl || "the app"}</code>. Safe to click any time.</p>
        <form action={connectTelegram}><SubmitButton tone="secondary" pendingText="Reconnecting…">🔌 Reconnect Telegram</SubmitButton></form>
      </details>
    </div>
  );
}
