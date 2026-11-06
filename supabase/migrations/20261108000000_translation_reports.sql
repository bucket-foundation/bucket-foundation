create schema if not exists bucket;

create table if not exists bucket.translation_reports (
  id          uuid        primary key,
  lang        text        not null check (lang ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$'),
  root        text        check (root is null or root ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$'),
  item_id     text        check (char_length(item_id) <= 120),
  text        text        check (char_length(text) <= 400),
  shown       text        not null check (char_length(shown) between 1 and 400),
  reason      text        not null check (reason in ('meaning', 'spelling', 'sound', 'script')),
  suggestion  text        check (char_length(suggestion) <= 400),
  context     text        check (char_length(context) <= 40),
  user_id     uuid        references auth.users (id) on delete set null,
  device_id   uuid,
  created_at  timestamptz not null default now(),
  check (item_id is not null or text is not null)
);

create index if not exists translation_reports_created_idx on bucket.translation_reports (created_at desc);
create index if not exists translation_reports_item_idx on bucket.translation_reports (lang, item_id);
create index if not exists translation_reports_user_idx on bucket.translation_reports (user_id);

alter table bucket.translation_reports enable row level security;
alter table bucket.translation_reports force row level security;

revoke all on bucket.translation_reports from public, anon, authenticated;
grant select, insert, update, delete on bucket.translation_reports to service_role;
