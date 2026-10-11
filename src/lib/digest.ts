import { LANGUAGES } from "./prefs";
import { esc, type Button } from "./telegram";

// Telegram rejects messages over 4,096 characters; leave room for HTML entities.
const LIMIT = 3800;

export type DigestItem = {
  id: number;
  title: string;
  year: string | null;
  platforms: string[];
  label: "released" | "new_on_app";
  genres: string[];
  language: string;
  length_text: string | null;
  synopsis: string | null;
  overview: string | null;
  verdict: "WATCH" | "SKIP" | null;
  reason: string | null;
  feedback: string | null;
};

export type DigestChunk = { html: string; buttons: Button[][]; itemIds: number[] };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function shortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

export function labelText(it: Pick<DigestItem, "label" | "platforms">): string {
  return it.label === "released" ? "Released this week" : `New on ${it.platforms.join(" & ")}`;
}

function entry(n: number, it: DigestItem): string {
  const synopsis = it.synopsis ?? clipOverview(it.overview);
  const lines = [
    `<b>${n}. ${esc(it.title)}</b>${it.year ? ` (${it.year})` : ""}`,
    `📺 ${esc(it.platforms.join(" · "))} · <i>${esc(labelText(it))}</i>`,
    `🏷 ${esc([...it.genres, LANGUAGES[it.language] ?? it.language, it.length_text].filter(Boolean).join(" · "))}`,
    esc(synopsis),
  ];
  if (it.reason) lines.push(`💡 ${esc(it.reason)}`);
  return lines.join("\n");
}

// Fallback when Gemini is down: first two sentences of TMDB's own overview.
function clipOverview(o: string | null): string {
  if (!o) return "No plot summary on TMDB yet.";
  const sentences = o.match(/[^.!?]+[.!?]+/g) ?? [o];
  return sentences.slice(0, 2).join(" ").trim().slice(0, 240);
}

export function itemButtons(n: number, it: Pick<DigestItem, "id" | "title" | "feedback">): Button[] {
  const name = it.title.length > 22 ? `${it.title.slice(0, 21)}…` : it.title;
  const w = it.feedback === "watching", x = it.feedback === "not_for_me";
  return [
    { text: `${w ? "✅" : "▫️"} ${n}. ${name}`, callback_data: `fb:${it.id}:w` },
    { text: x ? "🚫 Not for me" : "Not for me", callback_data: `fb:${it.id}:n` },
  ];
}

// Full SKIP entries shown; the rest collapse into one "also skipped" line so the
// digest stays a 1-minute read on a week with lots of network-TV season premieres.
export const MAX_FULL_SKIPS = 5;

// Builds the Friday message(s). Items must already be sorted (WATCH, SKIP, unrated).
export function buildDigest(items: DigestItem[], windowStart: string, windowEnd: string, platforms: string[]): DigestChunk[] {
  const watch = items.filter((i) => i.verdict === "WATCH").length;
  const skip = items.filter((i) => i.verdict === "SKIP").length;
  const header =
    `🍿 <b>New This Week</b> · ${shortDate(windowStart)} – ${shortDate(windowEnd)}\n` +
    `${esc(platforms.join(", "))} · India\n` +
    (items.length
      ? `<b>${watch} worth watching</b> · ${skip} to skip${items.length - watch - skip ? ` · ${items.length - watch - skip} unrated` : ""}`
      : `Nothing new matched your genres and languages this week. Enjoy the backlog 🙂`);

  if (!items.length) return [{ html: header, buttons: [], itemIds: [] }];

  const sections: { title: string; list: DigestItem[] }[] = [
    { title: "✅ <b>WATCH</b>", list: items.filter((i) => i.verdict === "WATCH") },
    { title: "⏭ <b>SKIP</b> <i>(closest calls)</i>", list: items.filter((i) => i.verdict === "SKIP").slice(0, MAX_FULL_SKIPS) },
    { title: "🤷 <b>NO VERDICT</b> <i>(AI was unavailable)</i>", list: items.filter((i) => !i.verdict) },
  ];

  const chunks: DigestChunk[] = [];
  let cur: DigestChunk = { html: header, buttons: [], itemIds: [] };
  let n = 0;
  for (const s of sections) {
    if (!s.list.length) continue;
    let heading = `\n\n${s.title}`;
    for (const it of s.list) {
      n++;
      const block = `${heading}\n\n${entry(n, it)}`;
      if (cur.html.length + block.length > LIMIT && cur.itemIds.length) {
        chunks.push(cur);
        cur = { html: `${s.title}${heading ? "" : " <i>(cont.)</i>"}\n\n${entry(n, it)}`, buttons: [], itemIds: [] };
      } else {
        cur.html += block;
      }
      heading = "";
      cur.buttons.push(itemButtons(n, it));
      cur.itemIds.push(it.id);
    }
  }
  chunks.push(cur);
  const rest = items.filter((i) => i.verdict === "SKIP").slice(MAX_FULL_SKIPS);
  if (rest.length) {
    chunks[chunks.length - 1].html += `\n\n<b>Also skipped:</b> ${esc(rest.map((i) => i.title).join(", "))}`;
  }
  chunks[chunks.length - 1].html += `\n\n<i>Tap a title you'll watch, or "Not for me". Next week's picks learn from it.</i>`;
  return chunks;
}
