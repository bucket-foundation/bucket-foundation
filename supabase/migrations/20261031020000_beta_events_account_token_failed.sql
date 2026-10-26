alter table bucket.beta_events drop constraint if exists beta_events_name_check;

alter table bucket.beta_events add constraint beta_events_name_check
  check (name in ('app_open', 'session_start', 'session_end', 'card_shown', 'card_answered', 'lesson_complete', 'account_token_failed'));
