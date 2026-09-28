\o /dev/null
begin;

do $$
begin
  if (select split_part(extversion, '.', 1) || '.' || split_part(extversion, '.', 2) from pg_extension where extname = 'postgis') is distinct from '3.3' then
    raise exception 'postgis 3.3 is expected, found %', (select extversion from pg_extension where extname = 'postgis');
  end if;
end $$;

insert into graph.country_regions (adm0_a3, name, subregion, region, geom, source_sha256)
values
  ('ZZA', 'Fixture land', 'Southern Europe', 'Europe',
   extensions.st_multi(extensions.st_geomfromtext('POLYGON((-131 -41, -129 -41, -129 -39, -131 -39, -131 -41))', 4326))::extensions.geography, repeat('a', 64)),
  ('ZZB', 'Fixture ice', 'Antarctica', null,
   extensions.st_multi(extensions.st_geomfromtext('POLYGON((-121 -41, -119 -41, -119 -39, -121 -39, -121 -41))', 4326))::extensions.geography, repeat('a', 64));

do $$
begin
  if graph.region_for_point(-40, -130) is distinct from 'Europe' then raise exception 'an inland point was not covered'; end if;
  if graph.region_for_point(-40, -128.7) is distinct from 'Europe' then raise exception 'a coastal point 25 km offshore did not take the nearest region'; end if;
  if graph.region_for_point(-40, -128) is not null then raise exception 'a point 85 km offshore was placed'; end if;
  if graph.region_for_point(-40, -120) is not null then raise exception 'a point in an unmapped subregion was placed'; end if;
end $$;

insert into graph.history_reference_counts (run_date, kind, period, region, n) values ('1999-01-01', 'human', '1500 to 2100', 'Europe', 5);
do $$
begin
  begin
    insert into graph.history_reference_counts (run_date, kind, period, region, n) values ('1999-01-01', 'human', '2200 on', 'Europe', 1);
    raise exception 'an unknown period was stored';
  exception when check_violation then null;
  end;
  begin
    insert into graph.history_reference_counts (run_date, kind, period, region, n) values ('1999-01-01', 'ship', '0 to 999', 'Europe', 1);
    raise exception 'an unknown kind was stored';
  exception when check_violation then null;
  end;
end $$;

do $$
begin
  if exists (select 1 from graph.country_regions where adm0_a3 = 'GRC') then
    if graph.region_for_point(37.396, 25.268) is distinct from 'Europe' then raise exception 'Delos is outside Europe'; end if;
    if graph.region_for_point(0, -30) is not null then raise exception 'the mid-Atlantic was placed'; end if;
    if graph.region_for_point(29.979, 31.134) is distinct from 'Western Asia and Northern Africa' then raise exception 'Giza is misplaced'; end if;
    if graph.region_for_point(31.2, 29.92) is distinct from 'Western Asia and Northern Africa' then raise exception 'coastal Alexandria is misplaced'; end if;
  end if;
end $$;

rollback;
