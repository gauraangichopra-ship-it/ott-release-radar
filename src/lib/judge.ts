import "server-only";
import { Type, type Schema } from "@google/genai";
import { generateJson } from "./gemini";
import { GENRES, LANGUAGES, type Profile } from "./prefs";

export type Verdict = "WATCH" | "SKIP";

export type Judgement = {
  verdict: Verdict;
  score: number;
  reason: string;
  synopsis: string; // two lines, "\n"-separated
};

export type JudgeInput = {
  title: string;
  media: "movie" | "tv";
  year: string | null;
  language: string;
  genres: string[];
  matched: string[];
  overview: string;
  keywords: string[];
  companies: string[];
  lengthText: string | null;
  rating: string | null;
};

export type TasteHistory = { liked: string[]; disliked: string[] };

const ITEM: Schema = {
  type: Type.OBJECT,
  properties: {
    index: { type: Type.INTEGER, description: "The title's number from the list" },
    synopsis_line_1: { type: Type.STRING, description: "Max 18 words" },
    synopsis_line_2: { type: Type.STRING, description: "Max 18 words" },
    score: { type: Type.INTEGER, description: "0-100 fit with the viewer's taste" },
    verdict: { type: Type.STRING, enum: ["WATCH", "SKIP"] },
    reason: { type: Type.STRING, description: "One short sentence, max 20 words, addressed to the viewer" },
  },
  required: ["index", "synopsis_line_1", "synopsis_line_2", "score", "verdict", "reason"],
  propertyOrdering: ["index", "synopsis_line_1", "synopsis_line_2", "score", "verdict", "reason"],
};

const SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: { titles: { type: Type.ARRAY, items: ITEM } },
  required: ["titles"],
};

const SYSTEM = `You help one viewer, Naman, decide what to watch from this week's new OTT releases in India.
For EACH numbered title you return: a two-line synopsis, a 0-100 fit score, a WATCH or SKIP verdict, and a one-sentence reason.

Rules:
- The synopsis comes ONLY from the overview you are given. Never add plot, cast or facts from memory. If the overview is empty or vague, say so plainly in the synopsis (e.g. "TMDB has no plot summary yet.") rather than inventing one.
- No spoilers beyond what the overview says.
- Judge fit against the profile: his genres, his languages, his notes, and the titles he liked or rejected recently.
- "Indie drama" means a small, character-driven drama (festival films, small studios, personal stories), not a big studio melodrama or a long-running procedural. Use the overview, keywords and production companies to judge.
- WATCH when score >= 60, else SKIP.
- The reason must name the concrete match or mismatch ("Hindi crime thriller, your top genre" / "Studio romcom, none of your genres"). No hype words.`;

export function profileText(p: Profile, history: TasteHistory): string {
  const lines = [
    `Genres he watches: ${p.genres.map((g) => GENRES[g]?.label ?? g).join(", ")}`,
    `Languages: ${p.languages.map((l) => LANGUAGES[l] ?? l).join(", ")}`,
  ];
  if (p.notes.trim()) lines.push(`His own notes: ${p.notes.trim()}`);
  if (history.liked.length) lines.push(`Recently tapped "Watching": ${history.liked.join("; ")}`);
  if (history.disliked.length) lines.push(`Recently tapped "Not for me": ${history.disliked.join("; ")}`);
  return lines.join("\n");
}

function describe(n: number, t: JudgeInput): string {
  return `[${n}] ${t.title}${t.year ? ` (${t.year})` : ""}
Type: ${t.media === "movie" ? "Movie" : "TV series"} · Original language: ${LANGUAGES[t.language] ?? t.language} · Length: ${t.lengthText ?? "unknown"}
TMDB genres: ${t.genres.join(", ") || "none listed"} · Matches his genres: ${t.matched.join(", ") || "none"}
TMDB rating: ${t.rating ?? "not enough votes yet"}
Keywords: ${t.keywords.slice(0, 12).join(", ") || "none"}
Production companies: ${t.companies.slice(0, 4).join(", ") || "unknown"}
Overview: ${t.overview || "(empty)"}`;
}

// One Gemini call judges a whole batch: the free tier allows ~20 calls a day
// per model, so per-title calls would run out on a busy week.
export async function judgeBatch(inputs: JudgeInput[], profile: string) {
  const prompt = `PROFILE
${profile}

THIS WEEK'S TITLES (${inputs.length})

${inputs.map((t, i) => describe(i + 1, t)).join("\n\n")}

Return one entry per title, using its [number] as index.`;

  const res = await generateJson<{ titles: Raw[] }>({ system: SYSTEM, prompt, schema: SCHEMA, temperature: 0.2 });
  const out: (Judgement | null)[] = inputs.map(() => null);
  for (const raw of res.data.titles ?? []) {
    const i = Number(raw.index) - 1;
    if (i < 0 || i >= inputs.length || out[i]) continue;
    try {
      out[i] = validate(raw);
    } catch {
      // leave it unrated rather than trust a malformed answer
    }
  }
  return { ...res, data: out };
}

type Raw = { index: number; verdict: string; score: number; reason: string; synopsis_line_1: string; synopsis_line_2: string };

// Guardrail: whatever the model returns, only a clean WATCH/SKIP with short text gets through.
function validate(d: Raw): Judgement {
  const verdict = String(d.verdict).toUpperCase();
  if (verdict !== "WATCH" && verdict !== "SKIP") throw new Error(`Gemini returned verdict "${d.verdict}"`);
  const score = Math.max(0, Math.min(100, Math.round(Number(d.score) || 0)));
  const clip = (s: string, words: number) => {
    const w = String(s ?? "").replace(/\s+/g, " ").trim().split(" ");
    return w.length > words ? `${w.slice(0, words).join(" ")}…` : w.join(" ");
  };
  return {
    verdict,
    score,
    reason: clip(d.reason, 25),
    synopsis: [clip(d.synopsis_line_1, 22), clip(d.synopsis_line_2, 22)].filter(Boolean).join("\n"),
  };
}
