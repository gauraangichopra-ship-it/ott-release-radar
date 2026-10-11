import "server-only";
import { query, one, maybeOne } from "./db";
import type { Profile } from "./prefs";

// Dates are India dates (YYYY-MM-DD): "this week" means this week in India.
export function istToday(now = new Date()): string {
  return new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Next Friday 18:00 IST from now.
export function nextFridayRun(now = new Date()): Date {
  const ist = new Date(now.getTime() + 330 * 60_000);
  const daysAhead = (5 - ist.getUTCDay() + 7) % 7;
  const target = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + daysAhead, 18, 0) - 330 * 60_000);
  return target <= now ? new Date(target.getTime() + 7 * 86_400_000) : target;
}

export async function getProfile(): Promise<Profile> {
  const row = await one<Profile & { chat_id: string | null }>(
    "select genres, languages, providers, never_show, notes, chat_id::text as chat_id from profile where id = 1",
  );
  return row;
}

export type Run = {
  id: number;
  trigger: string;
  status: string;
  window_start: string;
  window_end: string;
  started_at: Date;
  finished_at: Date | null;
  found: number;
  kept: number;
  drops: Record<string, number>;
  watch_count: number;
  skip_count: number;
  ai_failed: number;
  tokens_in: number;
  tokens_out: number;
  cost_inr: number;
  model: string | null;
  error: string | null;
};

const RUN_COLS = `id, trigger, status, to_char(window_start, 'YYYY-MM-DD') as window_start, to_char(window_end, 'YYYY-MM-DD') as window_end,
  started_at, finished_at, found, kept, drops, watch_count, skip_count, ai_failed, tokens_in, tokens_out, cost_inr, model, error`;

export function listRuns(limit = 30) {
  return query<Run>(`select ${RUN_COLS} from runs order by id desc limit $1`, [limit]);
}

export function getRun(id: number) {
  return maybeOne<Run>(`select ${RUN_COLS} from runs where id = $1`, [id]);
}

export type Item = {
  id: number;
  media_type: string;
  tmdb_id: number;
  title: string;
  year: string | null;
  platforms: string[];
  label: "released" | "new_on_app";
  genres: string[];
  language: string;
  length_text: string | null;
  overview: string | null;
  synopsis: string | null;
  verdict: "WATCH" | "SKIP" | null;
  score: number | null;
  reason: string | null;
  delivered: boolean;
  feedback: string | null;
  poster_path: string | null;
};

export function runItems(runId: number) {
  return query<Item>(
    `select id, media_type, tmdb_id, title, year, platforms, label, genres, language, length_text, overview, synopsis,
            verdict, score, reason, delivered, feedback, poster_path
     from items where run_id = $1
     order by case verdict when 'WATCH' then 0 when 'SKIP' then 1 else 2 end, score desc nulls last, title`,
    [runId],
  );
}

export async function latestDelivered() {
  return maybeOne<Run>(`select ${RUN_COLS} from runs where status in ('sent','empty') order by id desc limit 1`);
}

export async function totals() {
  return one<{ runs: number; sent: number; delivered: number; watching: number; not_for_me: number; cost: number; snapshot: number }>(
    `select (select count(*)::int from runs) as runs,
            (select count(*)::int from runs where status in ('sent','empty')) as sent,
            (select count(*)::int from items where delivered) as delivered,
            (select count(*)::int from items where feedback = 'watching') as watching,
            (select count(*)::int from items where feedback = 'not_for_me') as not_for_me,
            (select coalesce(sum(cost_inr), 0)::float from runs) as cost,
            (select count(*)::int from catalogue) as snapshot`,
  );
}
