begin;

\ir ../migrations/20261102000000_learning_groups.sql
\ir ../migrations/20261105000100_group_moderation.sql
\ir ../migrations/20261107000000_group_shared_items.sql
\ir ../migrations/20261107000000_group_shared_items.sql

grant usage on schema bucket to authenticated;

create temporary table t_people (who text primary key, id uuid not null) on commit drop;
grant select on t_people to authenticated;

insert into t_people (who, id) select w, gen_random_uuid() from unnest(array['owner', 'mate', 'third', 'stranger']) w;

insert into auth.users (id, instance_id, aud, role, email)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'share-' || id || '@bucket.test'
from t_people;

insert into bucket.learning_groups (id, name, kind, owner_id, invite_code)
select gen_random_uuid(), 'Rossi family', 'family', id, '7K3M9QX2PD' from t_people where who = 'owner'
returning id \gset group_

insert into bucket.group_members (group_id, user_id, role, display_name)
select :'group_id'::uuid, id, case who when 'owner' then 'owner' else 'member' end, who
from t_people where who in ('owner', 'mate', 'third');

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
  g uuid := (select id from bucket.learning_groups where invite_code = '7K3M9QX2PD');
  owner uuid := pg_temp.person('owner');
  mate uuid := pg_temp.person('mate');
  third uuid := pg_temp.person('third');
  stranger uuid := pg_temp.person('stranger');
  link uuid;
  direct uuid;
  pic uuid;
  doomed uuid;
  n int;
begin
  assert (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'bucket.group_shared_items'::regclass), 'items force row level security';
  assert (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'bucket.group_item_reports'::regclass), 'reports force row level security';
  assert not has_function_privilege('authenticated', 'bucket.send_shared_item(uuid, uuid, uuid, text, text, text, text)', 'execute'), 'clients cannot call send';
  assert not has_table_privilege('authenticated', 'bucket.group_shared_items', 'insert'), 'clients cannot insert items';

  select id into link from bucket.send_shared_item(g, owner, null, 'url', 'https://polingual.com', null, null);
  select id into direct from bucket.send_shared_item(g, owner, mate, 'text', null, 'ciao', null);

  assert pg_temp.sees('mate', link) and pg_temp.sees('third', link), 'members see group items';
  assert not pg_temp.sees('stranger', link), 'strangers see nothing';
  assert pg_temp.sees('mate', direct) and pg_temp.sees('owner', direct), 'both parties see a direct item';
  assert not pg_temp.sees('third', direct), 'a direct item stays between two people';

  assert pg_temp.raises(format('select bucket.send_shared_item(%L, %L, null, %L, %L, null, null)', g, stranger, 'url', 'https://x.test'), 'not_member'), 'strangers cannot send';
  assert pg_temp.raises(format('select bucket.send_shared_item(%L, %L, %L, %L, null, %L, null)', g, owner, owner, 'text', 'hi'), 'self'), 'no direct item to self';
  assert pg_temp.raises(format('select bucket.send_shared_item(%L, %L, null, %L, %L, null, null)', g, owner, 'url', 'javascript:alert(1)'), 'check'), 'only web links';

  perform bucket.block_member(mate, owner, 'owner');
  assert not pg_temp.sees('mate', link), 'blocking hides the sender items';
  assert pg_temp.raises(format('select bucket.send_shared_item(%L, %L, %L, %L, null, %L, null)', g, owner, mate, 'text', 'hi'), 'not_member'), 'blocked people cannot send direct items';
  delete from bucket.group_blocks where blocker_id = mate;
  assert pg_temp.sees('mate', link), 'unblocking restores the items';

  n := bucket.report_shared_item(link, mate, 'spam');
  assert n = 1, 'first report counted';
  assert not pg_temp.sees('mate', link), 'a reporter stops seeing the item';
  assert not pg_temp.sees('third', link) and not pg_temp.sees('owner', link), 'one report holds the item for everyone';
  assert pg_temp.raises(format('select bucket.report_shared_item(%L, %L, %L)', link, third, 'spam'), 'not_found'), 'held items take no more reports';
  assert bucket.moderate_shared_item(link, 'restore') = 'restored', 'a moderator restores the item';
  assert pg_temp.sees('third', link) and not pg_temp.sees('mate', link), 'restored items return for everyone except the reporter';
  assert (select reviewed_at is not null from bucket.group_item_reports where item_id = link), 'restoring marks the report reviewed';

  select id into pic from bucket.send_shared_item(g, owner, mate, 'image', null, null, g || '/pic.jpg');
  assert pg_temp.sees('mate', pic), 'the recipient sees a direct image';
  assert bucket.report_shared_item(pic, mate, 'harassment') = 1, 'a direct item takes a report';
  assert not pg_temp.sees('owner', pic), 'a reported direct item is held for the sender too';
  assert bucket.moderate_shared_item(pic, 'remove') = 'removed', 'a moderator removes the item';
  assert (select removed_at is not null from bucket.group_shared_items where id = pic), 'removal is recorded';
  assert exists (select 1 from bucket.group_share_purge where path = g || '/pic.jpg'), 'removing an image queues its file for deletion';
  assert pg_temp.raises(format('select bucket.moderate_shared_item(%L, %L)', pic, 'delete'), 'bad_action'), 'only remove or restore';

  assert not bucket.remove_shared_item(direct, third), 'others cannot remove an item';
  assert bucket.remove_shared_item(direct, mate) = false, 'recipients cannot remove an item';
  assert bucket.remove_shared_item(direct, owner), 'the sender removes an item';
  assert not pg_temp.sees('mate', direct), 'removed items are hidden';

  for i in 1..27 loop
    perform bucket.send_shared_item(g, owner, null, 'text', null, 'n' || i, null);
  end loop;
  assert pg_temp.raises(format('select bucket.send_shared_item(%L, %L, null, %L, null, %L, null)', g, owner, 'text', 'one more'), 'share_limit'), 'thirty items an hour';

  select id into doomed from bucket.send_shared_item(g, mate, null, 'image', null, null, g || '/gone.jpg');
  delete from auth.users where id = mate;
  assert not exists (select 1 from bucket.group_shared_items where id = doomed), 'account deletion removes the items';
  assert exists (select 1 from bucket.group_share_purge where path = g || '/gone.jpg'), 'account deletion queues the files';
end $$;

rollback;
