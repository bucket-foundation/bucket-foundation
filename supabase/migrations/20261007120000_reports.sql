-- Privacy: a report row holds titles, author names, repo paths and hashes.
-- Draft and private rows describe work the founder has not released, so the
-- table is service-role only; the site reads public reports from
-- src/lib/papers.ts, never from this table. No row carries an email, a wallet
-- or a reader identity.

create table if not exists graph.reports (
  slug          text        primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title         text        not null check (length(title) between 1 and 500),
  authors       text[]      not null check (cardinality(authors) >= 1),
  date          date        not null,
  status        text        not null check (status in ('draft', 'private', 'public')),
  kind          text        not null check (kind in ('paper', 'brief', 'memo', 'dataset-report')),
  abstract      text        not null default '',
  bead          text        check (bead is null or bead ~ '^bkt-[a-z0-9]{3,12}$'),
  source_path   text        not null check (source_path !~ '^/' and source_path !~ '\.\.'),
  pdf_path      text        check (pdf_path is null or (pdf_path !~ '^/' and pdf_path !~ '\.\.')),
  figures       jsonb       not null default '[]'::jsonb check (jsonb_typeof(figures) = 'array'),
  data_sources  jsonb       not null default '[]'::jsonb check (jsonb_typeof(data_sources) = 'array'),
  source_hash   text        not null check (source_hash ~ '^[0-9a-f]{64}$'),
  pdf_hash      text        check (pdf_hash is null or pdf_hash ~ '^[0-9a-f]{64}$'),
  built_at      timestamptz,
  published_at  timestamptz,
  updated_at    timestamptz not null default now(),
  check (status <> 'public' or (pdf_path is not null and pdf_hash is not null and published_at is not null)),
  check (pdf_path is null or pdf_hash is not null)
);

create index if not exists graph_reports_status_date_idx on graph.reports (status, date desc);

alter table graph.reports enable row level security;
alter table graph.reports force row level security;

revoke all on graph.reports from public, anon, authenticated;
grant select, insert, update, delete on graph.reports to service_role;
