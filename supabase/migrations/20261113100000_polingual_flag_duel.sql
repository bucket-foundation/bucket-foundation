alter table bucket.lobbies drop constraint if exists lobbies_game_check;
alter table bucket.lobbies add constraint lobbies_game_check check (game in ('daily', 'same-word', 'flags', 'live', 'tiles', 'duel'));

alter table bucket.lobby_prompts drop constraint if exists lobby_prompts_mode_check;
alter table bucket.lobby_prompts add constraint lobby_prompts_mode_check check (mode in ('form', 'flag', 'tiles', 'mixed', 'meaning'));

create table if not exists bucket.lobby_powers (
  lobby_id uuid not null references bucket.lobbies (id) on delete cascade,
  user_id  uuid not null,
  round    int  not null check (round >= 0),
  kind     text not null check (kind in ('double', 'fifty')),
  created_at timestamptz not null default now(),
  primary key (lobby_id, user_id, round)
);

alter table bucket.lobby_powers enable row level security;
revoke all on bucket.lobby_powers from anon, authenticated;

create or replace function bucket.merge_lobby_guest(p_guest uuid, p_user uuid)
returns int language plpgsql security definer set search_path = bucket as $$
declare
  n int;
begin
  if p_guest = p_user then
    return 0;
  end if;
  delete from bucket.lobby_players g using bucket.lobby_players u
    where g.user_id = p_guest and u.user_id = p_user and u.lobby_id = g.lobby_id;
  delete from bucket.lobby_answers g using bucket.lobby_answers u
    where g.user_id = p_guest and u.user_id = p_user and u.lobby_id = g.lobby_id and u.round = g.round;
  delete from bucket.lobby_powers g using bucket.lobby_powers u
    where g.user_id = p_guest and u.user_id = p_user and u.lobby_id = g.lobby_id and u.round = g.round;
  update bucket.lobby_players set user_id = p_user where user_id = p_guest;
  get diagnostics n = row_count;
  update bucket.lobby_answers set user_id = p_user where user_id = p_guest;
  update bucket.lobby_powers set user_id = p_user where user_id = p_guest;
  update bucket.lobby_messages set user_id = p_user where user_id = p_guest;
  update bucket.lobbies set host_id = p_user where host_id = p_guest;
  return n;
end $$;

revoke execute on function bucket.merge_lobby_guest(uuid, uuid) from public, anon, authenticated;

create or replace function bucket.delete_lobby_user(p_user uuid)
returns int language plpgsql security definer set search_path = bucket as $$
declare
  v_lobby uuid;
  n int := 0;
begin
  for v_lobby in select lobby_id from bucket.lobby_players where user_id = p_user loop
    perform bucket.leave_lobby(v_lobby, p_user);
    n := n + 1;
  end loop;
  delete from bucket.lobby_messages where user_id = p_user;
  delete from bucket.lobby_answers where user_id = p_user;
  delete from bucket.lobby_powers where user_id = p_user;
  delete from bucket.lobbies where host_id = p_user;
  delete from bucket.lobby_limits where bucket_key like '%:' || p_user::text;
  return n;
end $$;

revoke execute on function bucket.delete_lobby_user(uuid) from public, anon, authenticated;
