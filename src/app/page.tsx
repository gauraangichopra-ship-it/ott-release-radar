import Link from "next/link";
import { previewNow, sendNow } from "./actions";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, Empty, PickCard, Stat, inr, istDay } from "@/components/ui";
import { getProfile, latestDelivered, listRuns, nextFridayRun, runItems, totals } from "@/lib/queries";
import { GENRES, LANGUAGES, PROVIDERS } from "@/lib/prefs";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function countdown(to: Date) {
  const days = Math.floor((to.getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return "today";
  return days === 1 ? "tomorrow" : `in ${days} days`;
}

export default async function Home() {
  const [profile, t, last, runs] = await Promise.all([getProfile(), totals(), latestDelivered(), listRuns(1)]);
  const shown = last ?? runs[0] ?? null;
  const items = shown ? await runItems(shown.id) : [];
  const watch = items.filter((i) => i.verdict === "WATCH");
  const next = nextFridayRun();
  const nextText = next.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const tapped = t.watching + t.not_for_me;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="rounded-3xl bg-gradient-to-br from-brand via-brand-2 to-[#3b2a52] text-white p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -right-6 -top-6 text-[140px] opacity-10 select-none">🎬</div>
        <p className="text-white/70 text-sm">Hi Naman 👋</p>
        <h1 className="text-2xl sm:text-3xl font-semibold mt-1 max-w-xl leading-tight">
          Your next &ldquo;New This Week&rdquo; digest arrives {countdown(next)}
        </h1>
        <p className="text-white/80 mt-2">📅 {nextText} · on Telegram</p>
        <div className="flex flex-wrap items-center gap-2 mt-4 text-sm">
          {profile.chat_id
            ? <span className="bg-white/15 rounded-full px-3 py-1">✅ Telegram connected</span>
            : <Link href="/setup" className="bg-accent rounded-full px-3 py-1 font-medium">⚠️ Connect Telegram first</Link>}
          <span className="bg-white/15 rounded-full px-3 py-1">{profile.providers.map((p) => PROVIDERS[p]?.name ?? p).join(" · ")}</span>
        </div>
        <div className="flex flex-wrap gap-2 mt-6">
          <form action={previewNow}>
            <SubmitButton tone="secondary" pendingText="Finding this week's releases… (≈1 min)">👀 Preview this week</SubmitButton>
          </form>
          <form action={sendNow}>
            <SubmitButton pendingText="Sending to Telegram… (≈1 min)" confirm="Send this week's digest to Telegram right now? Titles already sent won't be repeated.">
              📨 Send to Telegram now
            </SubmitButton>
          </form>
        </div>
        <p className="text-xs text-white/60 mt-2">Preview shows the picks here without messaging you. Nothing is ever sent twice.</p>
      </section>

      {/* Latest picks */}
      <Card
        title={shown ? <>🍿 {last ? "Last digest" : "Latest preview"} · {istDay(shown.window_start)} – {istDay(shown.window_end)}</> : "🍿 This week's picks"}
        action={shown && <Link href={`/runs/${shown.id}`} className="text-sm text-accent font-medium hover:underline">See all {items.length} →</Link>}>
        {!shown ? (
          <Empty>No digest yet. Click <b>Preview this week</b> above to see what&apos;s new on your apps.</Empty>
        ) : watch.length === 0 ? (
          <Empty icon="😴">Nothing worth watching that week{items.length ? ` (${items.length} titles checked, all skips)` : ""}.</Empty>
        ) : (
          <>
            <p className="text-sm text-muted -mt-2 mb-4">
              <b className="text-ink">{watch.length} worth watching</b> out of {items.length} that matched your taste
              {shown.found ? ` (${shown.found} new titles checked)` : ""}.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {watch.map((it) => <PickCard key={it.id} it={it} />)}
            </div>
          </>
        )}
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon="📨" label="Digests sent" value={t.sent} />
        <Stat icon="🎬" label="Titles recommended" value={t.delivered} sub="never repeated" />
        <Stat icon="✅" label="You're watching" value={t.watching} sub={tapped ? `${t.not_for_me} marked "not for me"` : "tap ✅ in Telegram"} />
        <Stat icon="🤖" label="AI cost so far" value={inr(t.cost)} sub="Gemini Flash" />
      </div>

      {/* Taste */}
      <Card title="🎯 What I look for" action={<Link href="/settings" className="text-sm text-accent font-medium hover:underline">Edit</Link>}>
        <div className="flex flex-wrap gap-2">
          {profile.genres.map((g) => <span key={g} className="bg-accent-soft text-ink rounded-full px-3 py-1 text-sm">{GENRES[g]?.label ?? g}</span>)}
          {profile.languages.map((l) => <span key={l} className="bg-stone-100 rounded-full px-3 py-1 text-sm">{LANGUAGES[l] ?? l}</span>)}
        </div>
        {profile.notes && <p className="text-sm text-muted mt-3">📝 {profile.notes}</p>}
      </Card>
    </div>
  );
}
