import Link from "next/link";
import { previewNow, sendNow } from "./actions";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, Empty, Stat, StatusPill, inr, istTime } from "@/components/ui";
import { getProfile, listRuns, nextFridayRun, totals } from "@/lib/queries";
import { GENRES, LANGUAGES, PROVIDERS } from "@/lib/prefs";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function Dashboard() {
  const [profile, runs, t] = await Promise.all([getProfile(), listRuns(), totals()]);
  const tapped = t.watching + t.not_for_me;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">New This Week, every Friday</h1>
          <p className="text-sm text-muted mt-1">
            Next digest: <b className="text-ink">{istTime(nextFridayRun())}</b> on Telegram
            {profile.chat_id ? "" : <> · <Link href="/setup" className="text-bad underline">Telegram not connected yet</Link></>}
          </p>
        </div>
        <div className="flex gap-2">
          <form action={previewNow}><SubmitButton tone="secondary">Preview this week</SubmitButton></form>
          <form action={sendNow}><SubmitButton>Send digest now</SubmitButton></form>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Digests sent" value={t.sent} sub={`${t.runs} runs incl. previews`} />
        <Stat label="Titles delivered" value={t.delivered} sub="never repeated" />
        <Stat label="Watching taps" value={tapped ? `${t.watching}/${tapped}` : "—"} sub={`${t.not_for_me} "not for me"`} />
        <Stat label="Gemini cost to date" value={inr(t.cost)} sub={`snapshot: ${t.snapshot} titles tracked`} />
      </div>

      <Card title="Taste profile">
        <div className="text-sm flex flex-wrap gap-x-6 gap-y-1">
          <span><span className="text-muted">Genres:</span> {profile.genres.map((g) => GENRES[g]?.label ?? g).join(", ")}</span>
          <span><span className="text-muted">Languages:</span> {profile.languages.map((l) => LANGUAGES[l] ?? l).join(", ")}</span>
          <span><span className="text-muted">Apps:</span> {profile.providers.map((p) => PROVIDERS[p]?.name ?? p).join(", ")}</span>
          <Link href="/settings" className="underline text-muted">edit</Link>
        </div>
      </Card>

      <Card title="Runs">
        {runs.length === 0 ? (
          <Empty>No runs yet. Click <b>Preview this week</b> to see what this Friday&apos;s digest would contain.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted">
                <tr className="border-b border-line">
                  <th className="py-2 pr-3">When</th><th className="pr-3">Trigger</th><th className="pr-3">Status</th>
                  <th className="pr-3">Week</th><th className="pr-3 text-right">Found → kept</th>
                  <th className="pr-3 text-right">Watch / skip</th><th className="text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-b border-line last:border-0 hover:bg-page">
                    <td className="py-2 pr-3"><Link href={`/runs/${r.id}`} className="underline">{istTime(r.started_at)}</Link></td>
                    <td className="pr-3">{r.trigger}</td>
                    <td className="pr-3"><StatusPill status={r.status} /></td>
                    <td className="pr-3 whitespace-nowrap">{r.window_start} → {r.window_end}</td>
                    <td className="pr-3 text-right tabular-nums">{r.found} → {r.kept}</td>
                    <td className="pr-3 text-right tabular-nums">{r.watch_count} / {r.skip_count}</td>
                    <td className="text-right tabular-nums">{inr(r.cost_inr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
