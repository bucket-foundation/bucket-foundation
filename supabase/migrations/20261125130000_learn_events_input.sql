alter table bucket.learn_events drop constraint if exists learn_events_name_check;
alter table bucket.learn_events add constraint learn_events_name_check
  check (name in ('age_band_set', 'placement_done', 'study_session_done', 'assess_done', 'tutor_turn', 'exposure', 'session_mix'));

alter table graph.event_usage drop constraint if exists event_usage_name_check;
alter table graph.event_usage add constraint event_usage_name_check
  check (name in ('placement_done', 'study_session_done', 'assess_done', 'exposure', 'session_mix'));
