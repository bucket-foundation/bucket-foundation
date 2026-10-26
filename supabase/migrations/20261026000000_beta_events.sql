create table if not exists bucket.beta_testers (
  user_id     uuid        primary key references auth.users (id) on delete cascade,
  cohort      text        not null default 'default' check (cohort ~ '^[a-z0-9_-]{1,32}$'),
  first_app   text        not null check (first_app in ('bucket', 'polingual', 'web')),
  opted_out   boolean     not null default false,
  enrolled_at timestamptz not null default now()
);

create table if not exists bucket.beta_events (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  event_id   uuid        not null,
  app        text        not null check (app in ('bucket', 'polingual', 'web')),
  name       text        not null check (name in ('app_open', 'session_start', 'session_end', 'card_shown', 'card_answered', 'lesson_complete')),
  session_id uuid,
  client_ts  timestamptz not null,
  props      jsonb       not null default '{}'::jsonb check (jsonb_typeof(props) = 'object' and octet_length(props::text) <= 2048),
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create index if not exists beta_events_user_ts_idx on bucket.beta_events (user_id, client_ts);
create index if not exists beta_events_ts_idx on bucket.beta_events (client_ts);

alter table bucket.beta_testers enable row level security;
alter table bucket.beta_testers force row level security;
alter table bucket.beta_events enable row level security;
alter table bucket.beta_events force row level security;

revoke all on bucket.beta_testers from public, anon, authenticated;
revoke all on bucket.beta_events from public, anon, authenticated;
grant select, insert, update, delete on bucket.beta_testers to service_role;
grant select, insert, delete on bucket.beta_events to service_role;

create or replace function bucket.record_beta_events(
  p_user_id uuid,
  p_app     text,
  p_events  jsonb,
  p_cap     int
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_opted boolean;
  v_used  int;
  v_new   int;
  v_rows  int;
begin
  select t.opted_out into v_opted from bucket.beta_testers t where t.user_id = p_user_id for update;
  if v_opted is null then
    raise exception 'beta tester % not enrolled', p_user_id;
  end if;
  if v_opted then
    return jsonb_build_object('outcome', 'opted_out', 'accepted', 0);
  end if;
  select count(*) into v_new
  from pg_catalog.jsonb_array_elements(p_events) e
  where not exists (
    select 1 from bucket.beta_events b where b.user_id = p_user_id and b.event_id = (e ->> 'id')::uuid
  );
  select count(*) into v_used
  from bucket.beta_events b
  where b.user_id = p_user_id and b.created_at >= pg_catalog.date_trunc('day', pg_catalog.now() at time zone 'utc') at time zone 'utc';
  if v_used + v_new > p_cap then
    return jsonb_build_object('outcome', 'rate_limited', 'accepted', 0);
  end if;
  insert into bucket.beta_events (user_id, event_id, app, name, session_id, client_ts, props)
  select p_user_id, (e ->> 'id')::uuid, p_app, e ->> 'name', nullif(e ->> 'session_id', '')::uuid, (e ->> 'ts')::timestamptz, coalesce(e -> 'props', '{}'::jsonb)
  from pg_catalog.jsonb_array_elements(p_events) e
  on conflict (user_id, event_id) do nothing;
  get diagnostics v_rows = row_count;
  return jsonb_build_object('outcome', 'recorded', 'accepted', v_rows);
end;
$$;

revoke all on function bucket.record_beta_events(uuid, text, jsonb, int) from public, anon, authenticated;
grant execute on function bucket.record_beta_events(uuid, text, jsonb, int) to service_role;
