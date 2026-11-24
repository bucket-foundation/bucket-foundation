create table if not exists bucket.play_purchases (
  purchase_token        text        primary key,
  user_id               uuid        references auth.users (id) on delete cascade,
  package_name          text        not null,
  product_id            text        not null,
  kind                  text        not null check (kind in ('subs', 'inapp')),
  state                 text        not null,
  trial                 boolean     not null default false,
  expiry                timestamptz,
  started_at            timestamptz,
  canceled_at           timestamptz,
  linked_purchase_token text,
  account_hash          text,
  updated_at            timestamptz not null default now()
);

create index if not exists play_purchases_user_idx on bucket.play_purchases (user_id);

alter table bucket.play_purchases enable row level security;
revoke all on bucket.play_purchases from public, anon, authenticated;
grant select, insert, update, delete on bucket.play_purchases to service_role;
