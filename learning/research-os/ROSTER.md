# Research OS for K-12: Roster Sync

**Status:** skeleton shipped, bead `ros-06` follow-on · **Date:** 2026-09-10 · Reads against `learning/research-os/PLAN-REVISION-2.md` section 3 item 4, `learning/research-os/TEACHER-LAYER.md`'s own "TODO(Phase 1, roster sync)" note, `learning/research-os/compliance/DATA-INVENTORY.md`, `_intake/research-os-k12/03-data-services.md` section E, and the 1EdTech OneRoster 1.2 CSV Binding (`https://www.imsglobal.org/spec/oneroster/v1p2/bind/csv/`).

`graph.class_members` rows have been entered by hand since `ros-06` shipped the teacher class view. This closes that gap the standard-first way: a OneRoster 1.2 CSV importer first, with Clever and ClassLink left as interface stubs behind the same `RosterSource`, since both vendors normalize to OneRoster once connected (`03-data-services.md` section E: "Build to OneRoster once").

## Why OneRoster 1.2 and four files

The importer accepts exactly the four files `orgs.csv`, `users.csv`, `classes.csv`, `enrollments.csv` out of a standard OneRoster 1.2 bulk CSV bundle and ignores every other file the spec allows (`roles.csv`, `courses.csv`, `academicSessions.csv`, `demographics.csv`, `manifest.csv`, and the rest). One spec detail shapes the parser: OneRoster 1.2 removed the `role` and `orgSourcedIds` columns from `users.csv` (role allocation moved to `roles.csv`, out of scope by the same decision). `enrollments.csv`'s own `role` column, restricted to `administrator | proctor | student | teacher`, is the only place this importer can learn whether a user is a student or a teacher, so role is resolved from enrollments, never from `users.csv` directly.

## Field mapping

| Source | Field | Destination | Notes |
|---|---|---|---|
| `orgs.csv` | `sourcedId`, `name`, `type` | *(not persisted)* | Parsed for a well-formed bundle check; no `graph.orgs` table exists. Discarded after parsing. |
| `users.csv` | `sourcedId` | `graph.reviewer_candidates.sourced_id` or `graph.learner_profiles.sourced_id` | The idempotency key, per role. |
| `users.csv` | `email` | `graph.reviewer_candidates.email`, or matched against Supabase Auth to resolve `graph.learner_profiles.learner_id` | Lowercased on parse. A student's email that matches no existing Supabase Auth account resolves nothing; see "What is discarded" below. |
| `users.csv` | `givenName`, `familyName` | `graph.reviewer_candidates.name` (joined) | Teacher contact display name only; never stored for a student. |
| `users.csv` | `grades` | `graph.learner_profiles.birth_year_bucket` | Mapped through `src/lib/research-os/roster/grade.ts`'s `gradeToBirthYearBucket`, never stored as-is. See "Grade to birth-year bucket" below. |
| `users.csv` | `username`, `password`, `phone`, `sms`, `identifier`, `userMasterIdentifier`, `preferredGivenName`/`preferredFamilyName`, `primaryOrgSourcedId`, `pronouns`, `agentSourcedIds`, any non-standard column | *(discarded at parse time)* | Never read into a `RosterUser`, never logged, never written anywhere. A bundle carrying an out-of-spec column (an `address` column, for instance) is dropped the same way. |
| `enrollments.csv` | `role` (per user, per class) | Whether a user becomes a `graph.reviewer_candidates` row (`teacher`) or a `graph.class_members` row (`student`) | An `administrator` or `proctor` enrollment is structurally valid OneRoster, outside this table's scope, and skipped without an error. |
| `enrollments.csv` | `classSourcedId` + a `teacher` enrollment's resolved email | `graph.classes.reviewer_email` | A `primary` teacher enrollment wins over any other for a class; failing that, the first teacher enrollment found. A class with no resolvable teacher enrollment at all is left unresolved (see below), never created with a placeholder or null owner. |
| `classes.csv` | `sourcedId`, `title` | `graph.classes.sourced_id`, `graph.classes.name` | `source_system` is always `"oneroster-csv"` for this source. |
| `enrollments.csv` (student rows) | `classSourcedId`, `userSourcedId` | `graph.class_members` (`class_id`, `learner_id`) | Idempotency is `graph.class_members`'s own primary key; no external id is needed on that table. |

## What is discarded

- Every `users.csv` column not named above: `username`, `password`, `phone`, `sms`, `identifier`, `userMasterIdentifier`, `preferredGivenName`/`preferredFamilyName`, `primaryOrgSourcedId`, `pronouns`, `agentSourcedIds` (parent/guardian contact references), and any column outside the OneRoster 1.2 spec a real bundle happens to carry.
- `orgs.csv` in full: parsed to confirm the bundle is well-formed, never written to any table.
- A `users.csv` row with no `student` or `teacher` enrollment anywhere in the bundle: an administrator, a proctor, or a user `enrollments.csv` never references.
- A student whose email matches no existing Supabase Auth account. The importer never creates a Supabase Auth user from roster data; a student's `graph.class_members` row and `graph.learner_profiles` row wait until that student has signed in at least once through the product's own auth flow. This is a deliberate boundary: the product's own sign-in stays the single place an account gets created. A roster import that silently created shadow accounts would open a bigger data-minimization problem than the one this bead closes.
- A birth date, in every case. `graph.learner_profiles.birth_year_bucket` is set only when `users.csv`'s `grades` field carries a recognized OneRoster CEDS grade code, mapped through a fixed table (below), never from any date field. OneRoster's own bulk CSV format has no birth date field for this importer to read even if it wanted one.

## Grade to birth-year bucket

`gradeToBirthYearBucket` (`src/lib/research-os/roster/grade.ts`) maps a recognized OneRoster grade code to `graph.learner_profiles.birth_year_bucket`, the same three-value bucket `compliance/DATA-INVENTORY.md`'s data-minimization note already documents:

| Grade codes | Bucket |
|---|---|
| `IT`, `PR`, `PK`, `TK`, `KG`, `01`-`07` | `under13` |
| `08`-`12` | `13to17` |
| `UG`, `PS`, `Other`, or no recognized code | *(left unset)* |

The boundary at grade 07 (ages roughly 12-13) is deliberately biased toward the stricter bucket: `src/lib/research-os/consent.ts`'s `decideConsent` gates a minor bucket the same way regardless of which minor bucket it is, so the only real failure direction is classifying an actual under-13 learner as something looser. No K-12 grade code ever produces `18plus`; that bucket needs a signal this importer does not have. A student with a list of grade codes (a mid-year transfer, say) gets the youngest recognized code's bucket, the same bias-young rule.

## Idempotency

Every write this importer makes is idempotent on the roster row's own `sourcedId`, or on a key that already made the underlying table idempotent before this bead:

- `graph.classes`: a plain unique index on `(source_system, sourced_id)`. Standard SQL null semantics do the rest: a manually created class (both columns null) never collides with another manually created class, or with a roster-synced one.
- `graph.reviewer_candidates`: a unique index on `(source_system, sourced_id)`, both columns required.
- `graph.class_members`: its own pre-existing primary key, `(class_id, learner_id)`. No external id is needed; a class's `sourced_id` plus a learner's real `auth.users` id already compose to a stable key.
- `graph.learner_profiles`: its own pre-existing primary key, `learner_id`. `source_system`/`sourced_id` are provenance metadata on this table; `learner_id` alone is the idempotency key.

Re-running the same bundle against an unchanged database produces a diff with every count at zero except `classMembersAlreadyPresent` and any structurally unresolved rows (an unknown-class enrollment stays reported on every run; it never silently resolves itself).

## The approval flow for reviewer candidates

Syncing a roster never grants review access by itself. `src/lib/research-os/reviewer.ts`'s `RESEARCH_OS_REVIEWER_EMAILS` env-var allowlist stays the only real gate on `POST /api/research-os/review`, `GET /api/research-os/class`, and this bead's own `POST /api/research-os/roster`, matching that file's own documented Phase-1 floor.

A teacher row a roster sync sees lands in `graph.reviewer_candidates` with `status = 'pending'`. Nothing in this bead reads that table to grant access; a human (today, whoever manages the deploy's environment variables) reviews the pending list and adds an approved teacher's email to `RESEARCH_OS_REVIEWER_EMAILS`, at which point that person can sign in and use the review and class-view routes the same as any other allowlisted reviewer. Updating a candidate's `status` to `'approved'` or `'rejected'` in the table itself is a record of that decision; nothing in the codebase reads `reviewer_candidates.status` to change what a request is allowed to do. A re-sync never resets an already-decided candidate's status back to `'pending'`: `src/lib/research-os/roster/apply.ts` inserts a brand-new candidate with `status = 'pending'` and updates only `email`/`name` on an existing one, never touching `status`.

## What Clever and ClassLink add

`CleverSource` and `ClassLinkSource` (`src/lib/research-os/roster/sources.ts`) are interface stubs behind the same `RosterSource` this bead's `OneRosterCsvSource` already implements; both throw `"not configured"` until a district partner exists, per `PLAN-REVISION-1.md` section 3 item 8's own gating note.

- **Clever** (`_intake/research-os-k12/03-data-services.md` section E): a district-run rostering and SSO network. Its free Clever Library tier lets a single teacher roster one class with no district contract; Secure Sync (district-wide) is custom-quoted and requires Clever's own FERPA data-sharing agreement even on the free tier. `CleverSource` would call Clever's REST API (`dev.clever.com`) and normalize its own sections/students/teachers response shape into the same `RosterBundle` `OneRosterCsvSource` already produces.
- **ClassLink** (same section): an OneRoster-based Roster Server. A district pays ClassLink; a connected vendor reads OneRoster data for free. `ClassLinkSource` would page through ClassLink's OneRoster REST endpoints directly, closer to a network-fetched version of this bead's own CSV input than a vendor-specific shape.

Both stubs document their own env-var contract (`CLEVER_CLIENT_ID`/`CLEVER_CLIENT_SECRET`/`CLEVER_DISTRICT_TOKEN`, `CLASSLINK_APP_ID`/`CLASSLINK_APP_SECRET`/`CLASSLINK_TENANT_ID`) so the shape is decided ahead of the integration itself. Neither adds a new diff engine: both are expected to feed the same `computeRosterDiff` (`src/lib/research-os/roster/diff.ts`) this bead's CSV source already uses.

## The route and page

`POST /api/research-os/roster` (`src/app/api/research-os/roster/route.ts`) accepts a `multipart/form-data` body with four required file fields (`orgs`, `users`, `classes`, `enrollments`), gated by the same `verifyReviewer` check `GET /api/research-os/class` uses. Dry run is the default; an `apply` form field set to `"true"` writes the diff. `/research-os/roster` (`src/app/research-os/roster/page.tsx`) is the upload page: the same email-OTP sign-in flow as `/research-os/class`, four file inputs, a dry-run and an apply button, and a table of the diff's counts plus its warnings. All parsing and diffing happens server-side; the page only renders the JSON the route returns.

## Tests

`scripts/test-research-os-roster.ts`, wired into `npm run test:research-os`, matching every other `scripts/test-research-os-*.ts` file's no-database convention:

- The CSV parser (`csv.ts`): quoted fields, embedded commas, doubled-quote escaping, a short row padded with empty strings.
- The grade-to-bucket mapping (`grade.ts`): both boundaries, the youngest-code-wins rule, no guess when no code is recognized.
- A fixture bundle (2 classes, 1 teacher, 5 students, 8 enrollment rows including one malformed row): dry-run diff counts for every category.
- A class with no teacher enrollment anywhere in the bundle stays unresolved and uncreated; its own enrollments report as unknown-class.
- Idempotency: applying the same bundle's diff twice (`applyRosterDiffToState`, a pure offline mirror of `apply.ts`, the same pattern `src/lib/research-os/privacy.ts`'s `simulateLearnerDelete` already uses for a live SQL function this suite cannot reach) yields zero creates or updates on the second pass, and the malformed enrollment is still reported.
- A re-sync never resets an already-approved reviewer candidate's status back to `pending`.
- Data minimization: a bundle carrying extra `address`/`phone` columns parses with those columns absent from every `RosterUser` object, and absent from the resulting diff's create payloads.
- The malformed enrollment (an unknown `classSourcedId`) is reported in `diff.classMembers.skipped` and never appears in `diff.classMembers.create`.
- `OneRosterCsvSource`, `CleverSource`, `ClassLinkSource`: each implements the same `RosterSource` interface; the two stubs throw `"not configured"`.
- A static read of `20260910050000_research_os_roster.sql` asserting the new columns and table, and RLS on `graph.reviewer_candidates`, matching `scripts/test-research-os-teacher-class.ts`'s own precedent for this kind of check.
- A privacy-delete regression: a static read of `20260910040000_research_os_privacy_consent.sql` confirming `graph.privacy_delete_learner` still deletes `graph.learner_profiles` rows now that this bead has added columns to that table.

**What this suite does not cover.** `src/lib/research-os/roster/apply.ts` (the live Supabase writes, and the Supabase Auth admin `listUsers` email index) runs no test against a real Postgres or a real Supabase Auth instance, the same limit `TEACHER-LAYER.md`'s own "what this suite does not cover" section names for every other DB-touching function in this repo.
