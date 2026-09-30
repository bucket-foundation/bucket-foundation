-- Run: psql "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/research_os_marketing_reports.sql
begin;

create temporary table t_m (owner uuid, other uuid, imp uuid, node uuid, pubimp uuid) on commit drop;
grant all on t_m to authenticated, anon;

insert into auth.users (id, instance_id, aud, role, email)
values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mkt-owner-' || gen_random_uuid() || '@bucket.test'),
       (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mkt-other-' || gen_random_uuid() || '@bucket.test');

insert into t_m (owner, other)
select (select id from auth.users where email like 'mkt-owner-%' order by created_at desc limit 1),
       (select id from auth.users where email like 'mkt-other-%' order by created_at desc limit 1);

with i as (
  insert into graph.imports (owner_id, kind, title, source, node_id)
  select owner, 'dataset', 'Marketing fixture', '{"marketing": true}'::jsonb, null from t_m
  returning id
)
update t_m set imp = (select id from i);

do $$
declare o uuid; i uuid; h text := repeat('b', 64);
begin
  select owner, imp into o, i from t_m;
  insert into graph.import_files (import_id, owner_id, sha256, bytes, media_type) values (i, o, h, 10, 'text/csv');
  insert into graph.marketing_reports (import_id, owner_id, input_digest, analyzer_version, key_id, iv, ciphertext)
  values (i, o, repeat('c', 64), repeat('d', 16), 'k1', decode(repeat('00', 12), 'hex'), decode(repeat('11', 40), 'hex'));
  begin
    insert into graph.marketing_reports (import_id, owner_id, input_digest, analyzer_version, key_id, iv, ciphertext)
    values (i, o, repeat('c', 64), repeat('d', 16), 'k1', decode(repeat('00', 12), 'hex'), decode(repeat('11', 40), 'hex'));
    raise exception 'duplicate report was accepted';
  exception when unique_violation then null;
  end;
end $$;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select other from t_m), 'role', 'authenticated')::text, true);
do $$
begin
  perform 1 from graph.marketing_reports;
  raise exception 'authenticated read graph.marketing_reports';
exception when insufficient_privilege then null;
end $$;
reset role;

select set_config('request.jwt.claims', json_build_object('sub', (select other from t_m), 'role', 'authenticated')::text, true);
do $$
begin
  if graph.can_read_import_object((select owner from t_m)::text || '/' || repeat('b', 64)) then
    raise exception 'another account can read a marketing object';
  end if;
end $$;

select set_config('request.jwt.claims', json_build_object('sub', (select owner from t_m), 'role', 'authenticated')::text, true);
do $$
begin
  if graph.can_read_import_object((select owner from t_m)::text || '/' || repeat('b', 64)) then
    raise exception 'a marketing object is readable through the node path with no node';
  end if;
end $$;

set local role anon;
do $$
begin
  perform 1 from graph.marketing_reports;
  raise exception 'anon read graph.marketing_reports';
exception when insufficient_privilege then null;
end $$;
reset role;

delete from graph.imports where id = (select imp from t_m);
do $$
begin
  if exists (select 1 from graph.marketing_reports r join t_m on r.import_id = t_m.imp) then
    raise exception 'report survived its import';
  end if;
  if exists (select 1 from graph.import_files f join t_m on f.import_id = t_m.imp) then
    raise exception 'file row survived its import';
  end if;
end $$;

rollback;
