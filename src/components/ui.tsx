export function Card({ title, children, className = "" }: { title?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-card border border-line rounded-xl p-4 ${className}`}>
      {title && <h2 className="font-semibold mb-3">{title}</h2>}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="bg-card border border-line rounded-xl p-4">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="text-2xl font-semibold mt-1 tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
    </div>
  );
}

export function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "ok" | "warn" | "bad" | "info" }) {
  const cls = {
    neutral: "bg-stone-100 text-stone-700",
    ok: "bg-green-100 text-green-800",
    warn: "bg-amber-100 text-amber-800",
    bad: "bg-red-100 text-red-800",
    info: "bg-sky-100 text-sky-800",
  }[tone];
  return <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${cls}`}>{children}</span>;
}

const STATUS_TONE: Record<string, "ok" | "warn" | "bad" | "info" | "neutral"> = {
  sent: "ok", empty: "neutral", previewed: "info", failed: "bad", running: "warn",
};

export function StatusPill({ status }: { status: string }) {
  return <Pill tone={STATUS_TONE[status] ?? "neutral"}>{status}</Pill>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted py-6 text-center">{children}</p>;
}

export const inr = (n: number, digits = 2) =>
  `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: digits })}`;

export const istTime = (d: Date | string) =>
  new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
