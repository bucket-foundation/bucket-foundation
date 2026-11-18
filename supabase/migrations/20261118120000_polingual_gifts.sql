create table if not exists bucket.polingual_gifts (
  id                    uuid        primary key default gen_random_uuid(),
  stripe_event_id       text        not null unique,
  stripe_session_id     text        not null unique,
  stripe_payment_intent text        unique,
  paid_at               timestamptz not null,
  buyer_email           text        check (buyer_email is null or length(buyer_email) <= 254),
  recipient_email       text        check (recipient_email is null or length(recipient_email) <= 254),
  recipient_name        text        check (recipient_name is null or length(recipient_name) between 1 and 80),
  note                  text        check (note is null or length(note) <= 300),
  deliver_on            date        not null,
  deliver_after         timestamptz not null,
  locale                text        not null default 'en' check (locale in ('en', 'es')),
  amount_subtotal       integer,
  amount_total          integer,
  currency              text        check (currency is null or currency ~ '^[a-z]{3}$'),
  code_hash             text        unique check (code_hash is null or code_hash ~ '^[0-9a-f]{64}$'),
  expires_at            timestamptz not null,
  receipt_sent_at       timestamptz,
  delivered_at          timestamptz,
  redeemed_by           uuid        references auth.users (id) on delete set null,
  redeemed_at           timestamptz,
  voided_at             timestamptz,
  void_reason           text        check (void_reason is null or void_reason in ('refund', 'dispute', 'price_mismatch')),
  attention_reason      text        check (attention_reason is null or attention_reason in ('no_payment_intent', 'bad_buyer_email', 'bad_recipient')),
  pii_purged_at         timestamptz,
  created_at            timestamptz not null default now(),
  constraint polingual_gifts_void_pair check ((voided_at is null) = (void_reason is null))
);

create index if not exists polingual_gifts_due_idx on bucket.polingual_gifts (deliver_after) where delivered_at is null and redeemed_at is null and voided_at is null and attention_reason is null;

create table if not exists bucket.polingual_gift_voids (
  stripe_payment_intent text        primary key,
  reason                text        not null check (reason in ('refund', 'dispute')),
  voided_at             timestamptz not null
);

alter table bucket.polingual_gifts enable row level security;
alter table bucket.polingual_gifts force row level security;
alter table bucket.polingual_gift_voids enable row level security;
alter table bucket.polingual_gift_voids force row level security;

revoke all on bucket.polingual_gifts, bucket.polingual_gift_voids from public, anon, authenticated;
grant select, insert, update on bucket.polingual_gifts to service_role;
grant select, insert on bucket.polingual_gift_voids to service_role;

create or replace function bucket.polingual_gift_apply_void()
returns trigger
language plpgsql
set search_path = bucket, pg_temp
as $$
declare
  v bucket.polingual_gift_voids%rowtype;
begin
  if new.stripe_payment_intent is null then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('polingual-gift:' || new.stripe_payment_intent, 0));
  select * into v from bucket.polingual_gift_voids where stripe_payment_intent = new.stripe_payment_intent;
  if found and new.voided_at is null then
    new.voided_at := v.voided_at;
    new.void_reason := v.reason;
  end if;
  return new;
end;
$$;

drop trigger if exists polingual_gift_apply_void on bucket.polingual_gifts;
create trigger polingual_gift_apply_void before insert on bucket.polingual_gifts
  for each row execute function bucket.polingual_gift_apply_void();

create or replace function bucket.redeem_polingual_gift(p_code_hash text, p_user_id uuid, p_now timestamptz default now())
returns table (outcome text, access_until timestamptz)
language plpgsql
set search_path = bucket, pg_temp
as $$
declare
  g bucket.polingual_gifts%rowtype;
  e bucket.academy_entitlements%rowtype;
  has_row boolean;
  until_at timestamptz;
begin
  select * into g from bucket.polingual_gifts where code_hash = p_code_hash for update;
  if not found then
    return query select 'invalid'::text, null::timestamptz;
    return;
  end if;
  if g.voided_at is not null then
    return query select 'void'::text, null::timestamptz;
    return;
  end if;
  select * into e from bucket.academy_entitlements where user_id = p_user_id and product = 'polingual' for update;
  has_row := found;
  if g.redeemed_at is not null then
    if g.redeemed_by = p_user_id then
      return query select 'already'::text, case when has_row then e.current_period_end end;
    else
      return query select 'used'::text, null::timestamptz;
    end if;
    return;
  end if;
  if g.expires_at <= p_now then
    return query select 'expired'::text, null::timestamptz;
    return;
  end if;
  if has_row and e.stripe_subscription is not null and e.status in ('active', 'trialing', 'past_due') then
    return query select 'subscribed'::text, e.current_period_end;
    return;
  end if;
  until_at := greatest(case when has_row and e.status = 'active' and e.plan = 'gift_yearly' then e.current_period_end end, p_now) + interval '1 year';
  insert into bucket.academy_entitlements (user_id, product, status, plan, current_period_end, updated_at)
  values (p_user_id, 'polingual', 'active', 'gift_yearly', until_at, p_now)
  on conflict (user_id, product) do update
    set status = 'active', plan = 'gift_yearly', stripe_subscription = null, current_period_end = excluded.current_period_end, updated_at = p_now;
  update bucket.polingual_gifts set redeemed_by = p_user_id, redeemed_at = p_now where id = g.id;
  return query select 'redeemed'::text, until_at;
end;
$$;

create or replace function bucket.void_polingual_gift(p_payment_intent text, p_reason text, p_now timestamptz default now())
returns table (outcome text, revoked boolean)
language plpgsql
set search_path = bucket, pg_temp
as $$
declare
  g bucket.polingual_gifts%rowtype;
  e bucket.academy_entitlements%rowtype;
  new_end timestamptz;
begin
  perform pg_advisory_xact_lock(hashtextextended('polingual-gift:' || p_payment_intent, 0));
  insert into bucket.polingual_gift_voids (stripe_payment_intent, reason, voided_at) values (p_payment_intent, p_reason, p_now)
    on conflict (stripe_payment_intent) do nothing;
  select * into g from bucket.polingual_gifts where stripe_payment_intent = p_payment_intent for update;
  if not found then
    return query select 'held'::text, false;
    return;
  end if;
  if g.voided_at is not null then
    return query select 'already'::text, false;
    return;
  end if;
  update bucket.polingual_gifts set voided_at = p_now, void_reason = p_reason where id = g.id;
  if g.redeemed_by is null then
    return query select 'voided'::text, false;
    return;
  end if;
  select * into e from bucket.academy_entitlements
    where user_id = g.redeemed_by and product = 'polingual' and plan = 'gift_yearly' and stripe_subscription is null
    for update;
  if not found then
    return query select 'voided'::text, false;
    return;
  end if;
  new_end := e.current_period_end - interval '1 year';
  if new_end is null or new_end <= p_now then
    update bucket.academy_entitlements set status = 'canceled', current_period_end = p_now, updated_at = p_now where user_id = e.user_id and product = e.product;
  else
    update bucket.academy_entitlements set current_period_end = new_end, updated_at = p_now where user_id = e.user_id and product = e.product;
  end if;
  return query select 'voided'::text, true;
end;
$$;

create or replace function bucket.purge_polingual_gift_pii(p_cutoff timestamptz, p_now timestamptz default now())
returns integer
language plpgsql
set search_path = bucket, pg_temp
as $$
declare
  n integer;
begin
  update bucket.polingual_gifts
    set recipient_email = null, recipient_name = null, note = null, pii_purged_at = p_now
    where pii_purged_at is null and (redeemed_at <= p_cutoff or expires_at <= p_cutoff or voided_at <= p_cutoff);
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function bucket.redeem_polingual_gift(text, uuid, timestamptz) from public, anon, authenticated;
revoke all on function bucket.void_polingual_gift(text, text, timestamptz) from public, anon, authenticated;
revoke all on function bucket.purge_polingual_gift_pii(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function bucket.redeem_polingual_gift(text, uuid, timestamptz) to service_role;
grant execute on function bucket.void_polingual_gift(text, text, timestamptz) to service_role;
grant execute on function bucket.purge_polingual_gift_pii(timestamptz, timestamptz) to service_role;
