create table if not exists graph.nsm_colex (
  prime_a       text        not null references graph.nsm_primes (id) on delete cascade,
  prime_b       text        not null references graph.nsm_primes (id) on delete cascade,
  lang          text        not null check (lang ~ '^[a-z]{2,3}(-[a-z]{2,4})?$'),
  glottocode    text        not null,
  form          text        not null check (length(form) between 1 and 200),
  family_count  int         not null check (family_count >= 0),
  counted       boolean     not null,
  matched       boolean     not null,
  source        text        not null,
  run_id        text        not null,
  created_at    timestamptz not null default now(),
  primary key (prime_a, prime_b, lang),
  check (prime_a < prime_b)
);

create index if not exists nsm_colex_b_idx on graph.nsm_colex (prime_b);

alter table graph.nsm_exponents add column if not exists colex_with text[];
alter table graph.nsm_exponents add column if not exists confidence_before real check (confidence_before is null or (confidence_before >= 0 and confidence_before <= 1));

alter table graph.nsm_colex enable row level security;

drop policy if exists public_nsm_colex_select on graph.nsm_colex;
create policy public_nsm_colex_select on graph.nsm_colex for select to anon, authenticated using (true);

grant all on graph.nsm_colex to service_role;
revoke all on graph.nsm_colex from anon, authenticated;
grant select on graph.nsm_colex to anon, authenticated;
