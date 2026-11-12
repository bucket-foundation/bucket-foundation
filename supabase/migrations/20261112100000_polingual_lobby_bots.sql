alter table bucket.lobbies add column if not exists standing_slot text unique;
alter table bucket.lobbies add column if not exists bot_fill boolean not null default false;
alter table bucket.lobbies add column if not exists tick_at timestamptz;

alter table bucket.lobby_players add column if not exists is_bot boolean not null default false;
alter table bucket.lobby_players add column if not exists skill text check (skill is null or skill in ('easy', 'medium', 'hard'));
alter table bucket.lobby_players add column if not exists flag text check (flag is null or flag ~ '^[A-Z]{2}$');

create index if not exists lobbies_standing_idx on bucket.lobbies (standing_slot) where standing_slot is not null;

create or replace function bucket.lobby_players_limit()
returns trigger language plpgsql as $$
begin
  perform 1 from bucket.lobbies where id = new.lobby_id and (status = 'lobby' or standing_slot is not null) for update;
  if not found then
    raise exception 'lobby_started';
  end if;
  if (select count(*) from bucket.lobby_players where lobby_id = new.lobby_id) >= 8 then
    raise exception 'lobby_full';
  end if;
  return new;
end $$;

create or replace function bucket.leave_lobby(p_lobby uuid, p_user uuid)
returns text language plpgsql security definer set search_path = bucket as $$
declare
  v_host uuid;
  v_standing text;
  v_next uuid;
begin
  select host_id, standing_slot into v_host, v_standing from bucket.lobbies where id = p_lobby for update;
  if not found then
    return 'not_found';
  end if;
  delete from bucket.lobby_players where lobby_id = p_lobby and user_id = p_user;
  if not found then
    return 'not_member';
  end if;
  if v_standing is null and not exists (select 1 from bucket.lobby_players where lobby_id = p_lobby and not is_bot) then
    delete from bucket.lobbies where id = p_lobby;
    return 'closed';
  end if;
  if v_host = p_user then
    select user_id into v_next from bucket.lobby_players where lobby_id = p_lobby order by is_bot, joined_at limit 1;
    update bucket.lobbies set host_id = v_next where id = p_lobby;
  end if;
  return 'ok';
end $$;

revoke execute on function bucket.leave_lobby(uuid, uuid) from public, anon, authenticated;
