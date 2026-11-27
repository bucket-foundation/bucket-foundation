create table if not exists bucket.lobby_teach (
  lobby_id    uuid        not null references bucket.lobbies (id) on delete cascade,
  round       int         not null check (round between 0 and 49),
  speaker_id  uuid        not null,
  status      text        not null check (status in ('asked', 'approved', 'ready', 'open', 'done', 'skipped', 'reported')),
  lang        text        check (lang ~ '^[a-z]{2,3}$'),
  choices     jsonb       not null default '[]'::jsonb check (jsonb_typeof(choices) = 'array' and jsonb_array_length(choices) <= 4),
  answer      int         check (answer between 0 and 3),
  clip        text        check (clip is null or length(clip) <= 280000),
  guesses     jsonb       not null default '{}'::jsonb check (pg_column_size(guesses) < 8192),
  created_at  timestamptz not null default now(),
  primary key (lobby_id, round)
);

create index if not exists lobby_teach_created_idx on bucket.lobby_teach (created_at);

create table if not exists bucket.lobby_trivia (
  lobby_id    uuid        primary key references bucket.lobbies (id) on delete cascade,
  questions   jsonb       not null default '[]'::jsonb check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) <= 10 and pg_column_size(questions) < 16384),
  current     int         not null default -1 check (current between -1 and 9),
  open        boolean     not null default false,
  answers     jsonb       not null default '{}'::jsonb check (pg_column_size(answers) < 32768),
  created_at  timestamptz not null default now()
);

create index if not exists lobby_trivia_created_idx on bucket.lobby_trivia (created_at);

alter table bucket.lobby_teach enable row level security;
alter table bucket.lobby_trivia enable row level security;
revoke all on bucket.lobby_teach from anon, authenticated;
revoke all on bucket.lobby_trivia from anon, authenticated;

alter table bucket.lobby_prompts add column if not exists licence text check (licence is null or licence in ('device-tts', 'cc0', 'cc-by', 'cc-by-sa', 'family-room', 'personal', 'unknown'));
alter table bucket.lobby_prompts drop constraint if exists lobby_prompts_mode_check;
alter table bucket.lobby_prompts add constraint lobby_prompts_mode_check check (mode in ('form', 'flag', 'tiles', 'mixed', 'meaning', 'spy', 'voice'));
