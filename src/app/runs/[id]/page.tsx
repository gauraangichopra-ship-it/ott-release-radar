import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Empty, Pill, Stat, StatusPill, inr, istTime } from "@/components/ui";
import { getRun, runItems } from "@/lib/queries";
import { LANGUAGES } from "@/lib/prefs";
import { labelText } from "@/lib/digest";

export const dynamic = "force-dynamic";

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const run = Number.isFinite(id) ? await getRun(id) : null;
  if (!run) notFound();
  const items = await runItems(id);
  const drops = Object.entries(run.drops).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-muted underline">← Dashboard</Link>
        <h1 className="text-2xl font-semibold mt-1 flex items-center gap-3">
          Week of {run.window_start} → {run.window_end} <StatusPill status={run.status} />
        </h1>
        <p className="text-sm text-muted mt-1">
          {run.trigger} run · {istTime(run.started_at)}
          {run.status === "previewed" && " · preview only: nothing was sent and the snapshot did not move"}
        </p>
        {run.error && <p className="mt-2 text-sm text-bad bg-red-50 border border-red-200 rounded p-2">{run.error}</p>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Found on TMDB" value={run.found} sub="released or new this week" />
        <Stat label="Kept by code filter" value={run.kept} sub={`${run.found - run.kept} dropped`} />
        <Stat label="WATCH / SKIP" value={`${run.watch_count} / ${run.skip_count}`} sub={run.ai_failed ? `${run.ai_failed} unrated` : "all rated"} />
        <Stat label="Gemini cost" value={inr(run.cost_inr, 3)} sub={`${run.tokens_in + run.tokens_out} tokens · ${run.model ?? "—"}`} />
      </div>

      <Card title="What the digest contains">
        {items.length === 0 ? <Empty>Nothing matched this week.</Empty> : (
          <ol className="space-y-4">
            {items.map((it, n) => (
              <li key={it.id} className="border-b border-line last:border-0 pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted tabular-nums">{n + 1}.</span>
                  {it.verdict === "WATCH" ? <Pill tone="ok">WATCH</Pill> : it.verdict === "SKIP" ? <Pill tone="bad">SKIP</Pill> : <Pill>NO VERDICT</Pill>}
                  <a href={`https://www.themoviedb.org/${it.media_type}/${it.tmdb_id}`} target="_blank" className="font-semibold hover:underline">{it.title}</a>
                  {it.year && <span className="text-muted">({it.year})</span>}
                  <Pill tone="info">{labelText(it)}</Pill>
                  {it.score != null && <span className="text-xs text-muted">fit {it.score}/100</span>}
                  {it.feedback && <Pill tone={it.feedback === "watching" ? "ok" : "neutral"}>{it.feedback === "watching" ? "✅ Watching" : "Not for me"}</Pill>}
                </div>
                <div className="text-sm text-muted mt-1">
                  {[it.platforms.join(" · "), ...it.genres, LANGUAGES[it.language] ?? it.language, it.length_text].filter(Boolean).join(" · ")}
                </div>
                <p className="text-sm mt-1 whitespace-pre-line">{it.synopsis ?? it.overview}</p>
                {it.reason && <p className="text-sm mt-1">💡 {it.reason}</p>}
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card title="Dropped by the code filter (not AI)">
        {drops.length === 0 ? <Empty>Nothing dropped.</Empty> : (
          <table className="text-sm">
            <tbody>
              {drops.map(([reason, count]) => (
                <tr key={reason}><td className="pr-6 py-1">{reason}</td><td className="tabular-nums text-right">{count}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
