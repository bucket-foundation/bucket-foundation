create table if not exists bucket.polingual_trial_used (
  user_id    uuid        primary key,
  store      text        not null check (store in ('web', 'app_store', 'play')),
  started_at timestamptz not null default now()
);

alter table bucket.polingual_trial_used enable row level security;
revoke all on bucket.polingual_trial_used from public, anon, authenticated;
grant select, insert, update, delete on bucket.polingual_trial_used to service_role;
