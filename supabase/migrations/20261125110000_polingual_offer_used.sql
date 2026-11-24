create table if not exists bucket.polingual_offer_used (
  user_id uuid        not null,
  offer   text        not null check (offer in ('winback')),
  used_at timestamptz not null default now(),
  primary key (user_id, offer)
);

alter table bucket.polingual_offer_used enable row level security;
revoke all on bucket.polingual_offer_used from public, anon, authenticated;
grant select, insert, delete on bucket.polingual_offer_used to service_role;
