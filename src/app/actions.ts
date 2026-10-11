"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { env } from "@/lib/env";
import { runRadar } from "@/lib/pipeline";
import { GENRES, LANGUAGES, PROVIDERS } from "@/lib/prefs";
import { setWebhook } from "@/lib/telegram";

export async function saveProfile(form: FormData) {
  const pick = (name: string, allowed: string[]) => form.getAll(name).map(String).filter((v) => allowed.includes(v));
  const genres = pick("genres", Object.keys(GENRES));
  const languages = pick("languages", Object.keys(LANGUAGES));
  const providers = pick("providers", Object.keys(PROVIDERS)).map(Number);
  const never = String(form.get("never_show") ?? "")
    .split(/[,\n]/)
    .map((w) => w.trim())
    .filter(Boolean)
    .slice(0, 50);
  const notes = String(form.get("notes") ?? "").trim().slice(0, 600);
  if (!genres.length || !languages.length || !providers.length) {
    redirect("/settings?error=Pick at least one genre, one language and one app.");
  }
  await query(
    "update profile set genres=$1, languages=$2, providers=$3, never_show=$4, notes=$5, updated_at=now() where id=1",
    [genres, languages, providers, never, notes],
  );
  revalidatePath("/", "layout");
  redirect("/settings?saved=1");
}

// Builds this week's digest without sending it or moving the snapshot forward.
export async function previewNow() {
  const r = await runRadar("preview");
  redirect(`/runs/${r.runId}`);
}

export async function sendNow() {
  const r = await runRadar("manual");
  redirect(`/runs/${r.runId}`);
}

export async function connectTelegram() {
  if (!env.appUrl) redirect("/setup?error=Set APP_URL first.");
  try {
    await setWebhook(`${env.appUrl}/api/telegram/webhook`);
  } catch (e) {
    redirect(`/setup?error=${encodeURIComponent((e as Error).message)}`);
  }
  redirect("/setup?webhook=1");
}
