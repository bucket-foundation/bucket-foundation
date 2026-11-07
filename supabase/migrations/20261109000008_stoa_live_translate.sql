alter table bucket.live_questions drop constraint if exists live_questions_kind_check;
alter table bucket.live_questions add constraint live_questions_kind_check check (kind in ('pick_word', 'which_language', 'translate'));
