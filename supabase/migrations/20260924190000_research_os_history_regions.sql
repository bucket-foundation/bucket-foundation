create extension if not exists postgis with schema extensions;

create table if not exists graph.country_regions (
  adm0_a3       text        primary key,
  name          text        not null,
  subregion     text        not null,
  region        text,
  wikidata_qid  text,
  geom          extensions.geography(MultiPolygon, 4326) not null,
  source_sha256 text        not null,
  loaded_at     timestamptz not null default now(),
  constraint country_regions_adm0 check (adm0_a3 ~ '^[A-Z0-9]{3}$'),
  constraint country_regions_qid check (wikidata_qid is null or wikidata_qid ~ '^Q[0-9]+$'),
  constraint country_regions_sha check (source_sha256 ~ '^[0-9a-f]{64}$'),
  constraint country_regions_region check (region is null or region in (
    'Europe', 'Northern America', 'Latin America and Caribbean', 'Western Asia and Northern Africa',
    'Sub-Saharan Africa', 'Central and Southern Asia', 'Eastern and South-eastern Asia with Oceania'
  ))
);
create index if not exists country_regions_geom_idx on graph.country_regions using gist (geom);
alter table graph.country_regions enable row level security;
revoke all on graph.country_regions from anon, authenticated;

alter table graph.places add column if not exists geom extensions.geography(Point, 4326)
  generated always as (extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography) stored;
alter table graph.places add column if not exists region text;
create index if not exists places_geom_idx on graph.places using gist (geom);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'places_region') then
    alter table graph.places add constraint places_region check (region is null or region in (
      'Europe', 'Northern America', 'Latin America and Caribbean', 'Western Asia and Northern Africa',
      'Sub-Saharan Africa', 'Central and Southern Asia', 'Eastern and South-eastern Asia with Oceania'
    ));
  end if;
end $$;

create or replace function graph.region_for_point(p_lat double precision, p_lng double precision)
returns text
language sql
stable
set search_path = ''
as $$
  with pt as (
    select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography as g
  ), covering as (
    select a.region from graph.country_regions a, pt
    where a.region is not null and extensions.st_covers(a.geom, pt.g)
    order by a.adm0_a3
    limit 1
  ), nearest as (
    select a.region from graph.country_regions a, pt
    where a.region is not null and extensions.st_dwithin(a.geom, pt.g, 50000)
    order by extensions.st_distance(a.geom, pt.g), a.adm0_a3
    limit 1
  )
  select coalesce((select region from covering), (select region from nearest));
$$;

create or replace function graph.assign_place_regions()
returns jsonb
language plpgsql
security definer
set search_path = graph, pg_temp
as $$
declare
  v_changed integer;
  v_unplaced integer;
begin
  with next as (
    select p.id, graph.region_for_point(p.lat, p.lng) as region from graph.places p
  )
  update graph.places p set region = next.region
    from next
    where next.id = p.id and p.region is distinct from next.region;
  get diagnostics v_changed = row_count;
  select count(*) into v_unplaced from graph.places where region is null;
  return jsonb_build_object('changed', v_changed, 'unplaced', v_unplaced, 'places', (select count(*) from graph.places));
end;
$$;

create or replace function graph.load_country_regions(p_rows jsonb, p_sha256 text)
returns jsonb
language plpgsql
security definer
set search_path = graph, extensions, pg_temp
as $$
declare
  r jsonb;
  v_upserted integer := 0;
  v_removed integer;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'load_country_regions: p_rows must be a json array' using errcode = '22023';
  end if;
  for r in select value from jsonb_array_elements(p_rows) loop
    insert into graph.country_regions (adm0_a3, name, subregion, region, wikidata_qid, geom, source_sha256)
    values (
      r->>'adm0_a3', r->>'name', r->>'subregion', nullif(r->>'region', ''), nullif(r->>'wikidata_qid', ''),
      extensions.st_multi(extensions.st_setsrid(extensions.st_geomfromgeojson(r->>'geometry'), 4326))::extensions.geography,
      p_sha256
    )
    on conflict (adm0_a3) do update set
      name = excluded.name, subregion = excluded.subregion, region = excluded.region,
      wikidata_qid = excluded.wikidata_qid, geom = excluded.geom, source_sha256 = excluded.source_sha256, loaded_at = now()
    where graph.country_regions.source_sha256 is distinct from excluded.source_sha256;
    if found then
      v_upserted := v_upserted + 1;
    end if;
  end loop;
  delete from graph.country_regions where source_sha256 <> p_sha256;
  get diagnostics v_removed = row_count;
  return jsonb_build_object('upserted', v_upserted, 'removed', v_removed, 'total', (select count(*) from graph.country_regions));
end;
$$;

revoke all on function graph.load_country_regions(jsonb, text) from public, anon, authenticated;
grant execute on function graph.load_country_regions(jsonb, text) to service_role;

create or replace function graph.regions_for_points(p_points jsonb)
returns table (k text, region text)
language sql
stable
security definer
set search_path = ''
as $$
  select p->>'k', graph.region_for_point((p->>'lat')::double precision, (p->>'lng')::double precision)
  from jsonb_array_elements(p_points) p;
$$;

revoke all on function graph.regions_for_points(jsonb) from public, anon, authenticated;
grant execute on function graph.regions_for_points(jsonb) to service_role;

create table if not exists graph.history_reference_counts (
  run_date  date        not null,
  kind      text        not null,
  period    text        not null,
  region    text        not null,
  n         bigint      not null,
  loaded_at timestamptz not null default now(),
  constraint history_reference_counts_pkey primary key (run_date, kind, period, region),
  constraint history_reference_counts_kind check (kind in ('human', 'site', 'event')),
  constraint history_reference_counts_period check (period in ('before -3000', '-3000 to -1001', '-1000 to -1', '0 to 999', '1000 to 1499', '1500 to 2100')),
  constraint history_reference_counts_region check (region in (
    'Europe', 'Northern America', 'Latin America and Caribbean', 'Western Asia and Northern Africa',
    'Sub-Saharan Africa', 'Central and Southern Asia', 'Eastern and South-eastern Asia with Oceania', 'unplaced'
  )),
  constraint history_reference_counts_n check (n >= 0)
);
alter table graph.history_reference_counts enable row level security;
revoke all on graph.history_reference_counts from anon, authenticated;

revoke all on function graph.region_for_point(double precision, double precision) from public, anon, authenticated;
revoke all on function graph.assign_place_regions() from public, anon, authenticated;
grant execute on function graph.region_for_point(double precision, double precision) to service_role;
grant execute on function graph.assign_place_regions() to service_role;
