create table if not exists bucket.outreach_contacts (
  email text primary key,
  org text not null,
  segment text not null,
  product text not null default 'polingual',
  first_sent date,
  fu1_sent date,
  fu1_due date,
  fu2_sent date,
  fu2_due date,
  status text not null default 'sent' check (status in ('sent', 'replied', 'opted_out', 'bounced', 'declined', 'no_followup', 'sequence_done', 'subscribed')),
  creator_code text,
  thread_id text,
  notes text,
  updated_at timestamptz not null default now()
);

create index if not exists outreach_contacts_due on bucket.outreach_contacts (status, fu1_due, fu2_due);

alter table bucket.outreach_contacts enable row level security;
revoke all on bucket.outreach_contacts from anon, authenticated;

create table if not exists bucket.beads (
  id text primary key,
  title text not null,
  status text not null,
  priority int,
  issue_type text,
  labels text[] not null default '{}',
  parent text,
  description text,
  notes text,
  data jsonb not null,
  updated_at timestamptz,
  synced_at timestamptz not null default now()
);

create index if not exists beads_status on bucket.beads (status, priority);
create index if not exists beads_parent on bucket.beads (parent);

alter table bucket.beads enable row level security;
revoke all on bucket.beads from anon, authenticated;
