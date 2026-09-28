create table if not exists graph.advisor_space (
  model_version text        primary key check (model_version ~ '^[0-9a-f]{16}$'),
  model         jsonb       not null check (model->>'schema' = 'bucket.advisor-space/1'),
  counts        jsonb       not null default '{}'::jsonb,
  active        boolean     not null default false,
  created_at    timestamptz not null default now()
);

create unique index if not exists advisor_space_one_active on graph.advisor_space (active) where active;

create table if not exists graph.advisor_public (
  model_version text        not null references graph.advisor_space (model_version) on delete cascade,
  openalex_id   text        not null check (openalex_id ~ '^A[0-9]{1,15}$'),
  name          text        not null check (length(name) between 1 and 300),
  institution   text        not null default '' check (length(institution) <= 300),
  ror           text        not null default '' check (ror = '' or ror ~ '^0[a-z0-9]{6}[0-9]{2}$'),
  country       text        not null default '' check (country = '' or country ~ '^[A-Z]{2}$'),
  field         text        not null default '' check (length(field) <= 200),
  topics        text[]      not null default '{}' check (cardinality(topics) <= 8),
  links         jsonb       not null default '{}'::jsonb check (jsonb_typeof(links) = 'object'),
  orcid         text        check (orcid is null or orcid ~ '^[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]$'),
  scores        real[]      not null check (cardinality(scores) between 1 and 512),
  hidden        boolean     not null default false,
  updated_at    timestamptz not null default now(),
  primary key (model_version, openalex_id)
);

create index if not exists advisor_public_openalex on graph.advisor_public (openalex_id);
create index if not exists advisor_public_orcid on graph.advisor_public (orcid) where orcid is not null;

create table if not exists graph.advisor_optouts (
  id          uuid        primary key default gen_random_uuid(),
  openalex_id text        check (openalex_id is null or openalex_id ~ '^A[0-9]{1,15}$'),
  orcid       text        check (orcid is null or orcid ~ '^[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]$'),
  contact     text        not null check (length(contact) between 3 and 320),
  reason      text        not null default '' check (length(reason) <= 1000),
  status      text        not null default 'hidden' check (status in ('hidden', 'restored')),
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz,
  check (openalex_id is not null or orcid is not null)
);

create index if not exists advisor_optouts_openalex on graph.advisor_optouts (openalex_id) where status = 'hidden';
create index if not exists advisor_optouts_orcid on graph.advisor_optouts (orcid) where status = 'hidden';

create table if not exists graph.advisor_match_usage (
  subject uuid not null references auth.users (id) on delete cascade,
  day     date not null,
  count   int  not null default 0 check (count >= 0),
  primary key (subject, day)
);

create table if not exists bucket.advisor_swipes (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  openalex_id text        not null check (openalex_id ~ '^A[0-9]{1,15}$'),
  decision    text        not null check (decision in ('yes', 'no', 'maybe')),
  updated_at  timestamptz not null default now(),
  primary key (user_id, openalex_id)
);

alter table graph.advisor_space enable row level security;
alter table graph.advisor_space force row level security;
alter table graph.advisor_public enable row level security;
alter table graph.advisor_public force row level security;
alter table graph.advisor_optouts enable row level security;
alter table graph.advisor_optouts force row level security;
alter table graph.advisor_match_usage enable row level security;
alter table graph.advisor_match_usage force row level security;
alter table bucket.advisor_swipes enable row level security;
alter table bucket.advisor_swipes force row level security;

revoke all on graph.advisor_space, graph.advisor_public, graph.advisor_optouts, graph.advisor_match_usage from public, anon, authenticated;
revoke all on bucket.advisor_swipes from public, anon, authenticated;
grant select, insert, update, delete on graph.advisor_space, graph.advisor_public, graph.advisor_optouts, graph.advisor_match_usage to service_role;
grant select, insert, update, delete on bucket.advisor_swipes to service_role;

create or replace function graph.advisor_request_optout(p_openalex text, p_orcid text, p_contact text, p_reason text)
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_hidden int;
begin
  insert into graph.advisor_optouts (openalex_id, orcid, contact, reason)
  values (nullif(p_openalex, ''), nullif(p_orcid, ''), p_contact, coalesce(p_reason, ''));
  update graph.advisor_public ap
    set hidden = true, updated_at = now()
    where not ap.hidden
      and ((nullif(p_openalex, '') is not null and ap.openalex_id = p_openalex)
        or (nullif(p_orcid, '') is not null and ap.orcid = p_orcid));
  get diagnostics v_hidden = row_count;
  return v_hidden;
end;
$$;

create or replace function graph.advisor_activate(p_version text, p_keep int default 2)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (select 1 from graph.advisor_space where model_version = p_version) then
    raise exception 'advisor_activate: no model % loaded', p_version using errcode = '22023';
  end if;
  update graph.advisor_public ap set hidden = true
    where ap.model_version = p_version and exists (
      select 1 from graph.advisor_optouts o
      where o.status = 'hidden' and (o.openalex_id = ap.openalex_id or (o.orcid is not null and o.orcid = ap.orcid)));
  update graph.advisor_space set active = false where active and model_version <> p_version;
  update graph.advisor_space set active = true where model_version = p_version;
  delete from graph.advisor_space
    where not active and model_version not in (
      select model_version from graph.advisor_space order by created_at desc limit greatest(p_keep, 1));
end;
$$;

create or replace function graph.advisor_match_take(p_subject uuid, p_cap int)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count int;
begin
  insert into graph.advisor_match_usage (subject, day, count) values (p_subject, current_date, 1)
  on conflict (subject, day) do update set count = graph.advisor_match_usage.count + 1
  returning count into v_count;
  return v_count <= p_cap;
end;
$$;

create or replace function graph.advisor_load(p_model jsonb, p_profiles jsonb, p_counts jsonb default '{}'::jsonb)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_version text := p_model->>'version';
  v_k int := (p_model->>'k')::int;
  v_n int;
begin
  if jsonb_typeof(p_profiles) <> 'array' or jsonb_array_length(p_profiles) = 0 then
    raise exception 'advisor_load: profiles must be a non-empty array' using errcode = '22023';
  end if;
  insert into graph.advisor_space (model_version, model, counts) values (v_version, p_model, coalesce(p_counts, '{}'::jsonb));
  insert into graph.advisor_public (model_version, openalex_id, name, institution, ror, country, field, topics, links, orcid, scores)
  select v_version, r.openalex_id, r.name, coalesce(r.institution, ''), coalesce(r.ror, ''), coalesce(r.country, ''), coalesce(r.field, ''),
         coalesce(array(select jsonb_array_elements_text(r.topics)), '{}'), coalesce(r.links, '{}'::jsonb), nullif(r.orcid, ''),
         array(select jsonb_array_elements_text(r.scores)::real)
    from jsonb_to_recordset(p_profiles) as r(openalex_id text, name text, institution text, ror text, country text, field text,
                                             topics jsonb, links jsonb, orcid text, scores jsonb);
  select count(*) into v_n from graph.advisor_public where model_version = v_version and cardinality(scores) <> v_k;
  if v_n > 0 then
    raise exception 'advisor_load: % profiles have scores of the wrong length', v_n using errcode = '22023';
  end if;
  perform graph.advisor_activate(v_version);
  return v_version;
end;
$$;

revoke all on function graph.advisor_load(jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function graph.advisor_load(jsonb, jsonb, jsonb) to service_role;

revoke all on function graph.advisor_request_optout(text, text, text, text) from public, anon, authenticated;
revoke all on function graph.advisor_activate(text, int) from public, anon, authenticated;
revoke all on function graph.advisor_match_take(uuid, int) from public, anon, authenticated;
grant execute on function graph.advisor_request_optout(text, text, text, text) to service_role;
grant execute on function graph.advisor_activate(text, int) to service_role;
grant execute on function graph.advisor_match_take(uuid, int) to service_role;
