import { LANGUAGES } from "@/lib/prefs";
import type { Item } from "@/lib/queries";

export function Card({ title, action, children, className = "" }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-card border border-line rounded-2xl p-5 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 mb-4">
          {title && <h2 className="font-semibold text-lg">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ icon, label, value, sub }: { icon: string; label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="bg-card border border-line rounded-2xl p-4">
      <div className="text-sm text-muted flex items-center gap-1.5"><span>{icon}</span>{label}</div>
      <div className="text-2xl font-semibold mt-1 tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

export function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "ok" | "warn" | "bad" | "info" | "dark" }) {
  const cls = {
    neutral: "bg-stone-100 text-stone-700",
    ok: "bg-ok-soft text-ok",
    warn: "bg-amber-100 text-amber-800",
    bad: "bg-bad-soft text-bad",
    info: "bg-sky-100 text-sky-800",
    dark: "bg-black/70 text-white backdrop-blur",
  }[tone];
  return <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${cls}`}>{children}</span>;
}

const STATUS: Record<string, { label: string; tone: "ok" | "neutral" | "info" | "bad" | "warn" }> = {
  sent: { label: "Sent to Telegram", tone: "ok" },
  empty: { label: "Nothing new", tone: "neutral" },
  previewed: { label: "Preview only", tone: "info" },
  failed: { label: "Failed", tone: "bad" },
  running: { label: "Running…", tone: "warn" },
};

export function StatusPill({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, tone: "neutral" as const };
  return <Pill tone={s.tone}>{s.label}</Pill>;
}

const PLATFORM_STYLE: Record<string, string> = {
  Netflix: "bg-[#e50914] text-white",
  "Prime Video": "bg-[#00a8e1] text-white",
  JioHotstar: "bg-[#1f1b4f] text-white",
};

export function PlatformBadge({ name }: { name: string }) {
  return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${PLATFORM_STYLE[name] ?? "bg-stone-700 text-white"}`}>{name}</span>;
}

export function Empty({ icon = "🎬", children }: { icon?: string; children: React.ReactNode }) {
  return (
    <div className="text-center py-10 text-muted">
      <div className="text-4xl mb-2">{icon}</div>
      <div className="text-sm max-w-sm mx-auto">{children}</div>
    </div>
  );
}

const POSTER = "https://image.tmdb.org/t/p/w342";

function Poster({ item, className = "" }: { item: Pick<Item, "poster_path" | "title">; className?: string }) {
  return item.poster_path ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`${POSTER}${item.poster_path}`} alt={item.title} loading="lazy" className={`object-cover bg-stone-200 ${className}`} />
  ) : (
    <div className={`bg-gradient-to-br from-brand to-brand-2 text-white/80 flex items-center justify-center text-3xl ${className}`}>🎬</div>
  );
}

export function metaLine(it: Pick<Item, "genres" | "language" | "length_text">) {
  return [...it.genres.slice(0, 3), LANGUAGES[it.language] ?? it.language, it.length_text].filter(Boolean).join(" · ");
}

function labelText(it: Pick<Item, "label" | "platforms">) {
  return it.label === "released" ? "New this week" : `Just added to ${it.platforms.join(" & ")}`;
}

function Feedback({ f }: { f: string | null }) {
  if (f === "watching") return <Pill tone="ok">✅ You&apos;re watching</Pill>;
  if (f === "not_for_me") return <Pill>🙅 Not for you</Pill>;
  return null;
}

// Big poster card for WATCH picks.
export function PickCard({ it }: { it: Item }) {
  return (
    <a href={`https://www.themoviedb.org/${it.media_type}/${it.tmdb_id}`} target="_blank" rel="noreferrer"
      className="group bg-card border border-line rounded-2xl overflow-hidden flex flex-col hover:shadow-lg hover:-translate-y-0.5 transition">
      <div className="relative">
        <Poster item={it} className="w-full aspect-[2/3]" />
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">{it.platforms.map((p) => <PlatformBadge key={p} name={p} />)}</div>
        {it.score != null && (
          <div className="absolute top-2 right-2 bg-white/95 text-ink text-xs font-bold rounded-full h-9 w-9 flex items-center justify-center shadow" title="How well it fits your taste">
            {it.score}
          </div>
        )}
      </div>
      <div className="p-3.5 flex flex-col gap-1.5 flex-1">
        <div className="font-semibold leading-snug group-hover:text-accent">{it.title} {it.year && <span className="font-normal text-muted">({it.year})</span>}</div>
        <div className="text-xs text-muted">{metaLine(it)}</div>
        <p className="text-sm text-ink/80 clamp-3">{it.synopsis ?? it.overview}</p>
        {it.reason && <p className="text-sm bg-accent-soft rounded-lg px-2.5 py-1.5 mt-auto">💡 {it.reason}</p>}
        <div className="flex flex-wrap gap-1 pt-1">
          <Pill tone="info">{labelText(it)}</Pill>
          <Feedback f={it.feedback} />
        </div>
      </div>
    </a>
  );
}

// Compact row for SKIP / unrated titles.
export function TitleRow({ it }: { it: Item }) {
  return (
    <li className="flex gap-3 py-3 border-b border-line last:border-0">
      <Poster item={it} className="w-12 h-[72px] rounded-md shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <a href={`https://www.themoviedb.org/${it.media_type}/${it.tmdb_id}`} target="_blank" rel="noreferrer" className="font-medium hover:underline">{it.title}</a>
          {it.platforms.map((p) => <PlatformBadge key={p} name={p} />)}
          <Feedback f={it.feedback} />
        </div>
        <div className="text-xs text-muted mt-0.5">{metaLine(it)}</div>
        {it.reason && <div className="text-sm text-ink/80 mt-1">{it.reason}</div>}
      </div>
      {it.score != null && <div className="text-sm text-muted tabular-nums shrink-0">{it.score}<span className="text-xs">/100</span></div>}
    </li>
  );
}

export const inr = (n: number, digits = 2) =>
  `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: digits })}`;

export const istTime = (d: Date | string) =>
  new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export const istDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", day: "numeric", month: "short" });
