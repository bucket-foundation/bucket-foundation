alter table graph.nodes drop constraint if exists nodes_kind_check;
alter table graph.nodes add constraint nodes_kind_check check (kind in (
  'fact','concept','law','derivation','primary_source','artifact',
  'hypothesis','extension','replication','peer_review','production',
  'figure','site','excerpt','event'
));

alter table graph.bronze_file_paths drop constraint if exists bronze_file_paths_relative;
alter table graph.bronze_file_paths add constraint bronze_file_paths_relative check (
  length(repo_path) between 1 and 512
  and repo_path !~ '^/'
  and repo_path !~ '^~'
  and repo_path !~ '\\'
  and repo_path !~ '(^|/)\.\.?(/|$)'
  and repo_path !~ '//'
  and repo_path !~ '[[:cntrl:]]'
  and repo_path ~ '^(_intake|bucket-canon|learning/app/corpus|supabase/seed|canon-figures|src/data|archaeology)/'
);

create table if not exists graph.places (
  id              uuid             primary key default gen_random_uuid(),
  slug            text             not null,
  title           text             not null,
  pleiades_id     text,
  tgn_id          text,
  geonames_id     bigint,
  wikidata_qid    text,
  lat             double precision not null,
  lng             double precision not null,
  valid_start     integer,
  valid_end       integer,
  site_node_id    uuid             references graph.nodes (id) on delete set null,
  source_id       text             not null,
  source_revision text             not null,
  status          text             not null default 'active',
  created_at      timestamptz      not null default now(),
  constraint places_slug_key unique (slug),
  constraint places_pleiades_id_key unique (pleiades_id),
  constraint places_tgn_id_key unique (tgn_id),
  constraint places_geonames_id_key unique (geonames_id),
  constraint places_wikidata_qid_key unique (wikidata_qid),
  constraint places_site_node_id_key unique (site_node_id),
  constraint places_admission foreign key (source_id, source_revision)
    references graph.evidence_source_admissions (source_id, source_revision) on delete restrict,
  constraint places_slug_shape check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 200),
  constraint places_title check (length(title) between 1 and 500),
  constraint places_pleiades_id check (pleiades_id ~ '^[0-9]+$'),
  constraint places_tgn_id check (tgn_id ~ '^[0-9]+$'),
  constraint places_geonames_id check (geonames_id > 0),
  constraint places_wikidata_qid check (wikidata_qid ~ '^Q[0-9]+$'),
  constraint places_lat check (lat between -90 and 90),
  constraint places_lng check (lng between -180 and 180),
  constraint places_valid check (valid_start is null or valid_end is null or valid_start <= valid_end),
  constraint places_status check (status in ('active', 'withdrawn'))
);
create index if not exists places_source_idx on graph.places (source_id, source_revision);
alter table graph.places enable row level security;
revoke all on graph.places from anon, authenticated;

create table if not exists graph.periods (
  id              text        primary key,
  label           text        not null,
  spatial_qids    text[]      not null default '{}',
  start_min       integer     not null,
  start_max       integer     not null,
  end_min         integer     not null,
  end_max         integer     not null,
  span            int4range   generated always as (int4range(least(start_min, end_max), greatest(start_min, end_max), '[]')) stored,
  source_id       text        not null,
  source_revision text        not null,
  status          text        not null default 'active',
  created_at      timestamptz not null default now(),
  constraint periods_admission foreign key (source_id, source_revision)
    references graph.evidence_source_admissions (source_id, source_revision) on delete restrict,
  constraint periods_id check (id ~ '^(periodo|pleiades):[A-Za-z0-9_-]+$'),
  constraint periods_label check (length(label) between 1 and 500),
  constraint periods_spatial_qids check (array_position(spatial_qids, null) is null and array_to_string(spatial_qids, ',') ~ '^(Q[0-9]+(,Q[0-9]+)*)?$'),
  constraint periods_bounds check (start_min <= start_max and end_min <= end_max and start_min <= end_min and start_max <= end_max),
  constraint periods_status check (status in ('active', 'withdrawn'))
);
create index if not exists periods_span_idx on graph.periods using gist (span);
create index if not exists periods_source_idx on graph.periods (source_id, source_revision);
alter table graph.periods enable row level security;
revoke all on graph.periods from anon, authenticated;

create table if not exists graph.node_external_ids (
  authority   text        not null,
  external_id text        not null,
  node_id     uuid        not null references graph.nodes (id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint node_external_ids_pkey primary key (authority, external_id),
  constraint node_external_ids_authority check (authority in ('wikidata', 'pleiades', 'tgn', 'geonames', 'periodo')),
  constraint node_external_ids_shape check (
    (authority = 'wikidata' and external_id ~ '^Q[0-9]+$')
    or (authority in ('pleiades', 'tgn', 'geonames') and external_id ~ '^[0-9]+$')
    or (authority = 'periodo' and external_id ~ '^[A-Za-z0-9_-]+$')
  )
);
create index if not exists node_external_ids_node_idx on graph.node_external_ids (node_id);
alter table graph.node_external_ids enable row level security;
revoke all on graph.node_external_ids from anon, authenticated;
