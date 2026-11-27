create table if not exists bucket.lobby_screens (
  lobby_id   uuid        not null references bucket.lobbies (id) on delete cascade,
  user_id    uuid        not null,
  created_at timestamptz not null default now(),
  last_seen  timestamptz not null default now(),
  primary key (lobby_id, user_id)
);

create index if not exists lobby_screens_user_idx on bucket.lobby_screens (user_id);

alter table bucket.lobby_screens enable row level security;
revoke all on bucket.lobby_screens from anon, authenticated;

create or replace function bucket.lobby_screen_cap()
returns trigger language plpgsql as $$
begin
  perform pg_advisory_xact_lock(hashtext('lobby_screens:' || new.lobby_id::text));
  if (select status from bucket.lobbies where id = new.lobby_id) = 'done' then
    raise exception 'lobby_closed';
  end if;
  if (select count(*) from bucket.lobby_screens where lobby_id = new.lobby_id) >= 3 then
    raise exception 'lobby_full';
  end if;
  return new;
end $$;

drop trigger if exists lobby_screen_cap on bucket.lobby_screens;
create trigger lobby_screen_cap before insert on bucket.lobby_screens
  for each row execute function bucket.lobby_screen_cap();
