// npm run telegram:webhook -> points the Telegram bot at APP_URL/api/telegram/webhook
import { resolve } from "node:path";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const appUrl = process.env.APP_URL?.trim().replace(/\/$/, "");
  if (!token || !appUrl) throw new Error("Set TELEGRAM_BOT_TOKEN and APP_URL in .env.local first");
  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      url: `${appUrl}/api/telegram/webhook`,
      secret_token: process.env.TELEGRAM_WEBHOOK_SECRET?.trim() || undefined,
      allowed_updates: ["message", "callback_query"],
    }),
  });
  console.log(await res.json());
}

main().catch((e) => { console.error(e.message); process.exit(1); });
