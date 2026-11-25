alter table bucket.polingual_offer_used add column if not exists session_id text;
grant update on bucket.polingual_offer_used to service_role;
