create table if not exists polingual.signups (
  email text primary key check (length(email) <= 254),
  speaks text not null check (length(speaks) <= 160),
  learning text check (length(learning) <= 160),
  source text not null default 'polingual.com',
  created_at timestamptz not null default now()
);

alter table polingual.signups enable row level security;

grant usage on schema polingual to anon;
grant insert on polingual.signups to anon;

drop policy if exists signups_anon_insert on polingual.signups;
create policy signups_anon_insert on polingual.signups for insert to anon with check (true);
