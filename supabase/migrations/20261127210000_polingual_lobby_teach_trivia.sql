create table if not exists bucket.lobby_teach (
  lobby_id    uuid        not null references bucket.lobbies (id) on delete cascade,
  round       int         not null check (round between 0 and 49),
  speaker_id  uuid        not null,
  status      text        not null check (status in ('asked', 'approved', 'ready', 'open', 'done', 'skipped', 'reported')),
  lang        text        check (lang ~ '^[a-z]{2,3}$'),
  choices     jsonb       not null default '[]'::jsonb check (jsonb_typeof(choices) = 'array' and jsonb_array_length(choices) <= 4),
  answer      int         check (answer between 0 and 3),
  clip        text        check (clip is null or length(clip) <= 280000),
  created_at  timestamptz not null default now(),
  primary key (lobby_id, round)
);

create index if not exists lobby_teach_created_idx on bucket.lobby_teach (created_at);
create index if not exists lobby_teach_speaker_idx on bucket.lobby_teach (speaker_id);

create table if not exists bucket.lobby_teach_guesses (
  lobby_id    uuid        not null,
  round       int         not null,
  user_id     uuid        not null,
  guess       int         not null check (guess between 0 and 3),
  created_at  timestamptz not null default now(),
  primary key (lobby_id, round, user_id),
  foreign key (lobby_id, round) references bucket.lobby_teach (lobby_id, round) on delete cascade
);

create index if not exists lobby_teach_guesses_user_idx on bucket.lobby_teach_guesses (user_id);

create table if not exists bucket.lobby_trivia (
  lobby_id    uuid        primary key references bucket.lobbies (id) on delete cascade,
  questions   jsonb       not null default '[]'::jsonb check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) <= 10 and pg_column_size(questions) < 16384),
  current     int         not null default -1 check (current between -1 and 9),
  open        boolean     not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists lobby_trivia_created_idx on bucket.lobby_trivia (created_at);

create table if not exists bucket.lobby_trivia_answers (
  lobby_id    uuid        not null references bucket.lobby_trivia (lobby_id) on delete cascade,
  question    int         not null check (question between 0 and 9),
  user_id     uuid        not null,
  pick        int         not null check (pick between 0 and 3),
  created_at  timestamptz not null default now(),
  primary key (lobby_id, question, user_id)
);

create index if not exists lobby_trivia_answers_user_idx on bucket.lobby_trivia_answers (user_id);

alter table bucket.lobby_teach enable row level security;
alter table bucket.lobby_teach_guesses enable row level security;
alter table bucket.lobby_trivia enable row level security;
alter table bucket.lobby_trivia_answers enable row level security;
revoke all on bucket.lobby_teach, bucket.lobby_teach_guesses, bucket.lobby_trivia, bucket.lobby_trivia_answers from anon, authenticated;

alter table bucket.lobby_prompts add column if not exists licence text check (licence is null or licence in ('device-tts', 'cc0', 'cc-by', 'cc-by-sa', 'family-room', 'personal', 'unknown'));
alter table bucket.lobby_prompts drop constraint if exists lobby_prompts_mode_check;
alter table bucket.lobby_prompts add constraint lobby_prompts_mode_check check (mode in ('form', 'flag', 'tiles', 'mixed', 'meaning', 'spy', 'voice'));

create or replace function bucket.delete_lobby_user(p_user uuid)
returns int language plpgsql security definer set search_path = bucket as $$
declare
  v_lobby uuid;
  n int := 0;
begin
  for v_lobby in select lobby_id from bucket.lobby_players where user_id = p_user loop
    perform bucket.leave_lobby(v_lobby, p_user);
    n := n + 1;
  end loop;
  delete from bucket.lobby_messages where user_id = p_user;
  delete from bucket.lobby_answers where user_id = p_user;
  delete from bucket.lobby_powers where user_id = p_user;
  delete from bucket.lobby_teach_guesses where user_id = p_user;
  delete from bucket.lobby_teach where speaker_id = p_user;
  delete from bucket.lobby_trivia_answers where user_id = p_user;
  delete from bucket.lobby_trivia where lobby_id in (select id from bucket.lobbies where host_id = p_user);
  delete from bucket.lobbies where host_id = p_user;
  delete from bucket.lobby_limits where bucket_key like '%:' || p_user::text;
  delete from bucket.lobby_message_reports where reporter_id = p_user or target_user_id = p_user;
  delete from bucket.lobby_chat_blocks where blocker_id = p_user or target_user_id = p_user;
  delete from bucket.lobby_report_limits where bucket_key = 'report:user:' || p_user::text;
  return n;
end $$;

revoke execute on function bucket.delete_lobby_user(uuid) from public, anon, authenticated;
