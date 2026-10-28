alter table bucket.app_store_events add column if not exists environment text;

update bucket.app_store_events
set environment = coalesce(transaction_info ->> 'environment', renewal_info ->> 'environment')
where environment is null
  and coalesce(transaction_info ->> 'environment', renewal_info ->> 'environment') is not null;

create index if not exists app_store_events_env_signed_idx on bucket.app_store_events (environment, signed_at);
