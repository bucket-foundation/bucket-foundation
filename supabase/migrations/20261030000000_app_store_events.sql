create table if not exists bucket.app_store_events (
  notification_uuid       uuid        primary key,
  type                    text        not null,
  subtype                 text,
  kind                    text        not null check (kind in ('trial', 'subscribe', 'renew', 'cancel', 'uncancel', 'refund', 'refund_reversed', 'revoke', 'expire', 'billing_issue', 'other')),
  user_id                 uuid        references auth.users (id) on delete set null,
  app_account_token       uuid,
  bundle_id               text,
  environment             text,
  product_id              text,
  transaction_id          text,
  original_transaction_id text,
  offer_type              int,
  signed_at               timestamptz not null,
  expires_at              timestamptz,
  transaction_info        jsonb       not null default '{}'::jsonb check (jsonb_typeof(transaction_info) = 'object'),
  renewal_info            jsonb       not null default '{}'::jsonb check (jsonb_typeof(renewal_info) = 'object'),
  created_at              timestamptz not null default now()
);

create index if not exists app_store_events_signed_idx on bucket.app_store_events (signed_at);
create index if not exists app_store_events_user_idx on bucket.app_store_events (user_id);

alter table bucket.app_store_events enable row level security;
alter table bucket.app_store_events force row level security;

revoke all on bucket.app_store_events from public, anon, authenticated;
grant select, insert, update on bucket.app_store_events to service_role;

create table if not exists bucket.app_store_account_tokens (
  token      uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table bucket.app_store_account_tokens enable row level security;
alter table bucket.app_store_account_tokens force row level security;

revoke all on bucket.app_store_account_tokens from public, anon, authenticated;
grant select, insert, delete on bucket.app_store_account_tokens to service_role;
