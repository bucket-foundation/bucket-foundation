insert into bucket.beta_testers (user_id, first_app)
select u.id, case when exists (select 1 from bucket.identities i where i.user_id = u.id) then 'bucket' else 'polingual' end
from auth.users u
on conflict (user_id) do nothing;

create or replace function bucket.enroll_beta_tester()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    insert into bucket.beta_testers (user_id, first_app) values (new.id, 'polingual')
    on conflict (user_id) do nothing;
  exception when others then
    raise warning 'beta enroll failed for %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

revoke all on function bucket.enroll_beta_tester() from public, anon, authenticated;

drop trigger if exists enroll_beta_tester on auth.users;
create trigger enroll_beta_tester
  after insert on auth.users
  for each row execute function bucket.enroll_beta_tester();
