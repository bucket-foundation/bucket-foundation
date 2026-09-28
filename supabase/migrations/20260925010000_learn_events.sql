create table if not exists bucket.learn_events (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  event_id   uuid        not null,
  name       text        not null check (name in ('age_band_set', 'placement_done', 'study_session_done', 'assess_done', 'tutor_turn')),
  props      jsonb       not null default '{}'::jsonb check (jsonb_typeof(props) = 'object' and octet_length(props::text) <= 16384),
  arm        text        check (arm is null or arm ~ '^[a-z0-9_-]{1,32}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create index if not exists learn_events_user_created_idx on bucket.learn_events (user_id, created_at);
create index if not exists learn_events_name_created_idx on bucket.learn_events (name, created_at);

alter table bucket.learn_events enable row level security;
alter table bucket.learn_events force row level security;

revoke all on bucket.learn_events from public, anon, authenticated;
grant select, insert, delete on bucket.learn_events to service_role;

create or replace function bucket.record_learn_event(
  p_user_id  uuid,
  p_event_id uuid,
  p_name     text,
  p_props    jsonb,
  p_arm      text default null
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_band text;
  v_rows int;
begin
  select lp.birth_year_bucket into v_band from graph.learner_profiles lp where lp.learner_id = p_user_id;
  if v_band is distinct from '18plus' then
    return 'refused';
  end if;
  insert into bucket.learn_events (user_id, event_id, name, props, arm)
  values (p_user_id, p_event_id, p_name, coalesce(p_props, '{}'::jsonb), p_arm)
  on conflict (user_id, event_id) do nothing;
  get diagnostics v_rows = row_count;
  return case when v_rows = 1 then 'recorded' else 'duplicate' end;
end;
$$;

revoke all on function bucket.record_learn_event(uuid, uuid, text, jsonb, text) from public, anon, authenticated;
grant execute on function bucket.record_learn_event(uuid, uuid, text, jsonb, text) to service_role;

create table if not exists graph.event_usage (
  subject uuid not null references auth.users (id) on delete cascade,
  name    text not null check (name in ('placement_done', 'study_session_done', 'assess_done')),
  day     date not null,
  count   int  not null default 0 check (count >= 0),
  primary key (subject, name, day)
);

alter table graph.event_usage enable row level security;
alter table graph.event_usage force row level security;

revoke all on graph.event_usage from public, anon, authenticated;
grant select, insert, update, delete on graph.event_usage to service_role;

create or replace function graph.event_usage_hit(p_subject uuid, p_name text)
returns int
language sql
security invoker
set search_path = ''
as $$
  insert into graph.event_usage as u (subject, name, day, count)
  values (p_subject, p_name, (pg_catalog.now() at time zone 'utc')::date, 1)
  on conflict (subject, name, day) do update set count = u.count + 1
  returning u.count;
$$;

revoke all on function graph.event_usage_hit(uuid, text) from public, anon, authenticated;
grant execute on function graph.event_usage_hit(uuid, text) to service_role;

create or replace function graph.privacy_delete_learner(
  p_learner_id uuid,
  p_actor_id uuid default null,
  p_acting_as_reviewer boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = graph, bucket, extensions, public
as $$
declare
  v_learner_node_state int;
  v_productions         int;
  v_teacher_reviews     int;
  v_edge_flags          int;
  v_class_members       int;
  v_learner_profiles    int;
  v_check_attempts      int;
  v_quote_receipts      int;
  v_academy_progress    int;
  v_academy_profiles    int;
  v_academy_credentials int;
  v_learn_events        int;
  v_event_usage         int;
begin
  delete from graph.source_quote_receipts where learner_id = p_learner_id;
  get diagnostics v_quote_receipts = row_count;

  delete from graph.learner_node_state where learner_id = p_learner_id;
  get diagnostics v_learner_node_state = row_count;

  delete from graph.productions where learner_id = p_learner_id;
  get diagnostics v_productions = row_count;

  delete from graph.teacher_reviews where learner_id = p_learner_id;
  get diagnostics v_teacher_reviews = row_count;

  delete from graph.edge_flags where learner_id = p_learner_id;
  get diagnostics v_edge_flags = row_count;

  delete from graph.class_members where learner_id = p_learner_id;
  get diagnostics v_class_members = row_count;

  delete from graph.learner_profiles where learner_id = p_learner_id;
  get diagnostics v_learner_profiles = row_count;

  delete from graph.check_attempts where learner_id = p_learner_id;
  get diagnostics v_check_attempts = row_count;

  delete from bucket.academy_progress where user_id = p_learner_id;
  get diagnostics v_academy_progress = row_count;

  delete from bucket.academy_profiles where user_id = p_learner_id;
  get diagnostics v_academy_profiles = row_count;

  delete from bucket.academy_credentials where user_id = p_learner_id;
  get diagnostics v_academy_credentials = row_count;

  delete from bucket.learn_events where user_id = p_learner_id;
  get diagnostics v_learn_events = row_count;

  delete from graph.event_usage where subject = p_learner_id;
  get diagnostics v_event_usage = row_count;

  insert into graph.privacy_events (learner_id_hash, action, actor_id_hash, acting_as_reviewer)
  values (
    encode(digest(p_learner_id::text, 'sha256'), 'hex'),
    'delete',
    case when p_actor_id is not null then encode(digest(p_actor_id::text, 'sha256'), 'hex') else null end,
    coalesce(p_acting_as_reviewer, false)
  );

  perform graph.purge_expired_check_attempts();

  return jsonb_build_object(
    'source_quote_receipts', v_quote_receipts,
    'learner_node_state', v_learner_node_state,
    'productions', v_productions,
    'teacher_reviews', v_teacher_reviews,
    'edge_flags', v_edge_flags,
    'class_members', v_class_members,
    'learner_profiles', v_learner_profiles,
    'check_attempts', v_check_attempts,
    'academy_progress', v_academy_progress,
    'academy_profiles', v_academy_profiles,
    'academy_credentials', v_academy_credentials,
    'learn_events', v_learn_events,
    'event_usage', v_event_usage
  );
end;
$$;

revoke all on function graph.privacy_delete_learner(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function graph.privacy_delete_learner(uuid, uuid, boolean) to service_role;
