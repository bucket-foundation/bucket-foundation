create table if not exists bucket.polingual_outreach (
  id uuid primary key default gen_random_uuid(),
  contact text not null,
  org text,
  channel text not null,
  kind text not null check (kind in ('creator', 'teacher', 'press', 'club', 'agency')),
  status text not null default 'drafted' check (status in ('drafted', 'sent', 'followup_due', 'replied', 'won', 'lost')),
  last_touch timestamptz,
  next_touch timestamptz,
  thread_url text,
  updated_at timestamptz not null default now()
);

create index if not exists polingual_outreach_next_touch on bucket.polingual_outreach (next_touch);

alter table bucket.polingual_outreach enable row level security;
alter table bucket.polingual_outreach force row level security;
revoke all on bucket.polingual_outreach from public, anon, authenticated;
grant select, insert, update on bucket.polingual_outreach to service_role;

create trigger polingual_outreach_touch before update on bucket.polingual_outreach
  for each row execute function bucket.touch_updated_at();
