import "server-only";
import { env, requireEnv } from "./env";

type Button = { text: string; callback_data: string };

async function api<T>(method: string, body: Record<string, unknown>): Promise<T> {
  requireEnv("telegramToken");
  const res = await fetch(`https://api.telegram.org/bot${env.telegramToken}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json()) as { ok: boolean; result: T; description?: string };
  if (!json.ok) throw new Error(`Telegram ${method}: ${json.description ?? res.status}`);
  return json.result;
}

export async function sendMessage(chatId: number | string, html: string, buttons?: Button[][]) {
  return api<{ message_id: number }>("sendMessage", {
    chat_id: chatId,
    text: html,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(buttons ? { reply_markup: { inline_keyboard: buttons } } : {}),
  });
}

export type { Button };

export async function editButtons(chatId: number | string, messageId: number, buttons: Button[][]) {
  return api("editMessageReplyMarkup", { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: buttons } });
}

export async function answerCallback(callbackQueryId: string, text: string) {
  return api("answerCallbackQuery", { callback_query_id: callbackQueryId, text });
}

export async function botUsername(): Promise<string | null> {
  if (!env.telegramToken) return null;
  try {
    return (await api<{ username: string }>("getMe", {})).username;
  } catch {
    return null;
  }
}

export async function setWebhook(url: string) {
  return api("setWebhook", {
    url,
    secret_token: env.telegramSecret || undefined,
    allowed_updates: ["message", "callback_query"],
  });
}

export const esc = (s: string | null | undefined) =>
  (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
