alter table graph.consent_requests drop constraint if exists consent_requests_vendor_check;
alter table graph.consent_requests add constraint consent_requests_vendor_check check (vendor in ('privo','kid','manual','email'));
alter table graph.consent_requests add column if not exists parent_user_id uuid references auth.users (id) on delete set null;
