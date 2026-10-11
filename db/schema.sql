-- OTT Release Radar: one user (Naman), one profile row.

create table if not exists profile (
  id          int primary key default 1 check (id = 1),
  genres      text[] not null default '{thriller,scifi,indie_drama}',
  languages   text[] not null default '{hi,en,ta}',
  providers   int[]  not null default '{8,119,2336}',
  never_show  text[] not null default '{}',   -- words; a title/overview containing one is dropped
  notes       text   not null default '',     -- free text taste notes for Gemini ("loves slow-burn, hates gore")
  chat_id     bigint,                         -- Telegram chat the digest goes to (set by /start)
  updated_at  timestamptz not null default now()
);
insert into profile (id) values (1) on conflict do nothing;

-- One row per digest run (Friday cron, "send now", or a preview).
create table if not exists runs (
  id            serial primary key,
  trigger       text not null,                -- cron | manual | preview | telegram
  status        text not null default 'running', -- running | sent | previewed | empty | failed
  window_start  date not null,
  window_end    date not null,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  found         int not null default 0,       -- candidates from TMDB
  kept          int not null default 0,       -- after the code filter
  drops         jsonb not null default '{}',  -- reason -> count
  watch_count   int not null default 0,
  skip_count    int not null default 0,
  ai_failed     int not null default 0,
  tokens_in     int not null default 0,
  tokens_out    int not null default 0,
  cost_inr      numeric(10,4) not null default 0,
  model         text,
  message_ids   int[] not null default '{}',
  error         text
);

-- Every title that made it into a digest (or a preview).
create table if not exists items (
  id           serial primary key,
  run_id       int not null references runs(id) on delete cascade,
  media_type   text not null,                -- movie | tv
  tmdb_id      int not null,
  title        text not null,
  year         text,
  platforms    text[] not null,
  label        text not null,                -- released | new_on_app
  genres       text[] not null,
  language     text not null,
  length_text  text,                         -- "1h 56m" or "Season 1 · 6 episodes"
  overview     text,
  synopsis     text,
  verdict      text,                         -- WATCH | SKIP | null when Gemini failed
  score        int,
  reason       text,
  delivered    boolean not null default false,
  message_id   int,                          -- Telegram message carrying its buttons
  position     int,                          -- its number in the digest (button label)
  feedback     text,                         -- watching | not_for_me
  feedback_at  timestamptz
);
create index if not exists items_run on items(run_id);
create unique index if not exists items_delivered_once on items(media_type, tmdb_id) where delivered;

-- Weekly catalogue snapshot: which titles each app had. A title missing
-- last time but present now is "New on [app]" (the Cut's workaround).
create table if not exists catalogue (
  media_type   text not null,
  tmdb_id      int not null,
  provider_id  int not null,
  first_seen   date not null,
  last_seen    date not null,
  primary key (media_type, tmdb_id, provider_id)
);

alter table items add column if not exists position int;
