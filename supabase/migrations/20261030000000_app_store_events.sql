create table if not exists bucket.app_store_events (
  notification_uuid       uuid        primary key,
  type                    text        not null,
  subtype                 text,
  kind                    text        not null check (kind in ('trial', 'subscribe', 'renew', 'cancel', 'uncancel', 'refund', 'expire', 'billing_issue', 'other')),
  user_id                 uuid        references auth.users (id) on delete set null,
  bundle_id               text,
  environment             text,
  product_id              text,
  transaction_id          text,
  original_transaction_id text,
  offer_type              int,
  signed_at               timestamptz not null,
  expires_at              timestamptz,
  created_at              timestamptz not null default now()
);

create index if not exists app_store_events_signed_idx on bucket.app_store_events (signed_at);
create index if not exists app_store_events_user_idx on bucket.app_store_events (user_id);

alter table bucket.app_store_events enable row level security;
alter table bucket.app_store_events force row level security;

revoke all on bucket.app_store_events from public, anon, authenticated;
grant select, insert, update on bucket.app_store_events to service_role;
