begin;
\i supabase/migrations/20261123160000_auth_user_by_email.sql
insert into auth.users (id, email, raw_app_meta_data, created_at) values
  ('00000000-0000-0000-0000-0000000000a1', 'Mixed@Case.Example', '{"provider":"email"}', now()),
  ('00000000-0000-0000-0000-0000000000a2', 'bound@case.example', '{"google_sub":"g-1"}', now());
do $$
declare r jsonb; s text;
begin
  r := bucket.auth_user_by_email('  MIXED@case.example ');
  if r ->> 'id' <> '00000000-0000-0000-0000-0000000000a1' then raise exception 'lookup by lower(email) failed: %', r; end if;
  if bucket.auth_user_by_email('absent@case.example') is not null then raise exception 'absent email returned a row'; end if;
  s := bucket.bind_google_sub('00000000-0000-0000-0000-0000000000a1', 'g-new');
  if s <> 'g-new' then raise exception 'first bind returned %', s; end if;
  s := bucket.bind_google_sub('00000000-0000-0000-0000-0000000000a1', 'g-other');
  if s <> 'g-new' then raise exception 'second bind overwrote: %', s; end if;
  if (select raw_app_meta_data ->> 'provider' from auth.users where id = '00000000-0000-0000-0000-0000000000a1') <> 'email' then raise exception 'bind dropped app_metadata keys'; end if;
  if bucket.bind_google_sub('00000000-0000-0000-0000-0000000000a2', 'g-2') <> 'g-1' then raise exception 'bound user rebound'; end if;
  if bucket.bind_google_sub('00000000-0000-0000-0000-0000000000ff', 'g-x') is not null then raise exception 'missing user returned a sub'; end if;
  if has_function_privilege('anon', 'bucket.auth_user_by_email(text)', 'execute') then raise exception 'anon can run lookup'; end if;
  if has_function_privilege('authenticated', 'bucket.bind_google_sub(uuid, text)', 'execute') then raise exception 'authenticated can run bind'; end if;
  raise notice 'auth_user_by_email: all checks passed';
end $$;
rollback;
