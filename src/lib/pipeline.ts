import "server-only";
import { query, one } from "./db";
import { env } from "./env";
import { judgeBatch, profileText, type JudgeInput, type Judgement, type TasteHistory } from "./judge";
import { canonicalProvider, genreIds, matchedGenres, PROVIDERS, TMDB_GENRE_NAMES, type Profile } from "./prefs";
import { details, discover, indiaProviders, keywordNames, mapLimit, type Details, type DiscoverHit, type Media } from "./tmdb";
import { buildDigest, type DigestItem } from "./digest";
import { sendMessage } from "./telegram";
import { getProfile, istToday, addDays } from "./queries";

export type Trigger = "cron" | "manual" | "preview" | "telegram";

type Candidate = {
  media: Media;
  id: number;
  released: boolean;      // came from a "released in the window" query
  airedOnly: boolean;     // TV that only matched "an episode aired this week"
  newOn: Set<number>;     // providers whose catalogue gained it since last snapshot
};

type Kept = {
  media: Media;
  id: number;
  title: string;
  year: string | null;
  platforms: string[];
  label: "released" | "new_on_app";
  genres: string[];
  matched: string[];
  language: string;
  lengthText: string | null;
  overview: string;
  d: Details;
  j: Judgement | null;
};

const KIDS = 10762, FAMILY = 10751, ANIMATION = 16;

const DROP = {
  provider: "Not streaming on your apps in India",
  language: "Not in your languages",
  genre: "None of your genres",
  weekly: "Old show, only a new weekly episode",
  never: "Matched a never-show word",
  sent: "Already in an earlier digest",
  date: "Release date outside this week",
  kids: "Kids / family title",
} as const;

export async function runRadar(trigger: Trigger): Promise<{ runId: number; status: string; error?: string }> {
  const send = trigger !== "preview";
  const end = istToday();
  const start = addDays(end, -6); // 7 days inclusive: Saturday → Friday on the cron run
  const profile = await getProfile();
  const run = await one<{ id: number }>(
    "insert into runs (trigger, window_start, window_end) values ($1, $2, $3) returning id",
    [trigger, start, end],
  );

  try {
    if (send && !profile.chat_id) throw new Error("No Telegram chat yet: Naman needs to send /start to the bot.");
    const drops: Record<string, number> = {};
    const drop = (r: keyof typeof DROP) => (drops[DROP[r]] = (drops[DROP[r]] ?? 0) + 1);

    // ── 2. Fetch this week's candidates from TMDB ────────────────────────────
    const cands = new Map<string, Candidate>();
    const add = (media: Media, hits: DiscoverHit[], patch: Partial<Candidate>) => {
      for (const h of hits) {
        const key = `${media}:${h.id}`;
        const c = cands.get(key) ?? { media, id: h.id, released: false, airedOnly: true, newOn: new Set<number>() };
        if (patch.released) c.released = true;
        if (patch.airedOnly === false) c.airedOnly = false;
        cands.set(key, c);
      }
    };
    const providerParam = profile.providers.flatMap((p) => PROVIDERS[p]?.aliases ?? [p]).join("|");
    const base = {
      watch_region: "IN",
      with_watch_providers: providerParam,
      with_watch_monetization_types: "flatrate",
      with_original_language: profile.languages.join("|"),
      sort_by: "popularity.desc",
    };

    const [digital, premiered, newShows, aired] = await Promise.all([
      // Movies whose India digital (OTT) release fell in the window.
      discover("movie", { ...base, region: "IN", with_release_type: "4|6", "release_date.gte": start, "release_date.lte": end }),
      // Direct-to-streaming films: world premiere in the window.
      discover("movie", { ...base, "primary_release_date.gte": start, "primary_release_date.lte": end }),
      discover("tv", { ...base, "first_air_date.gte": start, "first_air_date.lte": end }),
      // Shows with any episode this week; code keeps only new seasons.
      discover("tv", { ...base, "air_date.gte": start, "air_date.lte": end }, 10),
    ]);
    add("movie", digital, { released: true, airedOnly: false });
    add("movie", premiered, { released: true, airedOnly: false });
    add("tv", newShows, { released: true, airedOnly: false });
    add("tv", aired, { released: true });

    // ── The Cut's workaround: diff each app's catalogue against last snapshot ─
    const snapshot = await catalogueDiff(profile, base, end);
    for (const n of snapshot.newTitles) {
      const key = `${n.media}:${n.id}`;
      const c = cands.get(key) ?? { media: n.media, id: n.id, released: false, airedOnly: false, newOn: new Set<number>() };
      c.newOn.add(n.provider);
      if (!c.released) c.airedOnly = false;
      cands.set(key, c);
    }

    const all = [...cands.values()];
    const found = all.length;

    // ── 3–4. Enrich and filter in code (rules, not AI) ───────────────────────
    const sent = new Set(
      (await query<{ k: string }>("select media_type || ':' || tmdb_id as k from items where delivered")).map((r) => r.k),
    );
    const never = profile.never_show.map((w) => w.toLowerCase()).filter(Boolean);
    const kept: Kept[] = [];

    await mapLimit(all, 6, async (c) => {
      if (sent.has(`${c.media}:${c.id}`)) return drop("sent");
      const d = await details(c.media, c.id);
      const onApps = [...new Set(indiaProviders(d).map((p) => canonicalProvider(p, profile.providers)).filter((p): p is number => p !== null))];
      if (!onApps.length) return drop("provider");
      if (!profile.languages.includes(d.original_language)) return drop("language");
      const ids = d.genres.map((g) => g.id);
      // Naman's profile is adult genres; cartoons tagged Sci-Fi & Fantasy aren't what he means.
      if (ids.includes(KIDS) || (ids.includes(FAMILY) && ids.includes(ANIMATION))) return drop("kids");
      const matched = matchedGenres(profile, c.media, ids);
      if (!matched.length) return drop("genre");

      const title = d.title ?? d.name ?? "Untitled";
      const haystack = `${title} ${d.overview} ${keywordNames(d).join(" ")}`.toLowerCase();
      if (never.some((w) => haystack.includes(w))) return drop("never");

      let lengthText: string | null = null;
      const released = c.released;
      if (c.media === "movie") {
        lengthText = d.runtime ? `${Math.floor(d.runtime / 60)}h ${d.runtime % 60}m`.replace(/^0h /, "") : null;
      } else {
        const seasons = (d.seasons ?? []).filter((s) => s.season_number > 0 && s.air_date);
        const fresh = seasons.find((s) => s.air_date! >= start && s.air_date! <= end);
        const isNewShow = !!d.first_air_date && d.first_air_date >= start && d.first_air_date <= end;
        if (c.airedOnly && !fresh && !isNewShow) return drop("weekly");
        const s = fresh ?? seasons.at(-1);
        lengthText = s
          ? `${s.season_number > 1 || (d.number_of_seasons ?? 1) > 1 ? `Season ${s.season_number} · ` : ""}${s.episode_count} episode${s.episode_count === 1 ? "" : "s"}`
          : null;
      }
      if (!released && !c.newOn.size) return drop("date");

      const platforms = (c.newOn.size && !released ? [...c.newOn] : onApps).map((p) => PROVIDERS[p]?.name ?? String(p));
      const date = d.release_date ?? d.first_air_date ?? "";
      kept.push({
        media: c.media,
        id: c.id,
        title,
        year: date ? date.slice(0, 4) : null,
        platforms,
        label: released ? "released" : "new_on_app",
        genres: d.genres.map((g) => TMDB_GENRE_NAMES[g.id] ?? g.name).slice(0, 4),
        matched,
        language: d.original_language,
        lengthText,
        overview: d.overview ?? "",
        d,
        j: null,
      });
    });

    // ── 5. Gemini judges fit, in batches ─────────────────────────────────────
    const history = await tasteHistory();
    const ptext = profileText(profile, history);
    let tokensIn = 0, tokensOut = 0, aiFailed = 0;
    let model: string | null = null;
    let lastAiError: string | null = null;
    for (let i = 0; i < kept.length; i += BATCH) {
      const batch = kept.slice(i, i + BATCH);
      try {
        const r = await judgeBatch(batch.map(judgeInput), ptext);
        batch.forEach((k, j) => (k.j = r.data[j]));
        tokensIn += r.tokensIn;
        tokensOut += r.tokensOut;
        model = r.model;
      } catch (e) {
        lastAiError = (e as Error).message;
      }
    }
    aiFailed = kept.filter((k) => !k.j).length;

    // WATCH first (best fit on top), then SKIP, then anything Gemini couldn't rate.
    const rank = (k: Kept) => (k.j?.verdict === "WATCH" ? 0 : k.j?.verdict === "SKIP" ? 1 : 2);
    kept.sort((a, b) => rank(a) - rank(b) || (b.j?.score ?? 0) - (a.j?.score ?? 0) || a.title.localeCompare(b.title));

    // ── 6. Save, check & send ────────────────────────────────────────────────
    const items: DigestItem[] = [];
    for (const k of kept) {
      const row = await one<{ id: number }>(
        `insert into items (run_id, media_type, tmdb_id, title, year, platforms, label, genres, language, length_text, overview, synopsis, verdict, score, reason)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) returning id`,
        [run.id, k.media, k.id, k.title, k.year, k.platforms, k.label, k.genres, k.language, k.lengthText, k.overview,
         k.j?.synopsis ?? null, k.j?.verdict ?? null, k.j?.score ?? null, k.j?.reason ?? null],
      );
      items.push({
        id: row.id, title: k.title, year: k.year, platforms: k.platforms, label: k.label, genres: k.genres,
        language: k.language, length_text: k.lengthText, synopsis: k.j?.synopsis ?? null, overview: k.overview,
        verdict: k.j?.verdict ?? null, reason: k.j?.reason ?? null, feedback: null,
      });
    }

    const platformNames = profile.providers.map((p) => PROVIDERS[p]?.name ?? String(p));
    const chunks = buildDigest(items, start, end, platformNames);
    const messageIds: number[] = [];
    let shown = 0;
    if (send) {
      for (const c of chunks) {
        const msg = await sendMessage(profile.chat_id!, c.html, c.buttons.length ? c.buttons : undefined);
        messageIds.push(msg.message_id);
        for (const id of c.itemIds) {
          await query("update items set delivered = true, message_id = $1, position = $2 where id = $3", [msg.message_id, ++shown, id]);
        }
      }
      // Collapsed "also skipped" titles were mentioned too: never repeat them.
      await query("update items set delivered = true where run_id = $1", [run.id]);
      await snapshot.save();
    }

    const watch = kept.filter((k) => k.j?.verdict === "WATCH").length;
    const skip = kept.filter((k) => k.j?.verdict === "SKIP").length;
    const status = send ? (kept.length ? "sent" : "empty") : "previewed";
    await query(
      `update runs set status=$2, finished_at=now(), found=$3, kept=$4, drops=$5, watch_count=$6, skip_count=$7,
         ai_failed=$8, tokens_in=$9, tokens_out=$10, cost_inr=$11, model=$12, message_ids=$13, error=$14 where id=$1`,
      [run.id, status, found, kept.length, JSON.stringify(drops), watch, skip, aiFailed, tokensIn, tokensOut,
       aiCostInr(tokensIn, tokensOut), model, messageIds, aiFailed ? `Gemini failed on ${aiFailed} title(s): ${lastAiError}` : null],
    );
    return { runId: run.id, status };
  } catch (e) {
    const error = (e as Error).message;
    await query("update runs set status='failed', finished_at=now(), error=$2 where id=$1", [run.id, error]);
    return { runId: run.id, status: "failed", error };
  }
}

const BATCH = 10;

function judgeInput(k: Kept): JudgeInput {
  return {
    title: k.title,
    media: k.media,
    year: k.year,
    language: k.language,
    genres: k.genres,
    matched: k.matched,
    overview: k.overview,
    keywords: keywordNames(k.d),
    companies: (k.d.production_companies ?? []).map((c) => c.name),
    lengthText: k.lengthText,
    rating: k.d.vote_count && k.d.vote_count >= 20 ? `${k.d.vote_average?.toFixed(1)}/10 from ${k.d.vote_count} votes` : null,
  };
}

export function aiCostInr(tokensIn: number, tokensOut: number): number {
  const usd = (tokensIn * env.geminiPriceInPerM + tokensOut * env.geminiPriceOutPerM) / 1e6;
  return Math.round(usd * env.usdInr * 10000) / 10000;
}

// Last 8 weeks of taps, fed to Gemini so next Friday's verdicts learn from them.
async function tasteHistory(): Promise<TasteHistory> {
  const rows = await query<{ title: string; genres: string[]; feedback: string }>(
    `select title, genres, feedback from items
     where feedback is not null and feedback_at > now() - interval '56 days'
     order by feedback_at desc limit 30`,
  );
  const fmt = (r: { title: string; genres: string[] }) => `${r.title} (${r.genres.join(", ")})`;
  return {
    liked: rows.filter((r) => r.feedback === "watching").map(fmt),
    disliked: rows.filter((r) => r.feedback === "not_for_me").map(fmt),
  };
}

// Pulls each app's current catalogue (his languages + genres, last 12 months)
// and compares it with what we saw last time. The first run is a baseline:
// nothing is "new" until there's a previous snapshot to compare against.
async function catalogueDiff(profile: Profile, base: Record<string, string>, today: string) {
  const since = addDays(today, -365);
  const seen: { media: Media; id: number; provider: number }[] = [];
  const newTitles: typeof seen = [];

  const jobs = profile.providers.flatMap((provider) =>
    (["movie", "tv"] as const).filter((media) => genreIds(profile, media).length).map((media) => ({ provider, media })),
  );
  await Promise.all(jobs.map(async ({ provider, media }) => {
    const [hits, prev] = await Promise.all([
      discover(media, {
        ...base,
        with_watch_providers: (PROVIDERS[provider]?.aliases ?? [provider]).join("|"),
        with_genres: genreIds(profile, media).join("|"),
        ...(media === "movie" ? { "primary_release_date.gte": since } : { "air_date.gte": since }),
      }, 25),
      query<{ tmdb_id: number }>("select tmdb_id from catalogue where provider_id = $1 and media_type = $2", [provider, media]),
    ]);
    const before = new Set(prev.map((r) => r.tmdb_id));
    for (const h of hits) {
      seen.push({ media, id: h.id, provider });
      if (before.size && !before.has(h.id)) newTitles.push({ media, id: h.id, provider });
    }
  }));

  return {
    newTitles,
    // Only real sends move the snapshot forward, so previews never "use up" a new title.
    async save() {
      for (let i = 0; i < seen.length; i += 500) {
        const batch = seen.slice(i, i + 500);
        await query(
          `insert into catalogue (media_type, tmdb_id, provider_id, first_seen, last_seen)
           select m, t, p, $4::date, $4::date from unnest($1::text[], $2::int[], $3::int[]) as x(m, t, p)
           on conflict (media_type, tmdb_id, provider_id) do update set last_seen = excluded.last_seen`,
          [batch.map((s) => s.media), batch.map((s) => s.id), batch.map((s) => s.provider), today],
        );
      }
    },
  };
}
