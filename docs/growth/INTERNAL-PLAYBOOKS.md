Bead bkt-y425, internal half. Paths are relative to `~/agfarms` unless they start with `~/`.

## Summary

| Playbook | Result on record | Transfers to Bucket |
|---|---|---|
| DataSoar and Whop | Brand kit, site and portal shipped in 16 days with critic scores of 8.7 to 9.1 | Borrow page structure and motion timing. Draw original art. Keep a provenance log |
| Kala site (Whop study) | One capture endpoint, five destinations, live since 2026-05-24 | Capture once, fan out, keep list state in one system |
| Verified and DerbyFish | A shared core with one verifier interface, a five-tab shell, 14 funding targets | Plugin shape for new surfaces and the grant route for the foundation |
| Kala research into Bucket | Palette, tagline, globe, brand canon and workshop all carried over | Finish the workshop Bucket never filled |
| Bucket gtm and growth | Five demo video cuts, a Show HN plan, a funnel proposal, a gated distribution playbook | Release the gates, then run the plan that already exists |
| Polingual first-user demo | One user, went well, UX frozen at `polingual-ux-v1` | Repeat with five more users before widening |

No playbook below records conversion, retention or revenue figures. The numbers are build, review and scope counts. Section 7 lists the missing measurements.

## 1. DataSoar and Whop

Sources: `datasoar/brand/DESIGN-DIRECTIVES.md`, `datasoar/brand/WEBSITE-PLAN.md`, `.beads/backup/issues.jsonl` (agf-57eh, agf-khoy, agf-yl5r, agf-m50w, agf-q3i1, agf-984a).

What was done:
- 2026-10-02, agf-57eh: a Whop-inspired brand kit, nine reviewed screens and a source-linked website plan, commit 566af06. Work stopped for founder sign-off before any site code.
- `DESIGN-DIRECTIVES.md` holds a translation table from Whop features to DataSoar: a centered illustrated hero, two illustrated onboarding choices, a restrained header with a direct call to action, and repeatable pictograms (ten service objects, thirteen trade objects).
- `WEBSITE-PLAN.md` fixes 18 core marketing routes, 13 industry pages on one template (breadcrumb, intro, five service bullets, case study, keywords, two FAQ pairs, banner, related links), and a Ready to Soar page with a two-choice fork before the form.
- The Whop source was measured: a 1.333 s carousel advance and a 0.507 s transition (agf-yl5r). DataSoar shipped 1.4 s and 420 ms, plus a 40 s logo orbit and heading word reveals.
- Founder rejected commit f99341d because boxed cards broke the Whop direction. The independent critic had scored it 5.7. The baseline was restored (bc771cb) and the corrected plan scored 8.7. The final build scored 8.8, and later passes scored 9.0 and 9.1.
- Checks at ship: 71 asset checks, 1,079 internal references, 56 page link checks, 42 live responses matching the tested build, and 27 browser captures across routes and viewports. The site is at datasoar.vercel.app.
- Client proof points came from the client checklist: 300+ businesses, 1M+ in ad spend managed, +250% in AI visibility. The plan forbids substituting the old Wix figures.

The risk (agf-q3i1): Whop phoned the founder. The audit found a Whop brand kit on disk, directives that name Whop, and image prompts that name Whop. No file hash matched the Whop archive, but the audit could not rule out derivative copying. agf-984a then replaced the storefront and megaphone art with 29 illustrations generated from text prompts with no reference images.

What transfers:
1. Copy structure and write original art. Page order, the two-choice fork and the motion timing are patterns. Illustrations, kit files and prompts that name a brand are exposure.
2. Run a critic before build and after. The pre-build critic caught a 5.7 revision before it cost another deploy.
3. Keep a provenance log from day one: where each asset came from, which prompt, which reference.
4. Stop at a founder gate between design and build, as agf-57eh did.
5. Bucket already cites Whop for creator economics in `learning/research/product/UX-CASE-STUDIES.md` (section 3: access passes, checkout modal, affiliate rail). Use it for Scholar tier structure only.

## 2. Kala site

Sources: `~/DerbyFish/kala-site/docs/early-access-pipeline.md`, `derbyfish/derbyfish-docs/operations/kala-newsletter-pipeline.md`, `~/DerbyFish/kala-site/marketing/kala-games/MEMO.md`, `~/DerbyFish/session-archive/2026-09-29/conversation.md`.

What was done:
- `verifiedonkala.com` is the Whop study surface, kept apart from `kala.fish`. On 2026-09-29 the founder asked for the Whop style on the Kala brand, and the session added Whop-style navigation and game cards.
- One endpoint, `POST /api/early-access`, takes the footer signup and the `/quiz` flow: 5 questions, 7 personas. It validates, honeypots, rate-limits at one submit per IP per 30 s, then fans out to five destinations: Google Sheets, Slack, lockin, a SendGrid welcome and a listmonk master list. The response returns in about 400 ms with a 6 s timeout per leg.
- listmonk owns list state (kala-master, kala-beta, kala-investors). Eleven persona attributes ride on each subscriber, and segments are saved queries on those attributes. SendGrid is transport only.
- Last end-to-end check: 2026-05-24, all five legs dispatched, subscriber landed with full attributes, welcome delivered.
- Known fault: the SendGrid key sits on a shared parent account, so a recipient another tenant unsubscribed can drop. The welcome sets `bypass_list_management`, which sends through.
- Kala Games promo: a 23.6 s silent captioned cut at 720 by 1280, hook "One more fish?", demo specimens only. No ad was funded and no tracking was added.

What transfers:
1. Persona quiz as the capture step. The quiz yields a segment on day one. Bucket's first-run quiz in `docs/growth/LAUNCH.md` can write the same kind of attributes.
2. Capture once, fan out, and report "dispatched" instead of "delivered".
3. Keep list state in one self-hosted system. Bucket's What's New digest runs through Resend today and has no segment model.
4. The games memo sets ad guards that fit a nonprofit: ads never touch verification, rarity or scoring, and an unavailable ad leaves the product usable.

## 3. Verified and DerbyFish

Sources: `verified/README.md`, `poker/strategy/TEMPLATE-SPEC.md`, `derbyfish/derbyfish-docs/war-room/BRAND-WORKSHOP-FRAMEWORK.md`, `bucket-foundation/grants-targets/derbyfish-kala.md`.

What was done:
- `verified/` is the VaaS monorepo. `@verified/core` exposes one `Verifier<TSession, TConfig>` interface, and poker, golf and fishing plug in behind it. Core never imports a vertical.
- The poker template (agf-0l7m, agf-d8j7, closed 2026-05-29) copies DerbyFish's five-tab shell and borrows from the Whop study: land with a one-tap proof demo, analyze, keep, explore, account.
- Naming at DerbyFish ran 15,777 generated candidates down to 327 and then a hand shortlist, and ended in "Kala" (`BRAND-WORKSHOP-FRAMEWORK.md`).
- The DerbyFish grant sheet lists 14 targets. The ones that fit LLCs: NOAA Saltonstall-Kennedy at $25K to $500K, NOAA Citizen Science at $75K to $200K a year, NSF SBIR Phase I up to $305K. The sheet puts SAM.gov registration first, a 4 to 8 week step.

What transfers:
1. Bucket's surfaces (web, `bkt` terminal app, desktop, Polingual) already share `packages/ros-contract`. Hold new surfaces to the Verified rule: the shell imports a plugin, and core imports nothing.
2. The proof-demo-first landing matches the funnel proposal's "try signed out" step.
3. Grants are the revenue path for a nonprofit with no equity. `grants-targets/INDEX.md` has the Bucket list. The DerbyFish lesson is to start registrations (SAM.gov, Grants.gov) before choosing a target.

## 4. What Bucket gained from Kala research

Sources: `brand/README.md`, `brand/research/INDEX.md`, `brand/workshop/FRAMEWORK.md`, `CHANGELOG.md`, `gtm/video-v5/README.md`, `docs/internal/archive/BEAD_BACKLOG.md`, `~/DerbyFish/kala-brand/CANON.md`.

| Gain | Date | Evidence |
|---|---|---|
| Brand research canon: 31 books, 5 frameworks, 24 case studies, about 2.7K lines | 2026-04-23 | `brand/README.md`, `brand/research/INDEX.md` |
| 12-step brand workshop, 3 to 6 hours with an AI collaborator, tested on Kala | 2026-04-23 | `brand/workshop/FRAMEWORK.md` |
| KALA Earth Ambient V06.1 palette and the carved-stone CSS system | 2026-04-23 | `CHANGELOG.md`, site 0.1.0 |
| Tagline "free to read. paid to cite." and closer "written in stone." | 2026-04-23 | `CHANGELOG.md` |
| Canon globe ported from kala.fish (React Three Fiber, branch markers) | 2026-05-01 | `BEAD_BACKLOG.md` |
| Stone-card demo video v5, 57 s, 8 cards, Kala palette | 2026-05 | `gtm/video-v5/README.md` |
| Header rule from the Kala unicorn template: 3 nav items plus 1 call to action | 2026-04-25 | `~/DerbyFish/kala-brand/CANON.md`, echoed by the four-item header in `docs/internal/SITE-FUNNEL-PROPOSAL.md` |

The seven cross-cutting patterns in the research apply directly: subtraction first, brand experienced before advertised, mission structural, category creation over competition.

Gaps:
- `brand/README.md` said Kala artifacts were not copied. It now lists the palette, globe and stone cards that were.
- `brand/workshop/BUCKET-FOUNDATION.md` is drafted and awaits founder sign-off (bkt-y425.1).

## 5. Bucket gtm and growth

Sources: `gtm/demo-video-plan.md`, `gtm/2026-05-18-refused-then-fixed/EMBARGO.md`, `gtm/2026-05-19-knowledge-seeking-distribution/PLAYBOOK.md`, `docs/growth/LAUNCH.md`, `docs/internal/SITE-FUNNEL-PROPOSAL.md`.

| Asset | State | Numbers |
|---|---|---|
| Demo video plan | v1 to v5 cuts exist in `gtm/video-v*` | Target 60 to 90 s, completion above 55%, over 100 unique visits in 72 h. No result recorded |
| Refused, then fixed set (video, X thread, LinkedIn) | Embargoed until bkt-1 and bkt-2 close and a zero-key citation is verified on camera | None |
| Knowledge-seeking distribution playbook | Draft, gated on P0 canon integrity | 7 tactics: agent surfaces, per-claim URLs with JSON-LD, the write-up, a cite widget, a cross-link map, an integrity page, cadence |
| Launch plan | Written, every channel founder-gated | Release `bkt-v0.4.0`, 5 binaries and 1 AppImage, 8 pre-launch checks unchecked |
| Site funnel proposal | Awaiting founder decision | 25 destinations today. Target: half of first visits reach `/research-os`, one in five sign in |

What transfers:
1. Gates are the strategy. The embargo files hold the line that every claim is true on the day it ships. Keep them and release them in order.
2. The agent-discovery surfaces (`llms.txt`, `feed402.json`, `mcp.json`) are the cheapest distribution Bucket has. The playbook says register pointers and let the canonical files carry the content.
3. The launch plan and the funnel proposal conflict on the primary action: LAUNCH.md leads with Download, the funnel leads with Open Research OS. Decide one.
4. Add the two events the proposal names, `open_research_os` and `sign_in_complete`. Without them no growth number exists.

## 6. Polingual first-user demo, 2026-10-18

Sources: `bd show bkt-oypt`, commits 09a1eeb22, f032d73de, 13eb632a9 and da167091b, `learning/research/_synthesis/UX-SPEC.md`, `docs/ROADMAP.md`.

What was done:
- The first user (English root, knows Russian) used Polingual. The founder logged the session as having gone well (bkt-oypt, epic "First user: Polingual on every device with sync").
- The UX was locked at tag `polingual-ux-v1`. A CI job (`polingual-ux.yml`) fails on any pixel or DOM change, and no UX change ships without founder sign-off.
- Commit f032d73de narrowed the freeze to the study and placement views: deck study, word lesson, review, plus science and language placement. It fixed the raster path and font hinting so snapshots match across runners.
- Distribution that day: a Polingual landing page with a bilingual-plus learner signup stored in Vercel Blob, a Download Bucket call to action, and a one-click `/download` page that detects the OS. PR #858 merged to `main` and polingual.com deployed.
- Substrate: 6,564,942 photons in 35 languages.
- Open work: Android signed build, iOS TestFlight, sync across devices, and a four-device acceptance gate.

What transfers:
1. The first-user session is the proof asset. Record it with consent and cut a 30 s clip in the format of the Kala Games promo.
2. Placement before signup is the planned onboarding fork (`UX-SPEC.md` item 4, `learning/EPIC.md`). Placement on the frozen UX is where a new learner meets the product.
3. Freeze the UX after the first user and change it only on evidence. The CI gate enforces that.
4. n is 1. Run five more first-user sessions with one fixed script: time to first card, placement score, a next-day return. Then write the result here.

## 7. Missing measurements

| Gap | Where it should live |
|---|---|
| Kala lead count and quiz completion | listmonk `kala-master` and the Kala Leads sheet |
| DataSoar enquiry volume | blocked on agf-nt00, the enquiry destination |
| Demo video completion and visits | none recorded for `gtm/video-v1` through `v5` |
| Polingual signups and first-user task data | Vercel Blob signups, a session script |
| Bucket funnel events | the two Vercel analytics events in the funnel proposal |

## 8. Next moves for Bucket

1. Sign `brand/workshop/BUCKET-FOUNDATION.md`. The plan is `BRAND-PLAN.md`.
2. Pick one primary action for the home page and wire `open_research_os` and `sign_in_complete`.
3. Run five Polingual first-user sessions with a fixed script.
4. Clear the embargo checklist in order: bkt-1, bkt-2, the on-camera zero-key citation, then publish the refused-then-fixed set.
5. Copy page structure from Whop-style references and commission original illustrations, with a provenance log.
