import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Empty, PickCard, StatusPill, TitleRow, inr, istDay, istTime } from "@/components/ui";
import { getRun, runItems } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const run = Number.isFinite(id) ? await getRun(id) : null;
  if (!run) notFound();
  const items = await runItems(id);
  const watch = items.filter((i) => i.verdict === "WATCH");
  const skip = items.filter((i) => i.verdict === "SKIP");
  const unrated = items.filter((i) => !i.verdict);
  const drops = Object.entries(run.drops).sort((a, b) => b[1] - a[1]);
  const dropped = run.found - run.kept;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/history" className="text-sm text-muted hover:text-ink">← History</Link>
        <div className="flex flex-wrap items-center gap-3 mt-1">
          <h1 className="text-2xl font-semibold">Week of {istDay(run.window_start)} – {istDay(run.window_end)}</h1>
          <StatusPill status={run.status} />
        </div>
        <p className="text-muted mt-2">
          I checked <b className="text-ink">{run.found}</b> new titles on your apps, <b className="text-ink">{run.kept}</b> matched your genres and languages,
          and <b className="text-ok">{watch.length}</b> {watch.length === 1 ? "is" : "are"} worth watching.
        </p>
        {run.status === "previewed" && <p className="text-sm mt-2 bg-sky-50 border border-sky-200 text-sky-900 rounded-xl px-3 py-2">👀 This was a preview. Nothing was sent to Telegram.</p>}
        {run.error && <p className="text-sm mt-2 bg-bad-soft border border-red-200 text-bad rounded-xl px-3 py-2">⚠️ {run.error}</p>}
      </div>

      <Card title={`✅ Worth watching (${watch.length})`}>
        {watch.length === 0 ? <Empty icon="😴">Nothing this week was a strong fit.</Empty> : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{watch.map((it) => <PickCard key={it.id} it={it} />)}</div>
        )}
      </Card>

      {skip.length > 0 && (
        <Card title={`⏭ Skipped (${skip.length})`}>
          <p className="text-sm text-muted -mt-2 mb-1">Matched your genres or languages, but not a great fit. Best of the rest first.</p>
          <ul>{skip.map((it) => <TitleRow key={it.id} it={it} />)}</ul>
        </Card>
      )}

      {unrated.length > 0 && (
        <Card title={`🤷 No verdict (${unrated.length})`}>
          <p className="text-sm text-muted -mt-2 mb-1">The AI was unavailable for these, so they were sent with TMDB&apos;s own summary.</p>
          <ul>{unrated.map((it) => <TitleRow key={it.id} it={it} />)}</ul>
        </Card>
      )}

      <details className="bg-card border border-line rounded-2xl p-5 group">
        <summary className="font-semibold cursor-pointer list-none flex items-center justify-between">
          <span>🔍 Why {dropped} other titles were left out</span>
          <span className="text-muted text-sm group-open:rotate-180 transition">▾</span>
        </summary>
        <p className="text-sm text-muted mt-3">These are simple rules in code, not AI, so every drop has a clear reason.</p>
        <ul className="mt-3 space-y-2">
          {drops.map(([reason, count]) => (
            <li key={reason} className="flex items-center gap-3 text-sm">
              <div className="flex-1">{reason}</div>
              <div className="w-32 h-2 bg-stone-100 rounded-full overflow-hidden"><div className="h-full bg-stone-400" style={{ width: `${Math.round((count / Math.max(1, dropped)) * 100)}%` }} /></div>
              <div className="w-8 text-right tabular-nums">{count}</div>
            </li>
          ))}
        </ul>
        <div className="text-xs text-muted mt-4 pt-3 border-t border-line">
          Ran {istTime(run.started_at)} · AI: {run.model ?? "—"} · {run.tokens_in + run.tokens_out} tokens · cost {inr(run.cost_inr, 3)}
        </div>
      </details>
    </div>
  );
}
