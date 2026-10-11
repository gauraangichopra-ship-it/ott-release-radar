"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  ["/", "Home", "🏠"],
  ["/settings", "My taste", "🎯"],
  ["/history", "History", "🗂"],
  ["/setup", "Setup", "⚙️"],
] as const;

export function Nav() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <header className="bg-brand text-white sticky top-0 z-20 shadow-sm">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight shrink-0">
          <span className="text-xl">🍿</span>
          <span className="hidden sm:inline">OTT Release Radar</span>
        </Link>
        <nav className="flex gap-1 text-sm ml-auto sm:ml-4 overflow-x-auto">
          {NAV.map(([href, label, icon]) => (
            <Link key={href} href={href}
              className={`px-3 py-1.5 rounded-full whitespace-nowrap transition ${active(href) ? "bg-white text-brand font-medium" : "text-white/75 hover:text-white hover:bg-white/10"}`}>
              <span className="mr-1">{icon}</span>{label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
