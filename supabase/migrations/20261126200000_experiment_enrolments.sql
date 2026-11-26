create table if not exists bucket.experiment_enrolments (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  experiment  text        not null check (experiment ~ '^[a-z0-9-]{1,40}$'),
  unit        text        not null check (char_length(unit) <= 128),
  arm         text        not null check (arm ~ '^[a-z0-9_-]{1,32}$'),
  stratum     text        not null check (stratum in ('to-a2', 'past-a2')),
  enrolled_at timestamptz not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, experiment)
);

alter table bucket.experiment_enrolments enable row level security;

revoke all on bucket.experiment_enrolments from anon, authenticated;

create or replace function bucket.experiment_enrolments_frozen()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'experiment enrolments are frozen';
end;
$$;

drop trigger if exists experiment_enrolments_frozen on bucket.experiment_enrolments;
create trigger experiment_enrolments_frozen
  before update on bucket.experiment_enrolments
  for each row execute function bucket.experiment_enrolments_frozen();
