create or replace function bucket.experiment_enrolments_cascade_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_catalog.pg_trigger_depth() > 1 then
    return old;
  end if;
  raise exception 'experiment enrolments are deleted only with the account';
end;
$$;

create or replace function bucket.experiment_enrolments_no_truncate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'experiment enrolments cannot be truncated';
end;
$$;

drop trigger if exists experiment_enrolments_no_delete on bucket.experiment_enrolments;
create trigger experiment_enrolments_no_delete
  before delete on bucket.experiment_enrolments
  for each row execute function bucket.experiment_enrolments_cascade_only();

drop trigger if exists experiment_enrolments_no_truncate on bucket.experiment_enrolments;
create trigger experiment_enrolments_no_truncate
  before truncate on bucket.experiment_enrolments
  for each statement execute function bucket.experiment_enrolments_no_truncate();
