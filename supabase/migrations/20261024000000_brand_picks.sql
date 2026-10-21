create schema if not exists bucket;

create table if not exists bucket.brand_picks (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  aspect      text        not null check (aspect in ('overall', 'logo', 'landing', 'app', 'motion', 'game', 'type')),
  a           text        not null check (a ~ '^d[1-7]$'),
  b           text        not null check (b ~ '^d[1-7]$'),
  round       smallint    not null default 0 check (round between 0 and 3),
  left_id     text        not null check (left_id in (a, b)),
  choice      text        check (choice is null or choice in (a, b)),
  note        text        not null default '' check (length(note) <= 1000),
  answered_at timestamptz not null default now(),
  constraint brand_picks_pkey primary key (user_id, aspect, a, b, round),
  constraint brand_picks_order check (a < b)
);

alter table bucket.brand_picks enable row level security;

drop policy if exists own_select on bucket.brand_picks;
create policy own_select on bucket.brand_picks for select using (auth.uid() = user_id);
drop policy if exists own_insert on bucket.brand_picks;
create policy own_insert on bucket.brand_picks for insert with check (auth.uid() = user_id);
drop policy if exists own_update on bucket.brand_picks;
create policy own_update on bucket.brand_picks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists own_delete on bucket.brand_picks;
create policy own_delete on bucket.brand_picks for delete using (auth.uid() = user_id);

revoke all on bucket.brand_picks from public, anon, authenticated;
grant usage on schema bucket to service_role;
grant select, insert, update, delete on bucket.brand_picks to service_role;

create table if not exists bucket.brand_pick_resets (
  user_id    uuid        primary key references auth.users (id) on delete cascade,
  cleared_at timestamptz not null default now()
);

alter table bucket.brand_pick_resets enable row level security;

drop policy if exists own_select on bucket.brand_pick_resets;
create policy own_select on bucket.brand_pick_resets for select using (auth.uid() = user_id);

revoke all on bucket.brand_pick_resets from public, anon, authenticated;
grant select, insert, update, delete on bucket.brand_pick_resets to service_role;

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
  v_work_quiz_attempts  int;
  v_work_quiz_cards     int;
  v_work_quiz_coverage  int;
  v_work_quiz_languages int;
  v_brand_picks         int;
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

  delete from graph.work_quiz_attempts where learner_id = p_learner_id;
  get diagnostics v_work_quiz_attempts = row_count;

  delete from graph.work_quiz_cards where learner_id = p_learner_id;
  get diagnostics v_work_quiz_cards = row_count;

  delete from graph.work_quiz_coverage where learner_id = p_learner_id;
  get diagnostics v_work_quiz_coverage = row_count;

  delete from graph.work_quiz_languages where learner_id = p_learner_id;
  get diagnostics v_work_quiz_languages = row_count;

  delete from bucket.brand_picks where user_id = p_learner_id;
  get diagnostics v_brand_picks = row_count;
  delete from bucket.brand_pick_resets where user_id = p_learner_id;

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
    'event_usage', v_event_usage,
    'work_quiz_attempts', v_work_quiz_attempts,
    'work_quiz_cards', v_work_quiz_cards,
    'work_quiz_coverage', v_work_quiz_coverage,
    'work_quiz_languages', v_work_quiz_languages,
    'brand_picks', v_brand_picks
  );
end;
$$;

revoke all on function graph.privacy_delete_learner(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function graph.privacy_delete_learner(uuid, uuid, boolean) to service_role;
