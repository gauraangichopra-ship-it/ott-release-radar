// Naman's taste vocabulary and how each word maps onto TMDB.
// TMDB's TV genres differ from its movie genres (no "Thriller", one combined
// "Sci-Fi & Fantasy"), so each preference lists both.

export type GenreKey = "thriller" | "scifi" | "indie_drama" | "comedy" | "horror" | "romance" | "action" | "documentary";

export const GENRES: Record<GenreKey, { label: string; movie: number[]; tv: number[] }> = {
  thriller: { label: "Thriller", movie: [53], tv: [80, 9648] },
  scifi: { label: "Sci-fi", movie: [878], tv: [10765] },
  // TMDB has no "indie" genre: code matches Drama, Gemini judges whether it's indie.
  indie_drama: { label: "Indie drama", movie: [18], tv: [18] },
  comedy: { label: "Comedy", movie: [35], tv: [35] },
  horror: { label: "Horror", movie: [27], tv: [] }, // TMDB TV has no horror genre
  romance: { label: "Romance", movie: [10749], tv: [] }, // TMDB TV has no romance genre
  action: { label: "Action", movie: [28], tv: [10759] },
  documentary: { label: "Documentary", movie: [99], tv: [99] },
};

export const LANGUAGES: Record<string, string> = {
  hi: "Hindi",
  en: "English",
  ta: "Tamil",
  te: "Telugu",
  ml: "Malayalam",
  kn: "Kannada",
  bn: "Bengali",
  mr: "Marathi",
  ko: "Korean",
};

// TMDB watch-provider ids for India. Ad-supported Prime tiers count as Prime.
export const PROVIDERS: Record<number, { name: string; aliases: number[] }> = {
  8: { name: "Netflix", aliases: [8] },
  119: { name: "Prime Video", aliases: [119, 2100, 613] },
  2336: { name: "JioHotstar", aliases: [2336] },
};

// TMDB genre id -> display name (movie + tv lists merged).
export const TMDB_GENRE_NAMES: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime", 99: "Documentary",
  18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
  9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 10770: "TV Movie", 53: "Thriller", 10752: "War",
  37: "Western", 10759: "Action & Adventure", 10762: "Kids", 10763: "News", 10764: "Reality",
  10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "War & Politics",
};

export type Profile = {
  genres: GenreKey[];
  languages: string[];
  providers: number[];
  never_show: string[];
  notes: string;
  chat_id: string | null;
};

export function genreIds(profile: Pick<Profile, "genres">, media: "movie" | "tv"): number[] {
  return [...new Set(profile.genres.flatMap((g) => GENRES[g]?.[media] ?? []))];
}

// Which of Naman's genres a title hits, by name ("Thriller", "Indie drama").
export function matchedGenres(profile: Pick<Profile, "genres">, media: "movie" | "tv", ids: number[]): string[] {
  return profile.genres.filter((g) => GENRES[g]?.[media].some((id) => ids.includes(id))).map((g) => GENRES[g].label);
}

// Maps any provider id TMDB returns onto one of Naman's apps (or null).
export function canonicalProvider(id: number, wanted: number[]): number | null {
  for (const p of wanted) if (PROVIDERS[p]?.aliases.includes(id)) return p;
  return null;
}
