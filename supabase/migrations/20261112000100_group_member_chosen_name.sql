alter table bucket.group_members add column if not exists chosen_name boolean not null default false;

update bucket.group_members m
set chosen_name = true
where m.chosen_name = false
  and m.display_name !~* '^(learner|tester [0-9]+)$'
  and not exists (
    select 1 from auth.users u
    where u.id = m.user_id
      and (lower(split_part(u.email, '@', 1)) = lower(m.display_name)
           or initcap(regexp_replace(split_part(split_part(u.email, '@', 1), '.', 1), '[^A-Za-z]', '', 'g')) = m.display_name)
  );
