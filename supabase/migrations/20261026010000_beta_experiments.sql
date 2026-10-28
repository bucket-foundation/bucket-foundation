create table if not exists bucket.beta_experiment_cohorts (
  experiment text        not null check (experiment ~ '^[a-z0-9_]{1,32}$'),
  cohort     text        not null check (cohort ~ '^[a-z0-9_-]{1,32}$'),
  setting    text        not null check (setting ~ '^[a-z0-9_-]{1,32}$'),
  updated_at timestamptz not null default now(),
  primary key (experiment, cohort)
);

alter table bucket.beta_experiment_cohorts enable row level security;
alter table bucket.beta_experiment_cohorts force row level security;

revoke all on bucket.beta_experiment_cohorts from public, anon, authenticated;
grant select, insert, update, delete on bucket.beta_experiment_cohorts to service_role;

create table if not exists bucket.beta_assignments (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  experiment  text        not null check (experiment ~ '^[a-z0-9_]{1,32}$'),
  arm         text        not null check (arm ~ '^[a-z0-9_-]{1,32}$'),
  source      text        not null check (source in ('hash', 'cohort')),
  cohort      text        not null check (cohort ~ '^[a-z0-9_-]{1,32}$'),
  assigned_at timestamptz not null default now(),
  primary key (user_id, experiment)
);

alter table bucket.beta_assignments enable row level security;
alter table bucket.beta_assignments force row level security;

revoke all on bucket.beta_assignments from public, anon, authenticated;
grant select, insert, delete on bucket.beta_assignments to service_role;
