import "server-only";

function read(name: string): string {
  return (process.env[name] ?? "").trim();
}

function num(name: string, fallback: number): number {
  const v = Number(read(name));
  return Number.isFinite(v) && read(name) !== "" ? v : fallback;
}

export const env = {
  databaseUrl: read("DATABASE_URL"),
  tmdbToken: read("TMDB_READ_ACCESS_TOKEN"),
  geminiApiKey: read("GEMINI_API_KEY"),
  // Tried in order: if one is overloaded / out of quota, the next is used.
  geminiModels: (read("GEMINI_MODEL") || "gemini-flash-latest,gemini-3.8-flash,gemini-3.5-flash,gemini-flash-lite-latest")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean),
  // USD per million tokens (Gemini Flash list price). Update if Google changes it.
  geminiPriceInPerM: num("GEMINI_PRICE_IN_PER_M", 0.3),
  geminiPriceOutPerM: num("GEMINI_PRICE_OUT_PER_M", 2.5),
  usdInr: num("USD_INR", 88),
  telegramToken: read("TELEGRAM_BOT_TOKEN"),
  telegramSecret: read("TELEGRAM_WEBHOOK_SECRET"),
  // Optional: lock the bot to one chat. Otherwise the first /start claims it.
  telegramOwnerChatId: read("TELEGRAM_OWNER_CHAT_ID"),
  appUrl: read("APP_URL").replace(/\/$/, ""),
};

export function requireEnv(...names: (keyof typeof env)[]) {
  const missing = names.filter((n) => !env[n]);
  if (missing.length) throw new Error(`Missing environment variable(s): ${missing.join(", ")}`);
}
