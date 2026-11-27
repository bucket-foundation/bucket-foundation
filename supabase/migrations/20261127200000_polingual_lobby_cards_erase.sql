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
  delete from bucket.lobby_cards where user_id = p_user;
  delete from bucket.lobby_messages where user_id = p_user;
  delete from bucket.lobby_answers where user_id = p_user;
  delete from bucket.lobbies where host_id = p_user;
  delete from bucket.lobby_limits where bucket_key like '%:' || p_user::text;
  return n;
end $$;

revoke execute on function bucket.delete_lobby_user(uuid) from public, anon, authenticated;
