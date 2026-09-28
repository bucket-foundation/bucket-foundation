begin;

do $$
declare
  v_user uuid := gen_random_uuid();
  v_n int;
  v_ok boolean;
begin
  insert into graph.advisor_space (model_version, model) values
    ('aaaaaaaaaaaaaaaa', '{"schema":"bucket.advisor-space/1"}'),
    ('bbbbbbbbbbbbbbbb', '{"schema":"bucket.advisor-space/1"}'),
    ('cccccccccccccccc', '{"schema":"bucket.advisor-space/1"}');
  update graph.advisor_space set created_at = now() - interval '3 days' where model_version = 'aaaaaaaaaaaaaaaa';
  update graph.advisor_space set created_at = now() - interval '2 days' where model_version = 'bbbbbbbbbbbbbbbb';
  insert into graph.advisor_public (model_version, openalex_id, name, orcid, scores) values
    ('bbbbbbbbbbbbbbbb', 'A1', 'One', '0000-0001-2345-6789', '{0.1,0.2}'),
    ('bbbbbbbbbbbbbbbb', 'A2', 'Two', null, '{0.3,0.4}'),
    ('cccccccccccccccc', 'A1', 'One', '0000-0001-2345-6789', '{0.1,0.2}'),
    ('cccccccccccccccc', 'A2', 'Two', null, '{0.3,0.4}');

  perform graph.advisor_activate('bbbbbbbbbbbbbbbb');
  select count(*) into v_n from graph.advisor_space where active;
  assert v_n = 1, 'exactly one active model';

  assert graph.advisor_request_optout(null, '0000-0001-2345-6789', 'someone@example.org', 'test', repeat('a', 64)) = 'hidden';
  select count(*) into v_n from graph.advisor_public where orcid = '0000-0001-2345-6789' and hidden;
  assert v_n = 2, format('orcid opt-out hides the row in both versions, got %s', v_n);
  select count(*) into v_n from graph.advisor_public where openalex_id = 'A1' and not hidden;
  assert v_n = 0, 'opted-out advisor is hidden everywhere';

  insert into graph.advisor_space (model_version, model) values ('dddddddddddddddd', '{"schema":"bucket.advisor-space/1"}');
  insert into graph.advisor_public (model_version, openalex_id, name, orcid, scores) values
    ('dddddddddddddddd', 'A1', 'One', '0000-0001-2345-6789', '{0.1,0.2}'),
    ('dddddddddddddddd', 'A2', 'Two', null, '{0.3,0.4}');
  perform graph.advisor_activate('dddddddddddddddd');
  select count(*) into v_n from graph.advisor_public where model_version = 'dddddddddddddddd' and openalex_id = 'A1' and not hidden;
  assert v_n = 0, 'a new model load keeps the opt-out';
  select count(*) into v_n from graph.advisor_space where model_version = 'aaaaaaaaaaaaaaaa';
  assert v_n = 0, 'versions beyond the two newest are pruned';
  select count(*) into v_n from graph.advisor_space where active and model_version = 'dddddddddddddddd';
  assert v_n = 1, 'the new model is active';

  begin
    perform graph.advisor_activate('eeeeeeeeeeeeeeee');
    assert false, 'activating a missing model must fail';
  exception when sqlstate '22023' then null;
  end;

  begin
    insert into graph.advisor_optouts (contact) values ('x@y.z');
    assert false, 'an opt-out needs an id';
  exception when check_violation then null;
  end;

  for i in 1..4 loop
    perform graph.advisor_request_optout('A99' || i, null, 'bulk@example.org', '', repeat('b', 64), 3, 100);
  end loop;
  select count(*) into v_n from graph.advisor_optouts where contact = 'bulk@example.org';
  assert v_n = 3, format('one source gets 3 requests an hour, got %s', v_n);
  assert graph.advisor_request_optout('A9999', null, 'bulk@example.org', '', repeat('b', 64), 3, 100) = 'rate_limited';
  assert graph.advisor_request_optout('A8888', null, 'other@example.org', '', repeat('c', 64), 5, 0) = 'queued', 'over the daily hide budget the request queues';
  select count(*) into v_n from graph.advisor_optouts where openalex_id = 'A8888' and status = 'queued';
  assert v_n = 1, 'the queued request is recorded';

  insert into auth.users (id, email) values (v_user, 'advisor-test-' || v_user || '@example.org');
  assert graph.advisor_match_take(v_user, repeat('1', 64), 2, 3) = 'ok', 'first text';
  assert graph.advisor_match_take(v_user, repeat('1', 64), 2, 3) = 'ok', 'second page of the same text is free of the text cap';
  assert graph.advisor_match_take(v_user, repeat('1', 64), 2, 3) = 'ok', 'third page';
  assert graph.advisor_match_take(v_user, repeat('1', 64), 2, 3) = 'over_pages', 'pages per text are capped';
  assert graph.advisor_match_take(v_user, repeat('2', 64), 2, 3) = 'ok', 'second text';
  assert graph.advisor_match_take(v_user, repeat('3', 64), 2, 3) = 'over_cap', 'a third text is refused at any offset';

  insert into bucket.advisor_swipes (user_id, openalex_id, decision) values (v_user, 'A2', 'yes');
  begin
    insert into bucket.advisor_swipes (user_id, openalex_id, decision) values (v_user, 'A3', 'love');
    assert false, 'decision is constrained';
  exception when check_violation then null;
  end;
  delete from auth.users where id = v_user;
  select count(*) into v_n from bucket.advisor_swipes where user_id = v_user;
  assert v_n = 0, 'swipes go with the account';
  select count(*) into v_n from graph.advisor_match_usage where subject = v_user;
  assert v_n = 0, 'usage goes with the account';

  perform graph.advisor_load(
    '{"schema":"bucket.advisor-space/1","version":"ffffffffffffffff","k":2}',
    '[{"openalex_id":"A1","name":"One","orcid":"0000-0001-2345-6789","scores":[0.1,0.2],"topics":["t"],"links":{"openalex":"https://openalex.org/A1"}},
      {"openalex_id":"A7","name":"Seven","scores":[0.5,0.6],"topics":[],"links":{}}]');
  select count(*) into v_n from graph.advisor_public where model_version = 'ffffffffffffffff' and not hidden;
  assert v_n = 1, format('the loader keeps opt-outs hidden, visible %s', v_n);
  select count(*) into v_n from graph.advisor_space where active and model_version = 'ffffffffffffffff';
  assert v_n = 1, 'the loader activates its model';
  begin
    perform graph.advisor_load('{"schema":"bucket.advisor-space/1","version":"1111111111111111","k":3}',
      '[{"openalex_id":"A1","name":"One","scores":[0.1,0.2]}]');
    assert false, 'wrong score length must fail';
  exception when sqlstate '22023' then null;
  end;
  select count(*) into v_n from graph.advisor_space where model_version = '1111111111111111';
  assert v_n = 0, 'a failed load leaves nothing behind';

  assert not has_table_privilege('authenticated', 'graph.advisor_public', 'select'), 'authenticated cannot read advisor_public';
  assert not has_table_privilege('anon', 'graph.advisor_optouts', 'insert'), 'anon cannot write opt-outs directly';
  assert not has_table_privilege('authenticated', 'bucket.advisor_swipes', 'select'), 'authenticated cannot read swipes directly';
end
$$;

rollback;
