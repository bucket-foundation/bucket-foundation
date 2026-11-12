begin;

\ir ../migrations/20261102000000_learning_groups.sql
\ir ../migrations/20261105000100_group_moderation.sql
\ir ../migrations/20261107000001_group_shared_items.sql
\ir ../migrations/20261112000001_group_voice_notes.sql
\ir ../migrations/20261112000001_group_voice_notes.sql

grant usage on schema bucket to authenticated;

create temporary table t_people (who text primary key, id uuid not null) on commit drop;
grant select on t_people to authenticated;

insert into t_people (who, id) select w, gen_random_uuid() from unnest(array['owner', 'mate', 'stranger']) w;

insert into auth.users (id, instance_id, aud, role, email)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'voice-' || id || '@bucket.test'
from t_people;

insert into bucket.learning_groups (id, name, kind, owner_id, invite_code)
select gen_random_uuid(), 'Rossi family', 'family', id, '7K3M9QX2PE' from t_people where who = 'owner';

insert into bucket.group_members (group_id, user_id, role, display_name)
select (select id from bucket.learning_groups where invite_code = '7K3M9QX2PE'), id, case who when 'owner' then 'owner' else 'member' end, who
from t_people where who in ('owner', 'mate');

create function pg_temp.person(w text) returns uuid language sql as $$ select id from t_people where who = w $$;

create function pg_temp.sees(who text, item uuid) returns boolean language plpgsql as $$
declare
  seen boolean;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.person(who), 'role', 'authenticated')::text, true);
  set local role authenticated;
  select exists (select 1 from bucket.group_shared_items i where i.id = item) into seen;
  reset role;
  return seen;
end $$;

create function pg_temp.raises(stmt text, code text) returns boolean language plpgsql as $$
begin
  execute stmt;
  return false;
exception when others then
  return sqlerrm like '%' || code || '%';
end $$;

do $$
declare
  g uuid := (select id from bucket.learning_groups where invite_code = '7K3M9QX2PE');
  owner uuid := pg_temp.person('owner');
  mate uuid := pg_temp.person('mate');
  stranger uuid := pg_temp.person('stranger');
  note uuid;
  silent uuid;
begin
  assert not has_function_privilege('authenticated', 'bucket.send_voice_note(uuid, uuid, text, text, int, text)', 'execute'), 'clients cannot send voice notes';
  assert not has_function_privilege('authenticated', 'bucket.cache_voice_translation(uuid, text, text)', 'execute'), 'clients cannot write translations';

  select id into note from bucket.send_voice_note(g, owner, 'ciao a tutti', g || '/n.m4a', 4200, 'it');
  assert pg_temp.sees('mate', note), 'members see a voice note';
  assert not pg_temp.sees('stranger', note), 'strangers see no voice note';
  select id into silent from bucket.send_voice_note(g, mate, null, g || '/s.m4a', 900, 'en');
  assert silent is not null, 'a voice note may have no transcript';

  assert pg_temp.raises(format('select bucket.send_voice_note(%L, %L, null, %L, 900, %L)', g, stranger, g || '/x.m4a', 'en'), 'not_member'), 'strangers cannot send';
  assert pg_temp.raises(format('select bucket.send_voice_note(%L, %L, null, %L, 60001, %L)', g, owner, g || '/x.m4a', 'en'), 'check'), 'sixty seconds at most';
  assert pg_temp.raises(format('select bucket.send_voice_note(%L, %L, null, null, 900, %L)', g, owner, 'en'), 'check'), 'a voice note needs audio';
  assert pg_temp.raises(format('select bucket.send_voice_note(%L, %L, null, %L, 900, %L)', g, owner, g || '/x.m4a', 'EN-us'), 'check'), 'language codes are lowercase';
  assert pg_temp.raises(format('select bucket.send_shared_item(%L, %L, null, %L, null, null, null)', g, owner, 'voice'), 'check'), 'the old send path cannot make a voice note';
  perform bucket.send_shared_item(g, owner, null, 'text', null, 'still works', null);

  perform bucket.cache_voice_translation(note, 'fr', 'salut tout le monde');
  perform bucket.cache_voice_translation(note, 'de', 'hallo zusammen');
  assert (select translations = '{"fr": "salut tout le monde", "de": "hallo zusammen"}'::jsonb from bucket.group_shared_items where id = note), 'translations cache per language';

  assert bucket.report_shared_item(note, mate, 'harassment') = 1, 'a voice note takes a report';
  assert not pg_temp.sees('owner', note), 'a reported voice note is held';
  assert bucket.moderate_shared_item(note, 'remove') = 'removed', 'a moderator removes the voice note';
  assert exists (select 1 from bucket.group_share_purge where path = g || '/n.m4a'), 'removing a voice note queues its audio';

  assert bucket.remove_shared_item(silent, mate), 'the sender removes a voice note';
  assert exists (select 1 from bucket.group_share_purge where path = g || '/s.m4a'), 'self removal queues the audio';
end $$;

rollback;
