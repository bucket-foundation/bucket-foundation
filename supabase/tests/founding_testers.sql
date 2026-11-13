\set ON_ERROR_STOP 1
set client_min_messages = warning;
begin;
\o /dev/null
\ir ../migrations/20261026000000_beta_events.sql
\o
do $$ begin
  insert into auth.users (id, instance_id, aud, role, email, created_at) values
    ('aaaaaaaa-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'AppReview@bucket.foundation', '2026-10-01T00:00:00Z'),
    ('aaaaaaaa-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'appreview2@bucket.foundation', '2026-10-01T00:00:00Z');
end $$;
\o /dev/null
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
  insert into bucket.beta_testers (user_id, first_app) values (early, 'polingual'), (late, 'polingual'),
    ('aaaaaaaa-0000-4000-8000-000000000001', 'polingual'), ('aaaaaaaa-0000-4000-8000-000000000002', 'polingual');

  assert (select value from bucket.app_config where key = 'founding_cutoff') is null, 'the cutoff ships unset';
  assert not bucket.is_founding_tester(early), 'an unset cutoff grants no one';
  assert not bucket.is_founding_tester(late), 'an unset cutoff grants no one';
  assert (select count(*) from bucket.founding_exclude) = 2, 'the migration seeds the App Review accounts';
  assert not bucket.is_founding_tester(outsider), 'an account outside beta_testers never counts';
  assert not bucket.is_founding_tester(gen_random_uuid()), 'an unknown id never counts';

  update bucket.app_config set value = '2026-12-01T00:00:00Z' where key = 'founding_cutoff';
  assert bucket.is_founding_tester(early), 'an account made before the cutoff counts';
  assert not bucket.is_founding_tester(late), 'an account made after the cutoff does not count';
  assert not bucket.is_founding_tester(outsider), 'an account outside beta_testers never counts';
  assert not bucket.is_founding_tester('aaaaaaaa-0000-4000-8000-000000000001'), 'an App Review account never counts';
  assert not bucket.is_founding_tester('aaaaaaaa-0000-4000-8000-000000000002'), 'an App Review account never counts';
  delete from bucket.founding_exclude where user_id = 'aaaaaaaa-0000-4000-8000-000000000002';
  assert bucket.is_founding_tester('aaaaaaaa-0000-4000-8000-000000000002'), 'the exclusion is what blocks the review account';
  update bucket.app_config set value = '' where key = 'founding_cutoff';
  assert not bucket.is_founding_tester(early), 'a blank cutoff grants no one';

  assert not has_table_privilege('authenticated', 'bucket.app_config', 'select'), 'clients cannot read app_config';
  assert not has_table_privilege('anon', 'bucket.app_config', 'select'), 'clients cannot read app_config';
  assert not has_function_privilege('authenticated', 'bucket.is_founding_tester(uuid)', 'execute'), 'clients cannot call the check';
  assert not has_table_privilege('authenticated', 'bucket.founding_exclude', 'select'), 'clients cannot read founding_exclude';
  assert has_function_privilege('service_role', 'bucket.is_founding_tester(uuid)', 'execute'), 'the server can call the check';
end $$;

\echo 'founding_testers.sql: all checks pass'
rollback;
