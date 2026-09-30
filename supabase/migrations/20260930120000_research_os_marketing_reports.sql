create table if not exists graph.marketing_reports (
  id                uuid        primary key default gen_random_uuid(),
  import_id         uuid        not null references graph.imports (id) on delete cascade,
  owner_id          uuid        not null references auth.users (id) on delete cascade,
  input_digest      text        not null check (input_digest ~ '^[0-9a-f]{64}$'),
  analyzer_version  text        not null check (analyzer_version ~ '^[0-9a-f]{16}$'),
  key_id            text        not null check (key_id ~ '^[a-z0-9_-]{1,32}$'),
  iv                bytea       not null check (octet_length(iv) = 12),
  ciphertext        bytea       not null check (octet_length(ciphertext) between 17 and 67108864),
  created_at        timestamptz not null default now(),
  unique (import_id, input_digest, analyzer_version)
);

create index if not exists graph_marketing_reports_import_idx on graph.marketing_reports (import_id, created_at desc);

alter table graph.marketing_reports enable row level security;
alter table graph.marketing_reports force row level security;

revoke all on graph.marketing_reports from public, anon, authenticated;
grant select, insert, delete on graph.marketing_reports to service_role;
