create table if not exists bucket.admin_audit_log (
  id             bigint      generated always as identity primary key,
  actor_id       uuid,
  actor_email    text        not null check (length(actor_email) between 3 and 320),
  action         text        not null check (action in ('disable', 'enable', 'delete')),
  target_user_id uuid        not null,
  target_email   text,
  reason         text        not null check (length(reason) between 3 and 500),
  outcome        text        not null check (outcome in ('ok', 'failed')),
  detail         text        check (detail is null or length(detail) <= 500),
  created_at     timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx on bucket.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_target_idx on bucket.admin_audit_log (target_user_id, created_at desc);

alter table bucket.admin_audit_log enable row level security;
alter table bucket.admin_audit_log force row level security;

revoke all on bucket.admin_audit_log from public, anon, authenticated;
grant select, insert on bucket.admin_audit_log to service_role;

create or replace function bucket.admin_audit_log_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'admin_audit_log is append-only';
end;
$$;

drop trigger if exists admin_audit_log_no_change on bucket.admin_audit_log;
create trigger admin_audit_log_no_change
  before update or delete on bucket.admin_audit_log
  for each row execute function bucket.admin_audit_log_append_only();

create or replace view bucket.admin_user_overview as
select
  u.id                 as user_id,
  u.email              as email,
  u.created_at         as created_at,
  u.last_sign_in_at    as last_sign_in_at,
  u.banned_until       as banned_until,
  t.first_app          as first_app,
  t.cohort             as cohort,
  lp.streak_days       as streak_days,
  lp.last_active_day   as last_active_day,
  (select array_agg(distinct d.lang order by d.lang) from bucket.polingual_deck_cards d where d.user_id = u.id) as languages,
  (select max(b.client_ts) from bucket.beta_events b where b.user_id = u.id) as last_event_at,
  plan.product_id      as plan_product,
  plan.kind            as plan_kind,
  plan.bundle_id       as plan_bundle,
  plan.expires_at      as plan_expires_at,
  placement.props      as placement
from auth.users u
left join bucket.beta_testers t on t.user_id = u.id
left join graph.learner_profiles lp on lp.learner_id = u.id
left join lateral (
  select e.product_id, e.kind, e.bundle_id, e.expires_at
  from bucket.app_store_events e
  where e.user_id = u.id
  order by e.signed_at desc
  limit 1
) plan on true
left join lateral (
  select le.props
  from bucket.learn_events le
  where le.user_id = u.id and le.name = 'placement_done'
  order by le.created_at desc
  limit 1
) placement on true;

revoke all on bucket.admin_user_overview from public, anon, authenticated;
grant select on bucket.admin_user_overview to service_role;

create index if not exists app_store_events_user_signed_idx on bucket.app_store_events (user_id, signed_at desc);
