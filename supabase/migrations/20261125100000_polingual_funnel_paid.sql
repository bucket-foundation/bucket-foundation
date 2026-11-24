create table if not exists bucket.polingual_funnel_paid (
  user_id    uuid        primary key,
  emitted_at timestamptz not null default now()
);

alter table bucket.polingual_funnel_paid enable row level security;
revoke all on bucket.polingual_funnel_paid from public, anon, authenticated;
grant select, insert, update, delete on bucket.polingual_funnel_paid to service_role;
