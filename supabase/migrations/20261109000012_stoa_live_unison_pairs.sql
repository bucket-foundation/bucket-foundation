create or replace function bucket.live_unison(p_size integer, p_right integer)
returns boolean language sql immutable as $$
  select p_right >= 1 and p_size - p_right <= case when p_size <= 2 then 0 else greatest(1, p_size / 5) end
$$;

revoke all on function bucket.live_unison(integer, integer) from public, anon, authenticated, service_role;
