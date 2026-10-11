import Link from "next/link";

const NAV = [
  ["/", "Dashboard"],
  ["/settings", "Taste profile"],
  ["/setup", "Setup"],
];

export function Nav() {
  return (
    <header className="bg-brand text-white">
      <div className="mx-auto max-w-5xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link href="/" className="font-semibold tracking-tight text-lg">
          🍿 OTT Release Radar
        </Link>
        <nav className="flex flex-wrap gap-4 text-sm text-white/85">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="hover:text-white">{label}</Link>
          ))}
        </nav>
        <span className="ml-auto text-xs text-white/60 hidden md:block">Code filters · Gemini judges fit · Naman decides</span>
      </div>
    </header>
  );
}
