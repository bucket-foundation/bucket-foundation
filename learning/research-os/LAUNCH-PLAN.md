# Research OS Launch Plan

Base: `dev` at `2a29127ba`, inspected 2026-09-23. UNVERIFIED marks what this session could not check.

## Answer

Launch Learn to invited adult self-learners from the waitlist, in waves of 50, with the tutor dark on day one. Success at 30 days is 60 activated learners with 30% of them studying again in days 2 to 8. The tutor experiment is pre-registered now, runs as a feasibility pilot during the first 90 days, and waits for about 1,070 assessment completers before a confirmatory run.

## 1. First Users

The waitlist form offers five roles: student, teacher, researcher, parent, other (`src/lib/waitlist/core.ts:3`). This session could not read the list, since `GET /api/waitlist` needs `WAITLIST_ADMIN_KEY` (`src/app/api/waitlist/route.ts:61`). The founder counts roles from the `/admin/waitlist` CSV before wave 1.

| Segment | What the product does for them today | Blocker | Verdict |
|---|---|---|---|
| Adult self-learners | Learn runs from the static corpus at `/academy-app/corpus`: 487 science atoms with about 998 quiz items, FSRS-5, placement of at most 18 questions, a sealed ten-item assessment (`docs/RESEARCH-OS-APP.md`, `src/lib/academy/diagnostic.ts:12`) | None beyond sign-in | First cohort |
| Researchers | The MVP loop needs imports and evidence search, partial until #196 and #218 land (`learning/research-os/ROADMAP.md`) | Canon data died with the old database | Wave 2 |
| Teachers with classes | Classes, rosters, assignments ship | Minors. Consent vendors answer `vendor_not_configured` (`src/app/api/research-os/consent/route.ts:83`); any user can self-grant a teacher role (PR-074 in `docs/FOUNDER-DECISIONS.md`) and then set `consent_basis: "school"` for a class they made (`consent/route.ts:105`) | After a consent fix |
| Homeschoolers | Same as teachers | Same minors problem, parent as payer | After a consent fix |

Count target: invite up to 150 adults in three waves of 50. Target 60 activated by day 30 and 250 by day 90, with public sign-up opened after wave 3 if the 30-day bar holds. If the list holds fewer than 150 eligible adults, invite all of them and open sign-up at wave 2.

## 2. Launch Screens

| In at launch | Route |
|---|---|
| Sign-in | `/sign-in` |
| Home | `/research-os/home`, the landing after sign-in (`src/lib/auth/paths.ts:14`) |
| Learn | `/research-os/learn`, `/learn/[branch]`, `/place`, `/study`, `/[atom]`, `/assess` |
| Profile | `/research-os/profile`: age band, privacy export and delete |
| Node page | `/research-os/n/[slug]` for `academy_atom` nodes |

Staff-only at launch: workspace, import, map, primes, attend, nsm, software, productions, and the whole teach group (`src/app/research-os/(app)/AppShell.tsx:21-45`). Languages and roots render in `n/WordsSection.tsx` and stay staff-only.

Core loop, first session: sign in with an email code, answer the age question, open a deck, finish placement, finish one study session of today's route. Day 2 onward: return for due reviews.

### Launch-Blocking Gaps

| ID | Gap | Where | Fix |
|---|---|---|---|
| G1 | No database. Every API returns 503 | `src/lib/research-os/db.ts:17` | Hosted project, section 3 |
| G2 | Graph is empty, so learn-sync finds no nodes and home has nothing to show | `src/lib/research-os/learn-sync.ts:27-36` | Run `ingest:research-os:academy --apply` against hosted. Canon and intake imports wait |
| G3 | Learn writes progress with no age check. The consent actions cover workspace, probe, transfer, production and search only | `src/lib/research-os/consent.ts:17`, `src/app/api/academy/progress/route.ts` | Require the age band on first run; hold under-18 accounts read-only at launch; delete data for under-13 |
| G4 | Out-of-scope pages are hidden from the nav only. `status/page.tsx`, `patents/page.tsx` and others render for any signed-in user | `(app)/*/page.tsx` | A launch-scope check that returns 404 for non-staff on each out-of-scope page and its write APIs |
| G5 | `/api/research-agent` calls the model with no sign-in, 8 per minute per IP in memory | `src/app/api/research-agent/route.ts:16-45` | Require sign-in and staff before any key is set |
| G6 | No product events; assessment runs are graded and dropped | `src/lib/academy/assess.ts`, `useAcademy.ts:62` | Events table, section 4 |
| G7 | No privacy notice anywhere under `src/app` | grep for "privacy policy" returns nothing | Privacy page; copy needs founder approval under FD-4 |
| G8 | Launch-day email promised by `WaitlistForm.tsx` has no sender | `src/app/sign-in/WaitlistForm.tsx` | Invite script, section 6 |

Tutor gaps block the tutor, which is outside the day-one loop:

| ID | Gap | Where |
|---|---|---|
| T1 | Route has no sign-in check and accepts up to 20,000 characters of client-supplied grounding, so a key makes it an open proxy | `src/app/api/academy/tutor/route.ts:209-217` |
| T2 | Rate limit is a per-instance in-memory map, 20 per minute per IP; the workspace daily cap is in memory too | `tutor/route.ts:20-35`, `src/lib/research-os/rate-limit.ts:15` |
| T3 | Hint-only is a prompt preference ("prefer a guiding question", rule 3 of `SYSTEM`) | `tutor/route.ts:141` |
| T4 | Learn has no tutor UI. The only caller is the legacy PWA | `learning/app/js/tutor.js:4` |

## 3. Infrastructure

### Hosted Supabase

Free-plan terms: 500 MB database, 50,000 monthly active users, 1 GB file storage, 5 GB egress, two free projects per organization (supabase.com/pricing). A free project pauses after seven days of low activity and can be restored for 90 days (supabase.com/docs/guides/platform/free-project-pausing). The Free plan carries no automated backups (pricing page, UNVERIFIED this session), so an ops job runs a nightly `pg_dump`. 

Migration replay: 53 files in `supabase/migrations`. CI already replays all of them on a fresh stack (`.github/workflows/site-ci.yml:100-102`), so `npx supabase link` then `npx supabase db push` is the path (`docs/AUTH.md:48`). Add `graph` and `bucket` to exposed schemas in Settings, API.

Auth email: the default sender delivers only to the organization's team members; any other address fails with "Email address not authorized". After custom SMTP is saved, Auth sends at 30 messages an hour until raised (supabase.com/docs/guides/auth/auth-smtp). Resend's free tier lists 3,000 a month and 100 a day (resend.com/pricing, UNVERIFIED this session). At 100 a day, waves stay at 50 invites so returning sign-ins fit. Paste `supabase/templates/magic-link.html`, which uses `{{ .Token }}`, and add an invite template. Site URL `https://www.bucket.foundation`, redirect `https://www.bucket.foundation/**`.

Sign-up control: `shouldCreateUser` is a browser option (`src/app/sign-in/SignInForm.tsx:54`), and `docs/AUTH.md:60` names the server-side signup setting as the real control. Turn off public sign-ups, create wave accounts with the admin invite call, turn sign-ups on at wave 3.

RLS audit: 42 tables are created across the migrations, 41 enable RLS; `graph.import_quota` is the exception and revokes all from `anon` and `authenticated` (`20260922020000_research_os_import_files.sql`). The grant block gives schema usage on `graph` and `bucket` to `service_role` alone, and the per-user boundary lives in code. Ship a pgTAP test under `supabase/tests/` asserting `anon` and `authenticated` hold no usage on either schema, and run the dashboard security advisor after the push.

### Vercel Env Vars

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `BUCKET_SIGNIN_OPEN=1` (read at build, so a redeploy follows, `docs/AUTH.md:52`), `RESEARCH_OS_REVIEWER_EMAILS`, `RESEARCH_OS_HASH_SALT` as a secret (today it falls back to the public Supabase URL, `consent/route.ts:12`), `RESEARCH_OS_DAILY_TOOL_CAP=20`. `ANTHROPIC_API_KEY` comes later.

### Anthropic Key

The key lights tutor, research agent, workspace and probe at once (`src/lib/llm/provider.ts`). For FD-5: set it after T1 to T3 and G5 merge, around week 3.

Cost: the tutor calls `claude-sonnet-4-5`, 700 output tokens at most (`tutor/route.ts:7-11`). `src/lib/research-os/llm.ts:37` prices it at $2 and $10 per million tokens; Anthropic's rate is $3 and $15, so logged costs read a third low. A typical turn of 3,000 input and 250 output tokens costs about $0.013; the worst case of 8,000 and 700 costs about $0.035. Claude Haiku 4.5 at $1 and $5 cuts that by two thirds; the founder picks the model.

Ceiling: a dedicated Console workspace with a $50 monthly spend limit, plus a durable per-user cap of 30 tutor turns a day kept in Postgres on the `import_quota` pattern. At 20 turns per active learner per month, 200 learners cost about $52.

### Cost Per Active User

Supabase $0 and email $0 inside free tiers, tutor about $0.26 a month at 20 turns. Vercel is $0 on Hobby; the team plan was not visible to this session, and Hobby's terms cover non-commercial use, so the founder confirms the plan.

## 4. Measurement

Vercel Web Analytics (`src/app/layout.tsx:253`) records pageviews without cookies, so it covers the anonymous funnel from `/` through `/sign-in` to `/learn/*/place`. Custom events work on Hobby with 50,000 a month included. Retention lives in Postgres.

New table `bucket.learn_events` with `user_id`, `name`, `props jsonb`, `arm`, `created_at`, written by server routes only, added to `PRIVACY_TABLES` (`src/lib/research-os/privacy.ts:30`) and to the `privacy_delete_learner` RPC.

| Event | Written by |
|---|---|
| `age_band_set` | profile route |
| `placement_done` with branch, questions, known count | new authed `POST /api/academy/event` |
| `study_session_done` with items, correct, seconds | same route; cross-checked against `stats.history` in the progress blob (`src/lib/academy/mastery.ts:87`) |
| `assess_done` with item ids and per-item verdict, auto-graded apart from self-checked | same route |
| `tutor_turn` with arm, atom, abstained, leak blocked, tokens, cost | tutor route |

Definitions. Activated: placement done and one study session of 10 or more graded items within 24 hours of the first sign-in. Week-1 retained: an activated learner with a study session on any of days 2 to 8. Completed learn session: the day's route finished or 10 graded items in one `StudySession`. Review decisions: weekly counts of founder decisions from the rows `decideEdge` and `decideNsmLink` write, tracked as an ops number.

Privacy and consent. The privacy page names each event, its purpose and the existing export and delete paths (`/api/research-os/privacy`). The experiment takes a separate opt-in. Nobody under 18 is enrolled; `decideConsent` blocks unconsented minors on the listed actions (`consent.ts:32-44`), and G3 extends that to Learn.

| Bar | 30 days | 90 days |
|---|---|---|
| Activated | 60 | 250 |
| Week-1 retention of activated | 30% | 30% |
| Four-week retention | reported | 20% |
| Completed sessions | 300 | 2,000 |
| Recall at due versus the 0.9 FSRS target (`src/lib/academy/engine.ts:61`) | reported | within 5 points |
| Incidents | zero auth or privacy | zero |
| LLM spend | under ceiling | under ceiling |

A week-1 miss at 30 days stops new waves for two weeks of interviews with ten learners who left.

## 5. Tutor Experiment

Design, pre-registered on OSF before the first assignment, after Bastani et al. 2025 (PNAS, doi 10.1073/pnas.2422633122): unrestricted GPT-4 raised practice scores 48% and lowered no-AI exam scores 17%; a hint-only tutor raised practice 127% with no exam harm (`learning/research-os/LITERATURE-REVIEW.md`).

| Element | Choice |
|---|---|
| Arms | hint-only; full answer; no tutor |
| Unit | the individual learner, assigned server-side at consent, stratified by branch and placement tertile, stored with every event |
| Primary outcome | score on a sealed no-AI assessment of held-out items, auto-graded only, 14 days after enrollment, tutor absent from the page |
| Covariate | placement estimate |
| Analysis | intention-to-treat among consenters, ANCOVA, two contrasts against no tutor at alpha 0.025 each |
| Secondary | practice accuracy, to test the crutch pattern; recall at due; week-1 retention |

Atom-level randomization within a learner gains power, and a crutch habit spills across atoms toward zero, so the learner is the unit.

Held-out items: the corpus has about two quiz items per atom, and `buildRun` draws assessments from the practice pool (`src/lib/academy/assess.ts:134`). A separate bank costs about 3 to 5 days per branch.

Hint-only in code: the server loads grounding from the corpus by `atomId` and drops the client payload; it compares each reply against the atom's canonical answers with `gradeAnswer` and `extractSalientNumber` (`assess.ts:59,95`) and swaps a leaked answer for a hint. This follows the review's rule that the block lives in code at the step level (`learning/research-os/LITERATURE-REVIEW.md`, section "Hint-only tutoring is the one design rule with harm data").

Power, two-sided, power 0.8, covariate correlation 0.5 assumed, which scales n by 0.75:

| Effect d | Completers per arm | Three arms | Two arms at alpha 0.05 |
|---|---:|---:|---:|
| 0.2 | 357 | 1,070 | 588 |
| 0.1 | 1,426 | 4,277 | 2,355 |

At 60 completers per arm the minimum detectable effect is d = 3.08 × sqrt(2/60) × 0.87 = 0.49. Realistic effects sit at 0.06 to 0.29 (ASSISTments g = 0.18, 0.29 for low prior achievers; Khanmigo 0.06 to 0.08 SD a year, vendor-reported), per `education.md:78-89`. The launch count does not support the trial.

Recommendation: register now and pilot inside 90 days with 150 consenting adults, measuring consent rate, assessment completion, tutor use, leak-filter hits and arm balance. The confirmatory run opens when the projected completer count reaches 1,070 inside six months.

Ethics: Bucket has no institution or review board (FD-8); publication needs an independent board or a university partner. The full-answer arm reproduces a condition with harm data, so the consent text states that risk, withdrawal is one button, and decliners get hint-only outside the analysis. Minors never enter the full-answer arm and enter the trial only after verified parental consent through `consent-vendor.ts`, which is unconfigured today. Retrieval and practice gains stay separate from learning claims, and the Mastery Profile stays a signal (`CLAUDE.md`, Academy section).

## 6. Launch Sequence

Sizes: S under half a day, M one to two days, L three to five days. Beads carry `needs-founder` and `source-agent` until the founder approves this plan. Site work goes on `feat/ros-launch-*` into `dev`; scripts and backups go on `ops/*` into `ops/integration`.

| # | Item | Owner | Size | Week |
|---|---|---|---|---|
| 1 | Supabase project, SMTP, DNS records for the sender, Vercel env vars | Founder | S | 0 |
| 2 | Push migrations, academy import, pgTAP grant test, nightly dump | Ops session | M | 0 |
| 3 | G4 and G5 gate, tested by `scripts/test-launch-scope.ts` as a non-staff account | Features | M | 0 |
| 4 | G3 age step and under-18 hold | Features | M | 0 |
| 5 | G6 events table, event route, assessment persistence, privacy integration | Features | M | 0 |
| 6 | G7 privacy page draft | Features | S | 0 |
| 7 | Approve privacy copy | Founder | S | 1 |
| 8 | G8 invite script from the waitlist CSV, 50 a day | Ops session | S | 1 |
| 9 | `tests/e2e/loop.spec.ts` against a hosted preview, extended for the age step and events | Features | S | 1 |
| 10 | Promote `dev` to `main`, sign-in flag on, wave 1 | Founder | S | 1 |
| 11 | T1, T2, T3 tutor hardening with leak-filter tests over corpus answers | Features | L | 2 |
| 12 | T4 tutor panel in `AtomView` and `StudySession`, arm assignment, consent screen | Features | M | 3 |
| 13 | Held-out item bank, first two branches | Features, founder review | L | 3 to 4 |
| 14 | Key set, OSF registration, pilot opens | Founder | S | 4 |
| 15 | Waves 2 and 3, 30-day review | Founder | S | 2 to 5 |

The pending edge and NSM review queues feed staff-only surfaces and wait until after wave 1.

Rollback: `BUCKET_SIGNIN_OPEN=0` and a redeploy restore the launch list; the Supabase sign-up switch closes new accounts.

Removing the tutor key returns the tutor to its 503 fail-safe (`tutor/route.ts:221`, "Tutor isn't enabled yet").

### Founder Decisions

| # | Decision | Recommendation |
|---|---|---|
| D1 | First cohort | Invited adults, waves of 50 |
| D2 | Hosted Supabase organization and email provider | Free tiers, sender on bucket.foundation |
| D3 | FD-5: key, model and ceiling | Yes after T1 to T3 and G5; $50 a month; Sonnet 4.5 or Haiku 4.5 |
| D4 | Pilot now, full trial later, and the review-board route | Pilot with adults; name a university partner or a paid board |
| D5 | FD-7: promotion date | End of week 1 |

## 7. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Model spend through an open route | High until T1 and G5 | Key waits for those fixes; spend limit; durable cap |
| A minor signs up | Medium | Age step, under-18 hold, adults-only invites |
| Email caps stall sign-in on a wave day | Medium | 50 per wave; raise the Auth rate limit |
| Free project pauses or loses data | Low with users, high between waves | Nightly dump; daily health query |
| Retention misses | Unknown | Stop waves; interview leavers |
| Public metadata still names Story Protocol and IP NFTs against the final decision | Certain | FD-4 copy pass (`src/app/layout.tsx:23-24`) |
| Doc drift: `CLAUDE.md` says 358 atoms and a sealed `bucket` schema; the corpus holds 487 and `docs/AUTH.md:48` exposes it | Certain | Fix in launch PRs |
| Trial never reaches power | High | Pilot data sets the go date; two-arm fallback at 588 |

Unrun: the waitlist count, the Vercel plan, any build or test.
