# OTT Release Radar — Nine Checks + The Cut

| # | Check | Evidence from the case | Verdict |
|---|---|---|---|
| 01 | **Problem real?** | Naman spends **20 minutes every Friday** scrolling three apps to answer one question. That's about 17 hours a year. Every app shows trending or recommended titles, never "released in the last 7 days". IMDb shows global dates, not India OTT dates. | ✅ Pass |
| 02 | **Workflow repeated?** | Every Friday, the same three apps and the same question. He watches 2–3 titles a week, so it never stops. He already relies on a WhatsApp group to do it for him, but someone posts by hand and it's inconsistent. | ✅ Pass |
| 03 | **Input available?** | **Partly.** TMDB (free API) gives India streaming availability per platform (`watch_region=IN`), digital release dates for movies, air dates for TV, genres, languages, runtime and episode counts. It does **not** give the exact date a title was added to an app in India. "Indie" is not a TMDB genre. | ⚠️ **Produces the Cut** |
| 04 | **Output valuable?** | One Telegram message replaces three apps and the WhatsApp group. Each entry carries everything he asked for: title, platform, genre tags, runtime or episode count, 2-line synopsis, and a watch-or-skip verdict. | ✅ Pass |
| 05 | **Impact measurable?** | Friday scroll time goes from 20 min to under 2 (he only reads one message). Share of WATCH picks he taps "Watching" on. Number of new releases he hears about from WhatsApp that the digest missed (target: 0). | ✅ Pass |
| 06 | **Failure risk OK?** | Worst case is a wrong SKIP or a missed title, which costs one evening's pick. No money, no data and nobody else is affected. Code-level fallbacks: if Gemini fails, the digest still goes out without verdicts; in an empty week he still gets a "nothing new matched" message. | ✅ Pass (low stakes) |
| 07 | **Judgment protected?** | Gemini only **recommends**, and gives a one-line reason. Naman decides what to watch. The bot never adds anything to a watchlist. Filtering by language, genre, platform and dates is done in code, so a title can't sneak in because the AI "felt" it fit. | ✅ Pass |
| 08 | **ROI worth it?** | TMDB is free, the Telegram bot is free and Vercel Hobby plus the Supabase free tier (Mumbai) cover hosting. Gemini Flash costs about 20–40 titles × ~1k tokens a week, **under ₹2 a week**. The build is small: one cron job, one filter, one AI call per 10 titles and one message. | ✅ Pass |
| 09 | **Owner clear?** | Naman is the only user. He owns his taste profile on `/settings` and his "Watching / Not for me" taps. The builder owns the pipeline, the run log and costs. | ✅ Pass |

## The Cut

**Check that kills it:** 03, "Input available?"

**Part of the ask it kills:** "titles that released in the last seven days on any of the three platforms *in India*", read strictly as the exact day each title landed on each app in India. No public API records that date. TMDB has movie digital release dates and TV air dates, plus *current* availability per platform, but not "added to Netflix India on Tuesday".

**What we build instead:** two honest labels.
- **Released this week**: TMDB digital release (movies) or new episode/season air date (TV) in the last 7 days, and currently on one of his three apps in India.
- **New on [app]**: the title wasn't on that app in last Friday's snapshot but is this week (we store a weekly snapshot of his filtered catalogue and compare).

**The one sentence to say to Naman:**
> "No public source records the exact day a title landed on Netflix India or JioHotstar, so each Friday I'll show you what released or newly arrived on your three apps this week, clearly labelled, instead of pretending to know the exact drop date."

## Watch-outs for the build
- **Vercel Cron runs in UTC.** Friday 6pm IST is 12:30 UTC, so use `30 12 * * 5`. `0 18 * * 5` would arrive at 11:30pm.
- **Disney+ Hotstar is now JioHotstar** (merged in 2025). Look up its TMDB provider ID with `/watch/providers/movie?watch_region=IN`; don't hard-code it from memory. Netflix is 8 and Prime Video is 119.
- **TMDB TV has no "Thriller" genre.** Map thriller to Crime (80) and Mystery (9648) for TV, and to Thriller (53) for movies. Sci-fi is 878 (movies) and Sci-Fi & Fantasy 10765 (TV).
- **Don't let Gemini write a synopsis from memory.** Give it the TMDB overview only, or it may describe a different film with the same name.
