create table if not exists bucket.growth_snapshots (
  id         bigint      generated always as identity primary key,
  taken_at   timestamptz not null,
  data       jsonb       not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 1048576),
  created_at timestamptz not null default now()
);

create index if not exists growth_snapshots_taken_idx on bucket.growth_snapshots (taken_at desc);

alter table bucket.growth_snapshots enable row level security;
alter table bucket.growth_snapshots force row level security;

revoke all on bucket.growth_snapshots from public, anon, authenticated;
grant select, insert, delete on bucket.growth_snapshots to service_role;
