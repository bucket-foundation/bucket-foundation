create table if not exists bucket.beta_testers (
  user_id     uuid        primary key references auth.users (id) on delete cascade,
  cohort      text        not null default 'default' check (cohort ~ '^[a-z0-9_-]{1,32}$'),
  first_app   text        not null check (first_app in ('bucket', 'polingual', 'web')),
  opted_out   boolean     not null default false,
  enrolled_at timestamptz not null default now()
);

create table if not exists bucket.beta_events (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  event_id   uuid        not null,
  app        text        not null check (app in ('bucket', 'polingual', 'web')),
  name       text        not null check (name in ('app_open', 'session_start', 'session_end', 'card_shown', 'card_answered', 'lesson_complete')),
  session_id uuid,
  client_ts  timestamptz not null,
  props      jsonb       not null default '{}'::jsonb check (jsonb_typeof(props) = 'object' and octet_length(props::text) <= 2048),
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create index if not exists beta_events_user_ts_idx on bucket.beta_events (user_id, client_ts);
create index if not exists beta_events_ts_idx on bucket.beta_events (client_ts);

alter table bucket.beta_testers enable row level security;
alter table bucket.beta_testers force row level security;
alter table bucket.beta_events enable row level security;
alter table bucket.beta_events force row level security;

revoke all on bucket.beta_testers from public, anon, authenticated;
revoke all on bucket.beta_events from public, anon, authenticated;
grant select, insert, update, delete on bucket.beta_testers to service_role;
grant select, insert, delete on bucket.beta_events to service_role;
