\set ON_ERROR_STOP 1
set client_min_messages = warning;
begin;
\o /dev/null
\ir ../migrations/20261109000000_stoa_live.sql
\ir ../migrations/20261109000001_stoa_live_functions.sql
\ir ../migrations/20261109000008_stoa_live_translate.sql
\o

do $$
declare
  host uuid := gen_random_uuid();
  qs jsonb := '[{"idx":0,"round":1,"kind":"translate","prompt":{"word":"ocho","from":"es","to":"fr"},"options":["huit","sept","neuf","six"],"answer":0}]';
begin
  insert into auth.users (id, instance_id, aud, role, email)
  values (host, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stoa-' || host || '@bucket.test');
  perform bucket.live_create_room(gen_random_uuid(), host, 'TRAN58', 'polingual', '{"rounds": 1, "per_round": 1}', 1, 'v1.' || repeat('x', 40), repeat('A', 43), qs);
  assert (select kind from bucket.live_questions q join bucket.live_rooms r on r.id = q.room_id where r.code = 'TRAN58') = 'translate', 'a room stores Translate questions';
  begin
    perform bucket.live_create_room(gen_random_uuid(), host, 'TRAN59', 'polingual', '{"rounds": 1, "per_round": 1}', 1, 'v1.' || repeat('x', 40), repeat('A', 43),
      jsonb_set(qs, '{0,kind}', '"shared_root"'));
    assert false, 'an unknown kind is refused';
  exception when check_violation then
    null;
  end;
  begin
    perform bucket.live_create_room(gen_random_uuid(), host, 'TRAN5A', 'polingual', '{"rounds": 1, "per_round": 1}', 1, 'v1.' || repeat('x', 40), repeat('A', 43),
      jsonb_set(qs, '{0,prompt}', '{"word":"ocho"}'));
    assert false, 'a Translate prompt needs word, from and to';
  exception when check_violation then
    null;
  end;
  begin
    perform bucket.live_create_room(gen_random_uuid(), host, 'TRAN5B', 'polingual', '{"rounds": 1, "per_round": 1}', 1, 'v1.' || repeat('x', 40), repeat('A', 43),
      jsonb_set(qs, '{0,prompt}', '{"word":"ocho","from":"es","to":"es"}'));
    assert false, 'a Translate prompt goes between two languages';
  exception when check_violation then
    null;
  end;
end $$;

\echo 'stoa_translate.sql: all checks pass'
rollback;
