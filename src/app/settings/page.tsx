import { saveProfile } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { Card } from "@/components/ui";
import { getProfile } from "@/lib/queries";
import { GENRES, LANGUAGES, PROVIDERS } from "@/lib/prefs";

export const dynamic = "force-dynamic";

function Check({ name, value, label, checked }: { name: string; value: string | number; label: string; checked: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm border border-line rounded-lg px-3 py-2 bg-white cursor-pointer has-[:checked]:border-brand has-[:checked]:bg-indigo-50">
      <input type="checkbox" name={name} value={value} defaultChecked={checked} />
      {label}
    </label>
  );
}

export default async function Settings({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const p = await getProfile();

  return (
    <form action={saveProfile} className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Taste profile</h1>
        <p className="text-sm text-muted mt-1">The code filter uses genres, languages and apps. Gemini uses everything here, plus your recent taps, to decide WATCH or SKIP.</p>
        {sp.saved && <p className="mt-2 text-sm text-ok">Saved. Next Friday&apos;s digest will use this.</p>}
        {sp.error && <p className="mt-2 text-sm text-bad">{sp.error}</p>}
      </div>

      <Card title="Genres">
        <div className="flex flex-wrap gap-2">
          {Object.entries(GENRES).map(([k, g]) => <Check key={k} name="genres" value={k} label={g.label} checked={p.genres.includes(k as never)} />)}
        </div>
        <p className="text-xs text-muted mt-2">TMDB has no &quot;indie&quot; genre. Code matches Drama, and Gemini judges whether it&apos;s indie.</p>
      </Card>

      <Card title="Languages (original language of the title)">
        <div className="flex flex-wrap gap-2">
          {Object.entries(LANGUAGES).map(([k, l]) => <Check key={k} name="languages" value={k} label={l} checked={p.languages.includes(k)} />)}
        </div>
      </Card>

      <Card title="Apps (India)">
        <div className="flex flex-wrap gap-2">
          {Object.entries(PROVIDERS).map(([k, pr]) => <Check key={k} name="providers" value={k} label={pr.name} checked={p.providers.includes(Number(k))} />)}
        </div>
      </Card>

      <Card title="Never show me">
        <textarea name="never_show" rows={2} defaultValue={p.never_show.join(", ")} placeholder="e.g. anime, reality, wrestling"
          className="w-full border border-line rounded-lg p-2 text-sm" />
        <p className="text-xs text-muted mt-1">Comma-separated words. A title whose name, plot or keywords contain one is dropped by code before Gemini sees it.</p>
      </Card>

      <Card title="Notes for the recommender">
        <textarea name="notes" rows={3} defaultValue={p.notes} placeholder="e.g. Loves slow-burn mysteries and Tamil neo-noir. Hates gore and long reality shows."
          className="w-full border border-line rounded-lg p-2 text-sm" />
      </Card>

      <SubmitButton>Save profile</SubmitButton>
    </form>
  );
}
