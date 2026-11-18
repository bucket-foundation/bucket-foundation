create table if not exists bucket.polingual_gifts (
  id                uuid        primary key default gen_random_uuid(),
  stripe_event_id   text        not null unique,
  stripe_session_id text        not null unique,
  buyer_email       text        not null check (length(buyer_email) <= 254),
  recipient_email   text        not null check (length(recipient_email) <= 254),
  recipient_name    text        not null check (length(recipient_name) between 1 and 80),
  note              text        check (note is null or length(note) <= 300),
  deliver_on        date        not null,
  locale            text        not null default 'en' check (locale in ('en', 'es')),
  amount_total      integer,
  currency          text        check (currency is null or currency ~ '^[a-z]{3}$'),
  code              text,
  code_hash         text        not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  expires_at        timestamptz not null,
  receipt_sent_at   timestamptz,
  delivered_at      timestamptz,
  redeemed_by       uuid        references auth.users (id) on delete set null,
  redeemed_at       timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists polingual_gifts_due_idx on bucket.polingual_gifts (deliver_on) where delivered_at is null and redeemed_at is null;

alter table bucket.polingual_gifts enable row level security;
alter table bucket.polingual_gifts force row level security;

revoke all on bucket.polingual_gifts from public, anon, authenticated;
grant select, insert, update on bucket.polingual_gifts to service_role;

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
  until_at := greatest(case when has_row and e.status = 'active' then e.current_period_end end, p_now) + interval '1 year';
  insert into bucket.academy_entitlements (user_id, product, status, plan, current_period_end, updated_at)
  values (p_user_id, 'polingual', 'active', 'gift_yearly', until_at, p_now)
  on conflict (user_id, product) do update
    set status = 'active', plan = 'gift_yearly', stripe_subscription = null, current_period_end = excluded.current_period_end, updated_at = p_now;
  update bucket.polingual_gifts set redeemed_by = p_user_id, redeemed_at = p_now, code = null where id = g.id;
  return query select 'redeemed'::text, until_at;
end;
$$;

revoke all on function bucket.redeem_polingual_gift(text, uuid, timestamptz) from public, anon, authenticated;
grant execute on function bucket.redeem_polingual_gift(text, uuid, timestamptz) to service_role;
