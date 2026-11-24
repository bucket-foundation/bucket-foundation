alter table bucket.academy_entitlements add column if not exists last_event_id text;
alter table bucket.academy_entitlements add column if not exists last_event_at timestamptz;

create index if not exists academy_entitlements_customer_idx on bucket.academy_entitlements (stripe_customer, product) where stripe_customer is not null;
