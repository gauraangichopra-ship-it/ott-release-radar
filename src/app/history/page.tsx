import Link from "next/link";
import { Card, Empty, StatusPill, inr, istDay, istTime } from "@/components/ui";
import { listRuns } from "@/lib/queries";

export const dynamic = "force-dynamic";

const TRIGGER: Record<string, string> = { cron: "Friday schedule", manual: "Sent from dashboard", telegram: "/now in Telegram", preview: "Preview" };

export default async function History() {
  const runs = await listRuns(50);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">History</h1>
        <p className="text-sm text-muted mt-1">Every digest and preview. Open one to see each title and why it was picked or skipped.</p>
      </div>
      <Card>
        {runs.length === 0 ? <Empty>No runs yet.</Empty> : (
          <ul className="divide-y divide-line -my-2">
            {runs.map((r) => (
              <li key={r.id}>
                <Link href={`/runs/${r.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:bg-page -mx-2 px-2 rounded-lg">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">Week of {istDay(r.window_start)} – {istDay(r.window_end)}</div>
                    <div className="text-xs text-muted">{TRIGGER[r.trigger] ?? r.trigger} · {istTime(r.started_at)}</div>
                  </div>
                  <div className="text-sm text-muted">
                    {r.status === "failed" ? "—" : <><b className="text-ok">{r.watch_count} watch</b> · {r.skip_count} skip</>}
                  </div>
                  <StatusPill status={r.status} />
                  <div className="text-xs text-muted w-14 text-right tabular-nums">{inr(r.cost_inr)}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
