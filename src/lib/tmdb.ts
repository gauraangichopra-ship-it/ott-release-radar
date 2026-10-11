import "server-only";
import { env, requireEnv } from "./env";

const BASE = "https://api.themoviedb.org/3";
export type Media = "movie" | "tv";

async function get<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  requireEnv("tmdbToken");
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${BASE}${path}?${qs}`, {
      headers: { authorization: `Bearer ${env.tmdbToken}`, accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (res.ok) return (await res.json()) as T;
    // TMDB rate-limits bursts with 429; back off briefly and retry.
    if ((res.status === 429 || res.status >= 500) && attempt < 3) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      continue;
    }
    if (res.status === 401) throw new Error("TMDB rejected the token. Check TMDB_READ_ACCESS_TOKEN.");
    throw new Error(`TMDB ${path} → ${res.status}`);
  }
}

export type DiscoverHit = {
  id: number;
  title?: string;
  name?: string;
  original_language: string;
  genre_ids: number[];
  release_date?: string;
  first_air_date?: string;
  overview: string;
};

type Page = { page: number; total_pages: number; results: DiscoverHit[] };

// Walks every page of a /discover query (TMDB caps at 500 pages; we cap lower).
export async function discover(media: Media, params: Record<string, string | number | undefined>, maxPages = 15): Promise<DiscoverHit[]> {
  const first = await get<Page>(`/discover/${media}`, { ...params, page: 1 });
  const last = Math.min(first.total_pages, maxPages);
  const pages = Array.from({ length: Math.max(0, last - 1) }, (_, i) => i + 2);
  const rest = await mapLimit(pages, 4, (p) => get<Page>(`/discover/${media}`, { ...params, page: p }));
  return [...first.results, ...rest.flatMap((r) => r.results)];
}

type ProviderBlock = { flatrate?: { provider_id: number; provider_name: string }[] };

export type Details = {
  id: number;
  title?: string;
  name?: string;
  original_language: string;
  overview: string;
  genres: { id: number; name: string }[];
  release_date?: string;
  first_air_date?: string;
  runtime?: number | null;
  episode_run_time?: number[];
  number_of_seasons?: number;
  seasons?: { season_number: number; air_date: string | null; episode_count: number; name: string }[];
  "watch/providers"?: { results: Record<string, ProviderBlock> };
  keywords?: { keywords?: { name: string }[]; results?: { name: string }[] };
  production_companies?: { name: string }[];
  vote_average?: number;
  vote_count?: number;
};

export function details(media: Media, id: number): Promise<Details> {
  return get<Details>(`/${media}/${id}`, { append_to_response: "watch/providers,keywords" });
}

// Streaming (subscription) provider ids for this title in India.
export function indiaProviders(d: Details): number[] {
  return (d["watch/providers"]?.results?.IN?.flatrate ?? []).map((p) => p.provider_id);
}

export function keywordNames(d: Details): string[] {
  return (d.keywords?.keywords ?? d.keywords?.results ?? []).map((k) => k.name);
}

// Runs fn over items with at most `limit` in flight (TMDB and Gemini both dislike bursts).
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
