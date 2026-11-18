create schema if not exists bucket;

create table if not exists bucket.academy_entitlements (
  user_id             uuid        not null references auth.users (id) on delete cascade,
  product             text        not null check (product in ('polingual')),
  status              text        not null,
  plan                text,
  stripe_customer     text,
  stripe_subscription text,
  referral            text        check (referral is null or length(referral) <= 128),
  affiliate_network   text        check (affiliate_network is null or affiliate_network in ('rewardful', 'impact')),
  current_period_end  timestamptz,
  updated_at          timestamptz not null default now(),
  constraint academy_entitlements_pkey primary key (user_id, product)
);

alter table bucket.academy_entitlements enable row level security;

drop policy if exists own_select on bucket.academy_entitlements;
create policy own_select on bucket.academy_entitlements for select using (auth.uid() = user_id);

revoke all on bucket.academy_entitlements from public, anon, authenticated;
grant usage on schema bucket to service_role;
grant select, insert, update, delete on bucket.academy_entitlements to service_role;
