# Research OS for K-12: Compliance

Bead `ros-07`, minors compliance pack. Reads against `_intake/research-os-k12/04-compliance-distribution.md` (the full regulatory research) and `PLAN-REVISION-1.md` section 3 item 8, which scopes this bead: "scope depends entirely on decision 1 [the sky-blue vs quantum-history front-door decision]; do not build the heavier flow until decision 1 resolves."

## What part A covers

Part A is the decision-independent slice: the parts of a minors compliance pack that do not change shape depending on which front-door path (sky-blue's from-day-one under-13 pilot, or quantum-history's lighter teen-consent Phase 1 flow) the founder picks.

- **`DATA-INVENTORY.md`**: every table and jsonb field in this Supabase project that can hold a learner's data, its legal basis, its retention rule, and a data-minimization audit, including which free-text fields a child may have written and their deletion rule.
- **`POST /api/research-os/privacy`** (`src/app/api/research-os/privacy/route.ts`, logic in `src/lib/research-os/privacy.ts`): export and hard-delete, self- or reviewer-gated, backed by a one-transaction Postgres function (`graph.privacy_delete_learner`, `supabase/migrations/20260910040000_research_os_privacy_consent.sql`) and an audit log (`graph.privacy_events`, hashed learner id only). Tested offline: `scripts/test-research-os-privacy.ts`.
- **`graph.learner_profiles`** (same migration) and `src/lib/research-os/consent.ts`'s `requireConsent`: the age-and-role gate's SHAPE. A role, a coarse age bucket, a consent status, and the rule tying them to blocked or allowed. Tested offline: `scripts/test-research-os-consent.ts`. **Not wired into a call site yet**, see "What is built but not wired," below.
- **`PRIVACY-POLICY-DRAFT.md`, `STUDENT-DATA-PRIVACY-ADDENDUM-DRAFT.md`, `AI-DISCLOSURE-DRAFT.md`**: three policy drafts, each marked draft and requiring counsel review, covering the notice, the district contract terms, and the AI transparency statement `_intake/research-os-k12/04-compliance-distribution.md` sections 1, 2, and 5 call for.

## What is built but not wired

`requireConsent` (`src/lib/research-os/consent.ts`) is complete and tested, but is not called from `src/app/api/research-os/workspace/route.ts` or `src/app/api/research-os/production/route.ts`, the two places it belongs in front of. Both files carry a commit from within the hour before this bead started (`git log -3 --since='3 hours ago' -- src/app/api/research-os/` returned two commits, the most recent 2 minutes old at the time this bead began), concurrent work this bead's own instructions name directly ("other agents are editing the workspace page, tool handlers, review and class routes, and the engine; keep to new files"). Wiring it in is a two-line addition at the top of each route's POST handler, documented at the bottom of `consent.ts`'s own file header, left as a TODO for the next PR that legitimately owns those two files.

## What part B needs

Part B is the front-door-dependent work, blocked on the founder's own decision 1, and the heavier, vendor-integration-shaped work this pack does not attempt:

1. **The front-door decision itself.** Which pilot path (sky-blue, quantum-history, or something else) determines whether part B needs the FULL COPPA verified-parental-consent flow from day one, or the lighter teen-consent flow `_intake/research-os-k12/04-compliance-distribution.md` section 8 describes for a Phase 1 pilot.
2. **A verified-parental-consent (VPC) vendor.** `_intake/research-os-k12/04-compliance-distribution.md` section 13 recommends buying this rather than building it: "buy the actual identity/age verification mechanism from a compliance vendor rather than building novel age-verification technology, since getting VPC verification wrong is a direct FTC exposure." No vendor is chosen yet. `consent_status`'s `'parent'` value is the slot this integration writes into once one is chosen; the column itself does not depend on which vendor.
3. **Age assurance for the general age-bucket question.** How a learner's `birth_year_bucket` gets set in the first place (a self-report at signup, a school roster import, a parent-completed form) is a product decision this part does not make; `graph.learner_profiles` stores the answer however it arrives, but nothing in part A writes to that column yet.
4. **District DPA signatures.** The SDPC NDPA is at version 2.2 (published November 19, 2025, confirmed live 2026-09-10, see `STUDENT-DATA-PRIVACY-ADDENDUM-DRAFT.md`'s own version note); Bucket Foundation has not yet signed the base NDPA or filed it in SDPC's Resource Registry, the pre-pilot deliverable `_intake/research-os-k12/04-compliance-distribution.md` section 2 names directly.
5. **Time-based retention and a scheduled purge.** `DATA-INVENTORY.md`'s retention column states "while the account is active, deleted on request"; no automatic purge job exists for an account that goes inactive without anyone requesting deletion. Several state laws (Colorado HB 16-1423's destruction-on-contract-end, New York's own retention-schedule expectation) will need this before a real district contract; a first pilot can proceed without it.
6. **Self-service access to the privacy route.** `POST /api/research-os/privacy` exists and is self- or reviewer-gated today, but no in-product UI calls it yet; a parent or eligible learner today would need a reviewer or the founder to run the request on their behalf. A self-service "export my data" / "delete my account" button in the learner's own settings belongs to part B's product work, on top of part A's plumbing.
7. **Counsel review of every draft.** All three policy documents in this directory are drafts. None has been reviewed by a lawyer. None should be published, signed, or shown to a real school, parent, or district until that review happens, per `_intake/research-os-k12/04-compliance-distribution.md` section 13's own recommendation to retain counsel before the first district contract.
8. **The four items `_intake/research-os-k12/04-compliance-distribution.md`'s own "Summary of Unverified Items" section names**, unchanged by this pass: Argentina's minors-data-specific requirements, Switzerland's FADP age-of-consent specifics, Chile's exact UTM-to-USD fine conversion, and the FLSA/state child-labor question for the citation-payment mechanic (section 6 of that document, the least-precedented part of the whole plan, and explicitly out of this bead's decision-independent scope).

## Open founder decisions, restated

Two decisions block part B, both named in the source documents this pack reads from and neither resolved by this pass:

- **Decision 1** (`PLAN-REVISION-1.md`): sky-blue vs quantum-history, the front-door pilot path, which sets whether part B needs the heavy or the light consent flow first.
- **The VPC vendor choice** (`_intake/research-os-k12/04-compliance-distribution.md` section 13): which commercial verified-parental-consent mechanism to buy, once decision 1 makes clear whether one is needed for a first pilot at all.
