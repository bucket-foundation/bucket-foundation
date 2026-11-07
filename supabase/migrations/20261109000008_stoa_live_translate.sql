alter table bucket.live_questions drop constraint if exists live_questions_kind_check;
alter table bucket.live_questions add constraint live_questions_kind_check check (kind in ('pick_word', 'which_language', 'translate'));
alter table bucket.live_questions drop constraint if exists live_questions_translate_prompt;
alter table bucket.live_questions add constraint live_questions_translate_prompt
  check (kind <> 'translate' or (prompt ?& array['word', 'from', 'to'] and prompt ->> 'from' <> prompt ->> 'to'));
