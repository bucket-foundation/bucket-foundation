alter table bucket.group_cheers drop constraint if exists group_cheers_kind_check;

alter table bucket.group_cheers
  add constraint group_cheers_kind_check
  check (kind in ('cheer', 'nudge', 'high_five', 'nice_streak', 'race_you', 'keep_going'));
