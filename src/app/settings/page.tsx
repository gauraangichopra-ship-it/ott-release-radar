import { saveProfile } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { Card } from "@/components/ui";
import { getProfile } from "@/lib/queries";
import { GENRES, LANGUAGES, PROVIDERS } from "@/lib/prefs";

export const dynamic = "force-dynamic";

const GENRE_ICON: Record<string, string> = {
  thriller: "🔪", scifi: "🚀", indie_drama: "🎭", comedy: "😂", horror: "👻", romance: "💕", action: "💥", documentary: "🎥",
};

function Chip({ name, value, label, checked }: { name: string; value: string | number; label: React.ReactNode; checked: boolean }) {
  return (
    <label className="cursor-pointer select-none">
      <input type="checkbox" name={name} value={value} defaultChecked={checked} className="peer sr-only" />
      <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm transition
        hover:border-stone-400 peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:font-medium peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
        {label}
      </span>
    </label>
  );
}

export default async function Settings({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const p = await getProfile();

  return (
    <form action={saveProfile} className="space-y-5 max-w-3xl pb-24">
      <div>
        <h1 className="text-2xl font-semibold">🎯 My taste</h1>
        <p className="text-muted mt-1">Tap to turn things on or off. The Friday digest only includes titles that match.</p>
        {sp.saved && <p className="mt-3 text-sm bg-ok-soft text-ok rounded-xl px-3 py-2">✅ Saved! Friday&apos;s digest will use this.</p>}
        {sp.error && <p className="mt-3 text-sm bg-bad-soft text-bad rounded-xl px-3 py-2">⚠️ {sp.error}</p>}
      </div>

      <Card title="Genres I enjoy">
        <div className="flex flex-wrap gap-2">
          {Object.entries(GENRES).map(([k, g]) => (
            <Chip key={k} name="genres" value={k} label={<><span>{GENRE_ICON[k]}</span>{g.label}</>} checked={p.genres.includes(k as never)} />
          ))}
        </div>
        <p className="text-xs text-muted mt-3">&quot;Indie drama&quot; isn&apos;t a category on streaming sites, so the AI judges which dramas feel indie.</p>
      </Card>

      <Card title="Languages I watch in">
        <div className="flex flex-wrap gap-2">
          {Object.entries(LANGUAGES).map(([k, l]) => <Chip key={k} name="languages" value={k} label={l} checked={p.languages.includes(k)} />)}
        </div>
      </Card>

      <Card title="My streaming apps">
        <div className="flex flex-wrap gap-2">
          {Object.entries(PROVIDERS).map(([k, pr]) => <Chip key={k} name="providers" value={k} label={pr.name} checked={p.providers.includes(Number(k))} />)}
        </div>
      </Card>

      <Card title="Tell the AI more (optional)">
        <textarea name="notes" rows={3} defaultValue={p.notes}
          placeholder="e.g. I love slow-burn mysteries and Tamil neo-noir. I can't stand gore or long reality shows."
          className="w-full border border-line rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
        <p className="text-xs text-muted mt-1">Used to decide WATCH or SKIP. Your ✅ / 🙅 taps in Telegram are used too.</p>
      </Card>

      <Card title="Never show me (optional)">
        <input name="never_show" defaultValue={p.never_show.join(", ")} placeholder="e.g. anime, reality, wrestling"
          className="w-full border border-line rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
        <p className="text-xs text-muted mt-1">Separate words with commas. Any title mentioning one is hidden.</p>
      </Card>

      <div className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur border-t border-line">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
          <SubmitButton pendingText="Saving…">💾 Save my taste</SubmitButton>
          <span className="text-xs text-muted hidden sm:inline">Changes apply from the next digest.</span>
        </div>
      </div>
    </form>
  );
}
