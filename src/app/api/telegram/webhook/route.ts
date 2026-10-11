import { after, NextResponse } from "next/server";
import { query, maybeOne } from "@/lib/db";
import { env } from "@/lib/env";
import { runRadar } from "@/lib/pipeline";
import { getProfile } from "@/lib/queries";
import { answerCallback, editButtons, sendMessage } from "@/lib/telegram";
import { itemButtons } from "@/lib/digest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Update = {
  message?: { chat: { id: number }; text?: string; from?: { first_name?: string } };
  callback_query?: { id: string; data?: string; message?: { chat: { id: number }; message_id: number } };
};

const HELP = `🍿 <b>OTT Release Radar</b>
Every Friday at 6pm you get what's new this week on Netflix, Prime Video and JioHotstar in India, filtered to your taste.

/now: send this week's digest right now
/help: show this message`;

export async function POST(req: Request) {
  if (env.telegramSecret && req.headers.get("x-telegram-bot-api-secret-token") !== env.telegramSecret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const update = (await req.json()) as Update;
  const profile = await getProfile();

  // Taps on "✅ Title" / "Not for me".
  const cb = update.callback_query;
  if (cb?.data?.startsWith("fb:") && cb.message) {
    if (String(cb.message.chat.id) !== profile.chat_id) {
      await answerCallback(cb.id, "This radar belongs to someone else.");
      return NextResponse.json({ ok: true });
    }
    const [, idStr, kind] = cb.data.split(":");
    const feedback = kind === "w" ? "watching" : "not_for_me";
    const item = await maybeOne<{ feedback: string | null }>("select feedback from items where id = $1", [Number(idStr)]);
    // Tapping the same choice again clears it.
    const next = item?.feedback === feedback ? null : feedback;
    await query("update items set feedback = $2, feedback_at = case when $2::text is null then null else now() end where id = $1", [Number(idStr), next]);

    // Redraw this message's buttons so the choice shows.
    const rows = await query<{ id: number; title: string; feedback: string | null; position: number }>(
      "select id, title, feedback, position from items where message_id = $1 and position is not null order by position",
      [cb.message.message_id],
    );
    await editButtons(cb.message.chat.id, cb.message.message_id, rows.map((r) => itemButtons(r.position, r))).catch(() => null);
    await answerCallback(cb.id, next === "watching" ? "Noted: you're watching it 🍿" : next === "not_for_me" ? "Noted: not for you" : "Cleared");
    return NextResponse.json({ ok: true });
  }

  const msg = update.message;
  if (!msg?.text) return NextResponse.json({ ok: true });
  const chatId = String(msg.chat.id);
  const text = msg.text.trim();

  if (text.startsWith("/start")) {
    const owner = env.telegramOwnerChatId || profile.chat_id;
    if (owner && owner !== chatId) {
      await sendMessage(chatId, "Sorry, this radar is set up for someone else.");
    } else {
      await query("update profile set chat_id = $1, updated_at = now() where id = 1", [chatId]);
      await sendMessage(chatId, `Hi${msg.from?.first_name ? ` ${msg.from.first_name}` : ""}! You're connected. ✅\n\n${HELP}`);
    }
    return NextResponse.json({ ok: true });
  }

  if (chatId !== profile.chat_id) {
    await sendMessage(chatId, "Send /start first.");
    return NextResponse.json({ ok: true });
  }

  if (text.startsWith("/now")) {
    await sendMessage(chatId, "🔎 Checking this week's releases… (about a minute)");
    after(async () => {
      const r = await runRadar("telegram");
      if (r.status === "failed") await sendMessage(chatId, `Something went wrong: ${r.error}`);
    });
    return NextResponse.json({ ok: true });
  }

  await sendMessage(chatId, HELP);
  return NextResponse.json({ ok: true });
}
