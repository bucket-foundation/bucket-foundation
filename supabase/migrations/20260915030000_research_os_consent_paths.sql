-- Research OS, under-13 gates and the guardian payee (ros-32).
-- INTEGRATION-PLAN.md section 6: under-13 learners are in through the
-- right gates: the COPPA school exception for rostered classes, vendor
-- consent (PRIVO or k-ID) for everyone else, guardian as payee for any
-- payment with parental visibility.

-- 1. A class can carry the school's consent basis. A rostered learner in a
--    class with basis 'school' reads as consent_status 'school'
--    (consent-paths.ts), with the document reference as the source.
alter table graph.classes add column if not exists consent_basis text not null default 'none';
alter table graph.classes add column if not exists consent_document text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'classes_consent_basis_check') then
    alter table graph.classes add constraint classes_consent_basis_check check (consent_basis in ('none','school'));
  end if;
end $$;

-- 2. Verified parental consent requests through a vendor, or the manual
--    path a staff member records. No guardian PII: a salted hash of the
--    contact the guardian used, for matching a vendor callback only.
create table if not exists graph.consent_requests (
  id                    uuid        primary key default gen_random_uuid(),
  learner_id            uuid        not null references auth.users (id) on delete cascade,
  vendor                text        not null check (vendor in ('privo','kid','manual')),
  vendor_ref            text,
  guardian_contact_hash text,
  status                text        not null default 'pending' check (status in ('pending','verified','declined')),
  recorded_by           uuid        references auth.users (id) on delete set null,
  created_at            timestamptz not null default now(),
  decided_at            timestamptz
);
create index if not exists consent_requests_learner_idx on graph.consent_requests (learner_id, status);
alter table graph.consent_requests enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'graph' and tablename = 'consent_requests' and policyname = 'own_select') then
    create policy own_select on graph.consent_requests for select using (auth.uid() = learner_id);
  end if;
end $$;

-- 3. Payee on the learner profile. A contributor under 18 is paid through a
--    guardian or a custodial account; the guardian can see every payment.
alter table graph.learner_profiles add column if not exists payee_type text check (payee_type in ('self','guardian','custodial'));
alter table graph.learner_profiles add column if not exists guardian_contact_hash text;
alter table graph.learner_profiles add column if not exists payee_visibility boolean not null default true;
