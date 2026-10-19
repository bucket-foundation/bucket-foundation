# Brand plan

Bead bkt-y425. Shape follows `datasoar/brand/WEBSITE-PLAN.md`. Evidence: [INTERNAL-PLAYBOOKS.md](INTERNAL-PLAYBOOKS.md) and [EXTERNAL-CASE-STUDIES.md](EXTERNAL-CASE-STUDIES.md). Brand foundation: [brand/workshop/BUCKET-FOUNDATION.md](../../brand/workshop/BUCKET-FOUNDATION.md).

## Approval boundary

This plan covers positioning, four growth patterns, one capture endpoint, the first-user funnel, measurements and a 30-day bead sequence. No page or route changes land from this file. Each bead below carries `source-agent` and `needs-founder` and waits for founder approval, per the Agent Work Rules in `CLAUDE.md`. Spend (the Whop bounty pool) needs its own yes.

## Positioning and voice

Bucket is an open research workspace and a small canon of foundations, free to read and designed to pay the author on every citation. Polingual is the language surface of the same photon substrate and the first learner product inside Bucket.

| Item | Decision |
|---|---|
| SOCO | A small canon of foundations you can trust and cite, free to read |
| Tagline | free to read. paid to cite. Closer: written in stone. |
| Polingual line | every word in every language, one meaning |
| Voice | Precise, Humble, Credible, with Playful inside Polingual only |
| Claims | The fee rail is specified and does not settle yet. Say "designed to". No invented metrics. |
| Lint | `agf-lint-voice check` on every doc and UI string |

The full workshop is in `BUCKET-FOUNDATION.md`. It stays unlocked until the founder signs it (bkt-y425.1).

## Reference translation

Same method as `datasoar/brand/DESIGN-DIRECTIVES.md`: a reference feature, then the Bucket application. Page structure and mechanics are borrowed. Art is original, with a provenance log, because Whop phoned DataSoar (agf-q3i1).

| Reference | Bucket application |
|---|---|
| Quizlet, Anki, Notion templates: each user object is a URL | Public deck pages |
| Duolingo, Brilliant: one daily item | Daily word and daily foundation |
| Mozilla donor wall, Notion creator credit | Founding readers wall and author credit on copies |
| Our World in Data, Wikipedia: free reuse | Free to embed with a one-line citation |
| Kala early-access route | One capture endpoint |
| Kala quiz with 7 personas | First-run quiz attributes on the capture record |
| Khan Academy: teach one real person on camera | Weekly first-user session clip |
| DataSoar critic loop: 8.7 before build, 8.8 after | Critic pass on each bead before merge |
| Whop Content Rewards | A $100 clip bounty pool, founder gated |

## Four patterns

### Public deck pages

Every public bucket and every Polingual deck gets a stable URL, a clean title, JSON-LD and a sitemap entry. A copy button forks the deck and credits the author by name. Seed one niche where scores matter and let one power user own the canonical deck. Bead bkt-y425.5. Acceptance: pages return 200, carry unique titles and canonicals, and appear in `sitemap.xml`.

### A daily item

One Polingual word and one canon foundation each UTC day, on `/daily`, in `feed.xml` and as a 1200 by 630 share card. The pick is deterministic so every visitor sees the same item. Bead bkt-y425.6. Acceptance: same item for all visitors within a day, card renders in Slack and X previews.

### Naming the people

An opt-in founding readers wall, and the author named on every copied deck and canon citation. Mozilla printed 10,000 names for about $250,000. Bucket prints names for free on its own page. Bead bkt-y425.7. Acceptance: no name appears without consent, and the existing forget path removes it.

### Free to embed

Each canon entry shows its license line, a copy-citation button and an embed snippet that links to the canonical URL. Reading and embedding stay free, which is the part that spreads. Bead bkt-y425.8. Acceptance: the snippet renders on a plain HTML page, and each entry's source license is checked before it is marked CC BY.

## One capture endpoint

`POST /api/capture` replaces the separate writes behind `/api/download`, `/api/waitlist` and the Polingual signup. It follows the Kala `early-access` route.

| Step | Rule |
|---|---|
| Validate | JSON body, normalized email, consent flag, honeypot field |
| Limit | One submit per IP per 30 s, shared store as `/api/download` already uses |
| Record | One flat shape: email, source, persona, language pair, interest, opt-ins, timestamp |
| Fan out | Store, welcome email, analytics event, optional Slack. Each leg is env-gated and fire-and-forget with a 6 s timeout |
| Respond | In about 400 ms, with a `delivered` map that reports `dispatched` or `null`, never a claim of delivery |

Sources are `download`, `footer`, `polingual`, `quiz` and `wall`. The persona comes from the first-run quiz. List state lives in one system, and the transport only sends. Bead bkt-y425.3. Acceptance: tests for validation, honeypot, rate limit and the per-leg map.

## First-user funnel

The 2026-10-18 first user (English root, knows Russian) went well. The funnel turns that session into a repeatable path.

| Step | Surface | Event | Dependency |
|---|---|---|---|
| 1 | `/download` and polingual.com | `download_click`, `download_complete` | one-click download, shipped in #854 |
| 2 | Placement | `placement_complete` | frozen UX `polingual-ux-v1` |
| 3 | Study | `first_card`, `first_review` | frozen UX |
| 4 | Sign-in prompt after first review | `sign_in_complete` | bkt-oypt.4 sync |
| 5 | Second device or next day | `return_d1`, `device_added` | bkt-oypt.4, bkt-oypt.2, bkt-oypt.3 |

The UX stays frozen. Changes need evidence from the session log and founder sign-off. Run five more sessions with one fixed script (bkt-y425.4). Wire the funnel in bkt-y425.9 and film one consented 30 s clip in the Kala Games format (bkt-y425.10).

## Measurements

Nothing below is recorded today. Record baselines for 30 days, then set targets (bkt-y425.12).

| Measure | Source | Note |
|---|---|---|
| Home to `/research-os` rate | analytics `open_research_os` | Funnel proposal target: half of first visits |
| Sign-in rate from `/research-os` | analytics `sign_in_complete` | Funnel proposal target: one in five |
| Downloads by OS | `download_complete` | Compare with release `bkt-v0.4.0` files |
| Capture count by source | `/api/capture` store | Replaces three separate counts |
| Placement to first card | session log, then events | Time and drop-off |
| Next-day return | `return_d1` | Needs sync for cross-device |
| Daily item shares | share card referrers | After bkt-y425.6 |
| Embeds and citations | referrers to canonical URLs | After bkt-y425.8 |
| Public deck pages indexed | Search Console | After bkt-y425.5 |

Kala, DataSoar and the demo videos recorded no conversion figures. Record them this time.

## 30-day sequence

| Days | Bead | Work |
|---|---|---|
| 1 to 3 | bkt-y425.1 | Founder fills and signs `BUCKET-FOUNDATION.md` |
| 1 to 5 | bkt-y425.2 | One home primary action, four analytics events |
| 3 to 10 | bkt-y425.3 | `POST /api/capture` |
| 3 to 10 | bkt-y425.4 | Five first-user sessions with a fixed script |
| 8 to 14 | bkt-y425.5 | Public deck pages |
| 8 to 14 | bkt-y425.6 | Daily item and share card |
| 15 to 21 | bkt-y425.7 | Founding readers wall |
| 15 to 21 | bkt-y425.8 | Free to embed |
| 15 to 25 | bkt-y425.9 | Download to study to sync funnel |
| 22 to 25 | bkt-y425.10 | 30 s first-user clip |
| 22 to 28 | bkt-y425.11 | Whop bounty pool, $100 cap, founder gate |
| 28 to 30 | bkt-y425.12 | Readout and targets |

Embargoed work (`gtm/2026-05-18-refused-then-fixed`) stays embargoed until bkt-1, bkt-2 and the on-camera zero-key citation close. The launch plan in `LAUNCH.md` stays founder gated.

## Rules

1. Borrow structure. Draw original art and log each asset's source and prompt.
2. A critic pass before merge on every bead, per `docs/agents/BUCKET-CRITIC.md`.
3. Founder gate between design and build for any public page.
4. Authors keep 100 percent of any bounty or fee Bucket controls, and the page says so.
5. Revisit a $3 default ask and a founder-voice banner after the 30-day readout.

## Sign-off decisions

- Is the home primary action Open Research OS or Download?
- Is the persona quiz the first-run quiz or a shorter capture form?
- Which language pair and country does Polingual win first?
- Does the founding readers wall go live before the fee rail settles?
- Approve or decline the $100 bounty pool.
