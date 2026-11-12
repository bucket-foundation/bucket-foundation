alter table bucket.group_shared_items add column if not exists audio_path text check (audio_path is null or char_length(audio_path) <= 200);
alter table bucket.group_shared_items add column if not exists duration_ms int check (duration_ms is null or duration_ms between 1 and 60000);
alter table bucket.group_shared_items add column if not exists lang text check (lang is null or lang ~ '^[a-z]{2,3}$');
alter table bucket.group_shared_items add column if not exists translations jsonb not null default '{}'::jsonb;

do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'bucket.group_shared_items'::regclass and contype = 'c'
      and (pg_get_constraintdef(oid) like '%''url''::text, ''text''::text, ''image''::text%'
        or pg_get_constraintdef(oid) like '%CASE kind%')
  loop
    execute format('alter table bucket.group_shared_items drop constraint %I', c.conname);
  end loop;
end $$;

alter table bucket.group_shared_items add constraint group_shared_items_kind
  check (kind in ('url', 'text', 'image', 'voice'));
alter table bucket.group_shared_items add constraint group_shared_items_payload
  check (case kind
    when 'url' then url is not null
    when 'text' then body is not null
    when 'image' then image_path is not null
    else audio_path is not null and duration_ms is not null and lang is not null
  end);

create or replace function bucket.send_voice_note(
  p_group uuid, p_sender uuid, p_body text, p_audio_path text, p_duration_ms int, p_lang text
)
returns setof bucket.group_shared_items language plpgsql security definer set search_path = bucket as $$
begin
  perform pg_advisory_xact_lock(hashtext('bucket.groups.share:' || p_sender::text));
  if not bucket.is_group_member(p_group, p_sender) then
    raise exception 'not_member';
  end if;
  if (select count(*) from bucket.group_shared_items
      where sender_id = p_sender and created_at >= now() - interval '1 hour') >= 30 then
    raise exception 'share_limit';
  end if;
  if (select count(*) from bucket.group_shared_items
      where sender_id = p_sender and created_at >= now() - interval '1 day') >= 100 then
    raise exception 'share_limit';
  end if;
  return query
    insert into bucket.group_shared_items (group_id, sender_id, kind, body, audio_path, duration_ms, lang)
    values (p_group, p_sender, 'voice', p_body, p_audio_path, p_duration_ms, p_lang)
    returning *;
end $$;

create or replace function bucket.cache_voice_translation(p_item uuid, p_lang text, p_text text)
returns void language sql security definer set search_path = bucket as $$
  update bucket.group_shared_items
    set translations = translations || jsonb_build_object(p_lang, p_text)
    where id = p_item and kind = 'voice' and removed_at is null;
$$;

create or replace function bucket.queue_share_purge()
returns trigger language plpgsql security definer set search_path = bucket as $$
declare
  p text;
begin
  if tg_op = 'DELETE' or (old.removed_at is null and new.removed_at is not null) then
    foreach p in array array[old.image_path, old.audio_path] loop
      if p is not null then
        insert into bucket.group_share_purge (path) values (p) on conflict (path) do nothing;
      end if;
    end loop;
  end if;
  return null;
end $$;

revoke execute on function bucket.send_voice_note(uuid, uuid, text, text, int, text) from public, anon, authenticated;
revoke execute on function bucket.cache_voice_translation(uuid, text, text) from public, anon, authenticated;
revoke execute on function bucket.queue_share_purge() from public, anon, authenticated;
grant execute on function bucket.send_voice_note(uuid, uuid, text, text, int, text) to service_role;
grant execute on function bucket.cache_voice_translation(uuid, text, text) to service_role;

do $$
begin
  if to_regclass('storage.buckets') is not null then
    update storage.buckets
      set allowed_mime_types = array['image/jpeg', 'audio/mp4']
      where id = 'group-shares';
  end if;
end $$;
