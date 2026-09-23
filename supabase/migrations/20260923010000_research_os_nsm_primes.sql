create table if not exists graph.nsm_primes (
  id           text        primary key check (id ~ '^[a-z_]{1,40}$'),
  label        text        not null check (length(label) between 1 and 60),
  category     text        not null check (length(category) between 1 and 80),
  english      text[]      not null default '{}',
  ord          int         not null check (ord between 1 and 200),
  en_word      text,
  en_pos       text,
  sense        text,
  sense_match  boolean,
  created_at   timestamptz not null default now()
);

create unique index if not exists nsm_primes_ord_uq on graph.nsm_primes (ord);

create table if not exists graph.nsm_exponents (
  prime_id     text        not null references graph.nsm_primes (id) on delete cascade,
  lang         text        not null check (lang ~ '^[a-z]{2,3}(-[a-z]{2,4})?$'),
  word         text        not null check (length(word) between 1 and 200),
  rank         smallint    not null check (rank between 1 and 9),
  roman        text,
  sense        text,
  sense_match  boolean     not null,
  confidence   real        not null default 1 check (confidence >= 0 and confidence <= 1),
  root_confidence real     not null default 0 check (root_confidence >= 0 and root_confidence <= 1),
  root_lang    text,
  root_form    text,
  root_gloss   text,
  source       text        not null,
  run_id       text        not null,
  created_at   timestamptz not null default now(),
  primary key (prime_id, lang, word)
);

alter table graph.nsm_exponents add column if not exists root_confidence real not null default 0 check (root_confidence >= 0 and root_confidence <= 1);

create index if not exists nsm_exponents_lang_idx on graph.nsm_exponents (lang);

alter table graph.nsm_primes enable row level security;
alter table graph.nsm_exponents enable row level security;

drop policy if exists public_nsm_primes_select on graph.nsm_primes;
create policy public_nsm_primes_select on graph.nsm_primes for select to anon, authenticated using (true);

drop policy if exists public_nsm_exponents_select on graph.nsm_exponents;
create policy public_nsm_exponents_select on graph.nsm_exponents for select to anon, authenticated using (true);

grant all on graph.nsm_primes to service_role;
grant all on graph.nsm_exponents to service_role;
revoke all on graph.nsm_primes from anon, authenticated;
revoke all on graph.nsm_exponents from anon, authenticated;
grant select on graph.nsm_primes to anon, authenticated;
grant select on graph.nsm_exponents to anon, authenticated;
