alter table bucket.lobby_screens add column if not exists role text not null default 'screen';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'lobby_screens_role_check') then
    alter table bucket.lobby_screens add constraint lobby_screens_role_check check (role in ('screen', 'audience'));
  end if;
end $$;

create or replace function bucket.lobby_screen_cap()
returns trigger language plpgsql as $$
begin
  perform pg_advisory_xact_lock(hashtext('lobby_screens:' || new.lobby_id::text));
  if (select status from bucket.lobbies where id = new.lobby_id) = 'done' then
    raise exception 'lobby_closed';
  end if;
  if new.role = 'audience' then
    if (select count(*) from bucket.lobby_screens where lobby_id = new.lobby_id and role = 'audience') >= 40 then
      raise exception 'lobby_full';
    end if;
  elsif (select count(*) from bucket.lobby_screens where lobby_id = new.lobby_id and role = 'screen') >= 3 then
    raise exception 'lobby_full';
  end if;
  return new;
end $$;
