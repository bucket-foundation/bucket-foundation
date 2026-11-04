create table if not exists bucket.group_shared_items (
  id           uuid        primary key default gen_random_uuid(),
  group_id     uuid        not null references bucket.learning_groups (id) on delete cascade,
  sender_id    uuid        not null references auth.users (id) on delete cascade,
  recipient_id uuid        references auth.users (id) on delete cascade,
  kind         text        not null check (kind in ('url', 'text', 'image')),
  url          text        check (url is null or (char_length(url) <= 2048 and url ~ '^https?://')),
  body         text        check (body is null or char_length(body) between 1 and 1000),
  image_path   text        check (image_path is null or char_length(image_path) <= 200),
  created_at   timestamptz not null default now(),
  removed_at   timestamptz,
  check (sender_id <> recipient_id),
  check (case kind when 'url' then url is not null when 'text' then body is not null else image_path is not null end)
);

create index if not exists group_shared_items_group_idx
  on bucket.group_shared_items (group_id, created_at desc);
create index if not exists group_shared_items_sender_idx
  on bucket.group_shared_items (sender_id, created_at desc);

create table if not exists bucket.group_item_reports (
  item_id     uuid        not null references bucket.group_shared_items (id) on delete cascade,
  reporter_id uuid        not null references auth.users (id) on delete cascade,
  reason      text        not null check (reason in ('offensive_name', 'harassment', 'spam', 'other')),
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz,
  primary key (item_id, reporter_id)
);

create index if not exists group_item_reports_open_idx
  on bucket.group_item_reports (created_at desc) where reviewed_at is null;

create or replace function bucket.blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = bucket as $$
  select b is not null and exists (
    select 1 from bucket.group_blocks k
    where (k.blocker_id = a and k.target_user_id = b) or (k.blocker_id = b and k.target_user_id = a)
  );
$$;

create or replace function bucket.item_reported_by(p_item uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = bucket as $$
  select exists (select 1 from bucket.group_item_reports r where r.item_id = p_item and r.reporter_id = p_user);
$$;

create or replace function bucket.can_see_shared_item(p_group uuid, p_sender uuid, p_recipient uuid, p_item uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = bucket as $$
  select bucket.is_group_member(p_group, p_user)
    and (p_recipient is null or p_user in (p_sender, p_recipient))
    and not bucket.blocked_between(p_user, p_sender)
    and not bucket.item_reported_by(p_item, p_user);
$$;

create or replace function bucket.send_shared_item(
  p_group uuid, p_sender uuid, p_recipient uuid, p_kind text, p_url text, p_body text, p_image_path text
)
returns setof bucket.group_shared_items language plpgsql security definer set search_path = bucket as $$
begin
  perform pg_advisory_xact_lock(hashtext('bucket.groups.share:' || p_sender::text));
  if not bucket.is_group_member(p_group, p_sender) then
    raise exception 'not_member';
  end if;
  if p_recipient is not null then
    if p_recipient = p_sender then
      raise exception 'self';
    end if;
    if not bucket.is_group_member(p_group, p_recipient) or bucket.blocked_between(p_sender, p_recipient) then
      raise exception 'not_member';
    end if;
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
    insert into bucket.group_shared_items (group_id, sender_id, recipient_id, kind, url, body, image_path)
    values (p_group, p_sender, p_recipient, p_kind, p_url, p_body, p_image_path)
    returning *;
end $$;

create or replace function bucket.report_shared_item(p_item uuid, p_reporter uuid, p_reason text)
returns int language plpgsql security definer set search_path = bucket as $$
declare
  v_item bucket.group_shared_items;
  v_count int;
begin
  select * into v_item from bucket.group_shared_items where id = p_item for update;
  if not found or v_item.removed_at is not null
     or not bucket.can_see_shared_item(v_item.group_id, v_item.sender_id, v_item.recipient_id, v_item.id, p_reporter)
     or v_item.sender_id = p_reporter then
    raise exception 'not_found';
  end if;
  insert into bucket.group_item_reports (item_id, reporter_id, reason)
    values (p_item, p_reporter, p_reason)
    on conflict (item_id, reporter_id) do nothing;
  select count(*) into v_count from bucket.group_item_reports where item_id = p_item;
  if v_count >= 2 then
    update bucket.group_shared_items set removed_at = now() where id = p_item;
  end if;
  return v_count;
end $$;

create or replace function bucket.remove_shared_item(p_item uuid, p_user uuid)
returns boolean language plpgsql security definer set search_path = bucket as $$
begin
  update bucket.group_shared_items i set removed_at = now()
    where i.id = p_item and i.removed_at is null
      and (i.sender_id = p_user or bucket.is_group_owner(i.group_id, p_user));
  return found;
end $$;

alter table bucket.group_shared_items enable row level security;
alter table bucket.group_shared_items force row level security;
alter table bucket.group_item_reports enable row level security;
alter table bucket.group_item_reports force row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'bucket' and tablename = 'group_shared_items' and policyname = 'member_select') then
    create policy member_select on bucket.group_shared_items for select
      using (removed_at is null and bucket.can_see_shared_item(group_id, sender_id, recipient_id, id, auth.uid()));
  end if;
end $$;

revoke all on bucket.group_shared_items from public, anon, authenticated;
revoke all on bucket.group_item_reports from public, anon, authenticated;
grant select on bucket.group_shared_items to authenticated;
grant select, insert, update, delete on bucket.group_shared_items to service_role;
grant select, insert, update, delete on bucket.group_item_reports to service_role;

revoke execute on function bucket.blocked_between(uuid, uuid) from public, anon;
revoke execute on function bucket.item_reported_by(uuid, uuid) from public, anon;
revoke execute on function bucket.can_see_shared_item(uuid, uuid, uuid, uuid, uuid) from public, anon;
grant execute on function bucket.blocked_between(uuid, uuid) to authenticated, service_role;
grant execute on function bucket.item_reported_by(uuid, uuid) to authenticated, service_role;
grant execute on function bucket.can_see_shared_item(uuid, uuid, uuid, uuid, uuid) to authenticated, service_role;
revoke execute on function bucket.send_shared_item(uuid, uuid, uuid, text, text, text, text) from public, anon, authenticated;
revoke execute on function bucket.report_shared_item(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function bucket.remove_shared_item(uuid, uuid) from public, anon, authenticated;
grant execute on function bucket.send_shared_item(uuid, uuid, uuid, text, text, text, text) to service_role;
grant execute on function bucket.report_shared_item(uuid, uuid, text) to service_role;
grant execute on function bucket.remove_shared_item(uuid, uuid) to service_role;

do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values ('group-shares', 'group-shares', false, 1572864, array['image/jpeg'])
      on conflict (id) do nothing;
  end if;
end $$;
