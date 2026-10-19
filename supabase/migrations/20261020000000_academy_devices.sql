alter table bucket.devices add column if not exists public_key text check (public_key is null or public_key ~ '^[A-Za-z0-9+/]{43}=$');
alter table bucket.devices add column if not exists kind text check (kind is null or kind in ('desktop', 'cli', 'mobile'));
alter table bucket.devices add column if not exists revoked_at timestamptz;
alter table bucket.devices add column if not exists registered_at timestamptz;
alter table bucket.devices add column if not exists session_id uuid;

create index if not exists devices_session_idx on bucket.devices (session_id) where session_id is not null;


create table if not exists bucket.device_codes (
  device_code_hash text        primary key check (device_code_hash ~ '^[0-9a-f]{64}$'),
  user_code        text        not null unique check (user_code ~ '^[A-Z0-9]{8}$'),
  device_id        text        not null check (device_id ~ '^[A-Za-z0-9._-]{1,64}$'),
  public_key       text        not null check (public_key ~ '^[A-Za-z0-9+/]{43}=$'),
  kind             text        not null check (kind in ('desktop', 'cli', 'mobile')),
  label            text        check (label is null or length(label) <= 80),
  user_id          uuid        references auth.users (id) on delete cascade,
  status           text        not null default 'pending' check (status in ('pending', 'approved', 'consumed', 'denied')),
  created_at       timestamptz not null default now(),
  expires_at       timestamptz not null
);

create index if not exists device_codes_expires_idx on bucket.device_codes (expires_at);

create table if not exists bucket.device_nonces (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  device_id  text        not null,
  nonce      text        not null check (nonce ~ '^[A-Za-z0-9_-]{16,64}$'),
  expires_at timestamptz not null,
  primary key (device_id, nonce),
  foreign key (user_id, device_id) references bucket.devices (user_id, device_id) on delete cascade
);

create index if not exists device_nonces_expires_idx on bucket.device_nonces (expires_at);

alter table bucket.device_codes enable row level security;
alter table bucket.device_nonces enable row level security;

create or replace function bucket.use_device_nonce(p_user uuid, p_device text, p_nonce text, p_ttl_seconds int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare n int;
begin
  delete from bucket.device_nonces where expires_at < now();
  insert into bucket.device_nonces (user_id, device_id, nonce, expires_at)
  values (p_user, p_device, p_nonce, now() + make_interval(secs => p_ttl_seconds))
  on conflict (device_id, nonce) do nothing;
  get diagnostics n = row_count;
  return n = 1;
end $$;

drop function if exists bucket.register_device(uuid, text, text, text, text);

create or replace function bucket.register_device(p_user uuid, p_device text, p_public_key text, p_kind text, p_label text, p_session uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v record;
begin
  select d.public_key, d.revoked_at into v from bucket.devices d where d.user_id = p_user and d.device_id = p_device for update;
  if found and (v.revoked_at is not null or (v.public_key is not null and v.public_key <> p_public_key)) then
    return false;
  end if;
  insert into bucket.devices (user_id, device_id, public_key, kind, label, registered_at, session_id)
  values (p_user, p_device, p_public_key, p_kind, p_label, now(), p_session)
  on conflict (user_id, device_id) do update
    set public_key = excluded.public_key, kind = excluded.kind, label = coalesce(excluded.label, bucket.devices.label),
        registered_at = now(), last_seen_at = now(), session_id = excluded.session_id;
  return true;
end $$;

revoke all on function bucket.use_device_nonce(uuid, text, text, int) from public, anon, authenticated;
revoke all on function bucket.register_device(uuid, text, text, text, text, uuid) from public, anon, authenticated;
grant execute on function bucket.use_device_nonce(uuid, text, text, int) to service_role;
grant execute on function bucket.register_device(uuid, text, text, text, text, uuid) to service_role;
grant select, insert, update, delete on bucket.device_codes to service_role;
grant select, update on bucket.devices to service_role;
