\set ON_ERROR_STOP 1
set client_min_messages = warning;
begin;
\o /dev/null
\ir ../migrations/20261026000000_beta_events.sql
\ir ../migrations/20261112010000_founding_testers.sql
\o

do $$
declare
  early uuid := gen_random_uuid();
  late uuid := gen_random_uuid();
  outsider uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, created_at) values
    (early, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'early-' || early || '@bucket.test', '2026-11-01T00:00:00Z'),
    (late, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'late-' || late || '@bucket.test', '2026-12-15T00:00:00Z'),
    (outsider, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'out-' || outsider || '@bucket.test', '2026-10-01T00:00:00Z');
  insert into bucket.beta_testers (user_id, first_app) values (early, 'polingual'), (late, 'polingual');

  assert (select value from bucket.app_config where key = 'founding_cutoff') is null, 'the cutoff ships unset';
  assert bucket.is_founding_tester(early), 'an unset cutoff counts every beta tester';
  assert bucket.is_founding_tester(late), 'an unset cutoff counts every beta tester';
  assert not bucket.is_founding_tester(outsider), 'an account outside beta_testers never counts';
  assert not bucket.is_founding_tester(gen_random_uuid()), 'an unknown id never counts';

  update bucket.app_config set value = '2026-12-01T00:00:00Z' where key = 'founding_cutoff';
  assert bucket.is_founding_tester(early), 'an account made before the cutoff counts';
  assert not bucket.is_founding_tester(late), 'an account made after the cutoff does not count';
  assert not bucket.is_founding_tester(outsider), 'an account outside beta_testers never counts';

  assert not has_table_privilege('authenticated', 'bucket.app_config', 'select'), 'clients cannot read app_config';
  assert not has_table_privilege('anon', 'bucket.app_config', 'select'), 'clients cannot read app_config';
  assert not has_function_privilege('authenticated', 'bucket.is_founding_tester(uuid)', 'execute'), 'clients cannot call the check';
  assert has_function_privilege('service_role', 'bucket.is_founding_tester(uuid)', 'execute'), 'the server can call the check';
end $$;

\echo 'founding_testers.sql: all checks pass'
rollback;
