# Rulings on Eight Contradictions

Dated 2026-10-11. Repo evidence is read from `bucket-foundation` at `origin/dev` fded3dbf1; paths under `_intake/ideas/` are untracked files in the working tree. Line numbers refer to that commit. Two web pages were fetched on 2026-10-11 and one GET was made to `https://bucket.foundation/llms.txt`. No paid endpoint was called.

| # | Item | Ruling | Founder needed |
|---|---|---|---|
| 1 | Customer | Launch customer is the invited adult self-learner; the manifesto section 5 audience is the long-run thesis | Yes, confirm |
| 2 | x402 settlement | Nothing settles today | No |
| 3 | Test prep market | $70.71B, 2025, global; $47B is an unsourced derived slice | No |
| 4 | Insight tier price | Reader pays $0; the republisher rate in code is $0.002; nothing is collected | No |
| 5 | Protocol fee | 20% is the cap; no working rate is set; the public licence promises 0% | Yes, set the working rate |
| 6 | Year-one spend | Three scopes; four shared lines disagree | Yes, pick the baseline |
| 7 | HCB fee | 7% of revenue | No on the fee; eligibility open |
| 8 | Story Protocol | Withdrawn on 2026-06-14; code is clean and a test enforces it | No |

## 1. Customer

### Evidence

| Value | Where | Dated |
|---|---|---|
| A small number of people doing genius work with AI | `docs/foundation/MANIFESTO.md:57`, repeated at `:67`, `:86`, `:120`; `CLAUDE.md:7`; `docs/foundation/HISTORY.md:171` | Line 57 written 2026-04-14 |
| A person from the first year of school to the research frontier | `docs/foundation/MANIFESTO.md:31` and `:33`, which names a twelve-year-old producer | Written 2026-09-10 |
| K-12 | `public/llms.txt:74`, "Research OS for K-12"; `CHANGELOG.md:27`; `learning/research-os/PLAN-REVISION-1.md` to `PLAN-REVISION-4.md`, grades 3-5 front door at `PLAN-REVISION-4.md:146` | 2026-09-10 to 2026-09-18 |
| One researcher on one machine | `learning/research-os/ROADMAP.md:13`, the MVP stage test | 2026-09-22 |
| Invited adult self-learners, waves of 50, up to 150 | `learning/research-os/LAUNCH-PLAN.md:7`, `:15`, `:20`, decision D1 at `:182` | Inspected 2026-09-23, committed 2026-10-01 |
| Offline study app for a person at a computer | `docs/growth/LAUNCH.md:52`, the Show HN title and first comment at `:56` to `:58`; `docs/ROADMAP.md:3` and `:11` | 2026-10-01 and 2026-10-07 |
| Founder's own exam prep first | `learning/PRODUCT.md:5` | 2026-06-11 |

What the shipped product serves:

- `src/lib/waitlist/invites.ts:122` tells invitees the first wave is open to adults, 18 and over.
- `src/lib/research-os/learn-gate.ts:10` lets a learner under 18 study with progress kept on the device. `src/lib/research-os/evidence-search/gate.ts:21` limits the evidence search pilot to adult accounts. `src/app/privacy/page.tsx:97` enrolls nobody under 18 in the tutor study.
- `src/lib/research-os/launch-scope.ts` lists ten launch pages, all under Learn, home, profile and the node page.
- The classroom plans record no partner school, no review-board approval and no fiscal sponsor (`learning/research-os/PLAN-REVISION-2.md:136`).
- The newest founder statement, the 2026-10-07 voice notes in `_intake/ideas/2026-10-07-founder-voice-notes-DIGEST.md`, ties education to human capability and names no age band.

`PLAN-REVISION-4.md:146` to `:152` lists the audience questions as blocking decisions the founder has not answered. `LAUNCH-PLAN.md:182` lists the first cohort as a founder decision with a recommendation.

### Ruling

The three statements describe three horizons, and each document should say which one it means.

- Launch customer: an adult self-learner who installs `bkt` or joins an invited wave. This is the newest dated plan and the one the gates in the code enforce.
- MVP test: one researcher completing one loop on one machine. This is a build-order test for Research OS items and it names the same adult, single-user customer.
- K-12: a later segment. Minors can study read-only today; classes, parental consent vendors and a school pilot are unbuilt or unpartnered.
- Manifesto section 5: the long-run thesis of who the canon and the payment rail exist for. It stays as thesis and stops serving as the customer definition.

Recommended one-line customer statement for every document: "Bucket's first customer is an adult teaching themselves the foundations, on their own computer."

### Confidence

High that the shipped product serves adult self-learners. Medium on the ruling as a whole, since decision D1 and the four blocking decisions in revision 4 are unmarked by the founder.

### Files to correct

- `public/llms.txt:74`: drop "for K-12" from the Research OS line.
- `CHANGELOG.md:27`: leave as history.
- `docs/foundation/MANIFESTO.md` section 5: add one sentence that separates the thesis audience from the launch customer in section 3, or reconcile line 31 with line 67, which tells most readers the product is for someone else.
- `CLAUDE.md:7` and the AGFarms `CLAUDE.md` Bucket row: add the launch customer beside the canon thesis.
- `learning/research-os/PLAN-REVISION-1.md` to `PLAN-REVISION-4.md`: add a header marking K-12 as a later segment, superseded for launch by `LAUNCH-PLAN.md`.
- `learning/PRODUCT.md:5`: mark as the June origin of Learn.
- `learning/research-os/LAUNCH-PLAN.md:182`: record the founder's answer to D1.

## 2. x402 Settlement

### Evidence

The route a citation or agent query reaches is `src/app/api/research/route.ts`. `origin/main` and `origin/dev` hold identical copies of this file and of `src/lib/x402-pay.ts`.

| Fact | Source |
|---|---|
| `signX402ServerSide` returns null with no key, and returns null after a warning when a key is set | `src/lib/x402-pay.ts:5` to `:15` |
| The route serves the canon fallback when `BUCKET_WALLET_PRIVATE_KEY` or `BUCKET_GATEWAY_URL` is unset | `route.ts:9`, `:12`, `:423` |
| With both set, the route calls the upstream gateway with no `x-payment` header, and any non-200 answer falls back to canon | `route.ts:440` to `:464` |
| Every fallback receipt reads `status: "served_from_canon"`, `price_usd: 0` | `route.ts:246` to `:252`, `:297` to `:302`, `:336` to `:341` |
| The `cite` block is passive metadata: `reader_owes: 0`, a price and a payout wallet. No route collects it | `route.ts:67` to `:75` |
| The second client sends the header `x402 stub-signed` or `x402 unsigned` | `src/lib/feed402-client.ts:65` to `:68` |
| The manifest sets the settlement chain to `base-sepolia` and the settlement wallet to the zero address, with a note calling it a placeholder | `public/.well-known/feed402.json`, `downstream_settlement` block |
| `grants-gateway` defaults to `FEED402_VERIFY_MODE=stub`, chain `base-sepolia`, facilitator `https://facilitator.x402.rs`, and stub mode accepts any header | `grants-gateway/src/x402.ts:23` to `:28`, `:41` to `:43` |
| No fee, split or royalty code exists in `src/lib`, `src/app/api` or `supabase/migrations` | `git grep` over those paths |
| No splitter contract exists | `docs/ARCHITECTURE-TARGET.md:565` |

Documents that say it is live: `docs/foundation/MANIFESTO.md:41`, `docs/ROADMAP.md:35`, `CLAUDE.md:5`, `README.md:5`, `CHANGELOG.md:8`, `docs/foundation/HISTORY.md:24` and `:72`, `src/app/about/page.tsx:61`, `public/llms.txt:42` with a `settled` status the code never emits.

Documents that say it does not settle: `docs/ARCHITECTURE.md:73`, `docs/ARCHITECTURE-TARGET.md:538` to `:556`, `docs/growth/LAUNCH.md:58`. `docs/ROADMAP.md:16` gives the reader price as zero, seventeen lines above the "live" claim.

The live `https://bucket.foundation/llms.txt` returned 200 and is byte-identical to `public/llms.txt` on `dev` and `main`.

### Ruling

Nothing settles. On a citation the deployed site returns a feed402 envelope from the local canon index with a zero price, a `served_from_canon` receipt and a `cite` block that states what a paid republisher would owe. No wallet signs, no USDC moves on Base or Base Sepolia, and no author is paid. The x402 rail is specified and stubbed.

One hazard: if the wallet key and gateway URL are both set in production and the upstream answers 200 without payment, the response is labelled `x-bucket-source: gateway` and the in-memory spend counter rises with no payment made. The production env values were not inspected.

Standard wording: "The citation fee rail over x402 on Base is specified and does not settle yet."

### Confidence

High. The claim rests on the code path, and bead `bkt-r3rg` already tracks the mismatch.

### Files to correct

- `docs/foundation/MANIFESTO.md:41`
- `docs/ROADMAP.md:35`
- `CLAUDE.md:5` and the AGFarms `CLAUDE.md` Bucket row and Strategic Priority 7
- `README.md:5`
- `CHANGELOG.md:8`, `docs/foundation/HISTORY.md:24` and `:72`, `src/app/about/page.tsx:61`: "citations settle over x402 on Base"
- `public/llms.txt:42` and `public/llms-full.txt:14`
- `grants-targets/drafts/ef-esp-application.md`, `gitcoin-gg-round.md`, `sloan-exploratory-loi.md`: any sentence that presents a working payment rail
- `nonprofit-application/03-BUDGET.md:15` and `:43`: mark citation income and author payouts as dependent on an unbuilt rail

## 3. Test Prep Market Size

### Evidence

Both files cite `https://www.thebusinessresearchcompany.com/report/exam-preparation-and-tutoring-global-market-report`.

| Value | Where | Dated |
|---|---|---|
| $47B, "Digital exam-prep + tutoring" | `learning/research/revenue/MONETIZATION-GTM.md:364` | 2026-06-12 |
| $70.7-79.0B for 2025, 5-8% CAGR | `learning/research/landscape/MARKET-MONETIZATION.md:260` | 2026-06-15 |

The source page, fetched 2026-10-11:

| Field | Value |
|---|---|
| Report | Exam Preparation And Tutoring Market Report 2026, The Business Research Company, published September 2026 |
| Figure | $70.71 billion in 2025 |
| Forecast | $74.2 billion in 2026 at 4.9% CAGR; $91.26 billion in 2030 at 5.3% CAGR |
| Geography | Global. North America largest in 2025, Asia-Pacific fastest growing, no regional dollar values |
| Definition | Revenue from test preparation and tutoring services, educational courses and educational material, sold between entities or to end consumers |
| Segments | Structured and on-demand tutoring; test preparation and subject tutoring; short and long courses; K-12 and higher education end users |

The page carries no $47B figure and no $79.0B figure. The page seen in June was an earlier edition, so the June reading cannot be re-checked.

### Ruling

The sourced figure is $70.71B for 2025, global, test preparation and tutoring across K-12 and higher education, growing about 5% a year. The $47B is a derived "digital" consumer slice that the source does not publish; it is an estimate and should be labelled `est.` with its derivation or removed. The $79.0B upper bound has no support on the current page. With $47B unsourced, the ~$80B TAM total at `MONETIZATION-GTM.md:370` is also an estimate.

### Confidence

High on the $70.71B figure and its definition. Medium on the origin of $47B and $79.0B.

### Files to correct

- `learning/research/revenue/MONETIZATION-GTM.md:364`: replace the source tag with `est.` or cite the full-market $70.71B; restate the TAM row at `:370`.
- `learning/research/landscape/MARKET-MONETIZATION.md:260`: write "$70.71B (2025), 4.9-5.3% CAGR".
- `~/agfarms/.learning-corpus/market/market-claims.jsonl`: mark the `MARKET-MONETIZATION.md` row sourced at $70.71B and the `MONETIZATION-GTM.md` row estimated.

## 4. Insight Tier Price

### Evidence

| Value | Where | What it prices |
|---|---|---|
| $0 | `route.ts:249`, `:300`, `:339`; `public/llms.txt:42`; `public/.well-known/feed402.json` `reader_price_usd`; `docs/ROADMAP.md:16` | What the caller of `/api/research` pays |
| $0.002 | `route.ts:17`; `feed402.json:120`; `public/llms-full.txt:41`, `:122`, `:129`; `mcp-server/bucket-mcp.py:240`; `grants-gateway/src/server.ts:30`; `src/app/research/agent/page.tsx:104`; `docs/FEED402_PATENTS.md:23`; `docs/PILOT_TEMPLATE.md:23` | The republisher rate printed in the `cite` block, and the grants gateway insight tier |
| $0.005 | `docs/internal/archive/LAUNCH_POSTS.md:19`, `:39`, `:55`, `:120`, `:139`, `:169`; `docs/internal/archive/PRODUCTION_LOG.md:317`; `docs/internal/archive/OUTREACH_QUEUE.md:165` to `:186`; `gtm/video-v5/VOICEOVER.md`; AGFarms `CLAUDE.md` vendor table | The insight route of the separate `x402-research-gateway` service |

`$0.005` is also the query tier in the grants gateway (`grants-gateway/src/server.ts:29`) and the per-search cost constant in `src/lib/feed402-client.ts:89` to `:99`, which explains the crossover.

A second mismatch sits beside this one. The site prices raw and query at $0.05 and $0.01 (`route.ts:15` to `:16`, `feed402.json:118` to `:119`), while the grants gateway, the MCP tool description and `docs/PILOT_TEMPLATE.md:23` give $0.010 and $0.005.

### Ruling

The code charges the reader nothing at every tier. The insight tier's republisher rate is $0.002, and it is metadata: no code collects it (item 2). $0.005 is the price of a different merchant's insight endpoint and of Bucket's query tier in one service; every live Bucket surface that names an insight price says $0.002.

Use this sentence: "Reading and citing cost the caller nothing. The insight tier lists a republisher rate of $0.002 a call, which nothing collects yet."

### Confidence

High.

### Files to correct

- `gtm/video-v5/VOICEOVER.md`: "five-tenths of a cent per citation".
- `docs/internal/archive/LAUNCH_POSTS.md` and `OUTREACH_QUEUE.md`: archived; add a header stating the $0.005 price is superseded, or leave frozen.
- AGFarms `CLAUDE.md` vendor table: label "$0.005" as the `x402-research-gateway` price.
- `mcp-server/bucket-mcp.py:240`, `docs/PILOT_TEMPLATE.md:23`, `docs/FEED402_PATENTS.md:23`, `docs/PATENT_LICENSING.md:11`: align raw and query with `route.ts`, or change `route.ts`. One table for all three tiers.
- `docs/foundation/PROTOCOL.md:112` and `:197`: label the $0.05 example as the raw tier.

## 5. Protocol Fee

### Evidence

| Value | Where | Dated | Base |
|---|---|---|---|
| At most 20% to operations, at least 80% to authors, "default intent" | `docs/foundation/GOVERNANCE.md:64`; `nonprofit-application/01-APPLICATION.md:55`; `nonprofit-application/00-BASE-INFO-MEMO.md:58`; `nonprofit-application/03-BUDGET.md:43`; `grants-targets/prep/hcb-application-packet.md:41`; `docs/foundation/MANIFESTO.md:41`; `docs/ROADMAP.md:35` | 2026-04-14 onward | Net citation receipts |
| 0% | `src/app/cite-forever/v0.1/page.tsx:118` to `:121`: all cite fees route to the author's wallet and Bucket takes none | Page last changed 2026-09-30 | Cite fees |
| 2% after a pilot at 0% | `docs/internal/archive/PARTNERSHIP_PITCHES.md:30` | 2026-04-23, archived 2026-09-30 | Citation revenue on partner IP-NFTs |
| About 2% cost recovery, with 0% on citation royalties | `learning/research/_synthesis/DECISIONS.md:73`; `learning/research/revenue/MONETIZATION-GTM.md:27`; `learning/EPIC.md:103` | 2026-06-11 to 2026-06-14 | Deck sales on a creator marketplace |

`docs/foundation/PROTOCOL.md` states no percentage. It sends the fee to `cite.payout_wallet` (`:136`) and says the author receives it directly (`:15`). The code holds no fee, split or basis-point constant. `GOVERNANCE.md:64` says the exact split will be published once operating costs exist. `docs/ARCHITECTURE-TARGET.md:573` to `:575` records that "net" is undefined and that node pay would come out of the 20%.

### Ruling

20% is the cap on what the foundation may retain from net citation receipts. No working rate has been set, and the code charges nothing. The 2% figures price two other things: an archived partner pitch, and a marketplace fee on deck sales that was never built.

The live licence page promises 0% and says operating costs come from proxy margin and donations. That promise conflicts with a governance document that permits up to 20%.

Recommended ruling for the founder: the cap stays at 20% of net citation receipts in `GOVERNANCE.md`; the working rate is 0% while cite-forever v0.1 is in force; a later licence version sets any higher rate with notice. Retire the 2% protocol fee wording. Define "net" before any rate above zero.

### Confidence

High on the cap and on the code. The working rate is the founder's choice.

### Files to correct

- `docs/foundation/GOVERNANCE.md:64`: name 20% as the cap and state the working rate.
- `src/app/cite-forever/v0.1/page.tsx:118` to `:121`: keep if the working rate is 0%; otherwise issue v0.2.
- `docs/internal/archive/PARTNERSHIP_PITCHES.md:30`: archived; add a superseded note.
- `learning/research/_synthesis/DECISIONS.md:73`, `learning/research/revenue/MONETIZATION-GTM.md:27`, `learning/EPIC.md:103`: label the 2% as a marketplace fee on deck sales, separate from the citation rail.
- `nonprofit-application/01-APPLICATION.md:55`: define "net".

## 6. Year-One Spend

### Evidence

| | Volunteer budget | HCB use of funds | Ethereum Foundation ask |
|---|---|---|---|
| File | `nonprofit-application/03-BUDGET.md` | `grants-targets/prep/hcb-application-packet.md:50` to `:59` | `grants-targets/drafts/ef-esp-application.md:70` to `:77` |
| Written | 2026-04-14 | 2026-05-04 | 2026-05-04 |
| Total | $1,695 expected; $200 low; $21,930 high | $14,000 | $200,000 target; $30,000 to $300,000 range; $50,000 floor |
| Period | 12 months, 2026-05-01 to 2027-04-30 | 12 months | 9 months |
| What it is | Cash the foundation spends with no grant and no paid labour | Spending plan if a sponsor is in place and one small grant closes | A project grant request |
| Funded by | Founder gap funding of $1,200 and small donations | $6,200 conservative income | The grant |
| Infrastructure | $900, lines E-1 to E-5 | $1,800 | $25,000 |
| Paid labour | $0, stated at `:57` | $3,000 curation contractor | $90,000 maintainer and $30,000 editorial |
| Author payouts | $200 | $4,000 seed | $20,000 mirror subsidies; no payout line |
| Legal and accounting | $300 legal, $195 sponsor fee at 10% | $2,500 legal, $500 accounting | $15,000 audit |
| Story Protocol | $0; Walrus named in E-3 | $1,200 minting | Mint path named in milestone M2 at `:58` |
| Other | $100 | $1,000 reserve | $10,000 documentation, $10,000 contingency |

### Ruling

These are three scopes and the totals do not contradict each other: a floor with no outside money, a plan for the first small grant, and a nine-month funded project. The documents fail to say so, and four shared lines disagree between the first two:

- Infrastructure for the same 12 months at the same scale: $900 against $1,800.
- Paid labour: zero compensation in year one against a $3,000 contractor.
- Legal: $300 against $2,500.
- Sponsor fee: 10% assumed in the budget, 0% in the packet, 7% published by HCB (item 7).

Two further lines are stale in all three: Story Protocol minting (item 8) and citation income or payouts from a rail that does not settle (item 2).

Recommended ruling: `03-BUDGET.md` is the baseline and each grant document opens with one sentence naming its scope and its delta from that baseline. Rebuild the HCB figure without the $1,200 Story line, giving $12,800, and reconcile infrastructure to one number from current invoices.

### Confidence

High that the scopes differ. Medium on the corrected figures: no invoice or bank record was read, and both budgets predate the local-first decision of 2026-09-18 and the desktop release.

### Files to correct

- `nonprofit-application/03-BUDGET.md`: reporting period, line E-3, line E-6 sponsor fee, lines I-1 and P-1.
- `grants-targets/prep/hcb-application-packet.md:50` to `:73`: scope sentence, Story line, infrastructure, fee.
- `grants-targets/drafts/ef-esp-application.md:31`, `:58`, `:70` to `:77`: one ask figure, remove the Story mint path, scope sentence.
- `nonprofit-application/01-APPLICATION.md`: grant income and the statement that nobody is paid, against the HCB contractor line.

## 7. HCB Fee

### Evidence

| Value | Where | Dated |
|---|---|---|
| 0% on the standard tier | `nonprofit-application/00-BASE-INFO-MEMO.md:106`; `grants-targets/prep/hcb-application-packet.md:8` and `:110` | 2026-05-03 and 2026-05-04 |
| 7% donation fee | `grants-targets/bucket.md:52` | 2026-05-04 |
| 7% of revenue, no other fees | `_intake/ideas/FUNDING-PATH.md:25` | 2026-09-28 |
| 10% assumed sponsor fee | `nonprofit-application/03-BUDGET.md:32` | 2026-04-14 |

`https://hackclub.com/fiscal-sponsorship/`, fetched 2026-10-11, states one fee: 7% of revenue. It lists no legal, startup, transaction, card issuing, subscription, check deposit or card processing fees.

The same documents disagree on eligibility. `learning/research-os/funding/FISCAL-SPONSOR-DECISION.md:9` (2026-09-10) quotes HCB's help centre requiring a project led by teenagers aged 13 to 18 and recommends Players Philanthropy Fund at 6%. `_intake/ideas/FUNDING-PATH.md:25` (2026-09-28) says HCB is no longer teen-only. The fiscal sponsorship page fetched today states no age rule, and the help-centre article tried returned 404, so eligibility is unverified.

### Ruling

The HCB fee is 7% of revenue. The 0% figure is wrong, and the packet's argument that HCB saves the whole fee against rivals at 6% to 10% falls with it: Players Philanthropy Fund at 6% is cheaper. No document records an application; `grants-targets/storage-credits-2026-09-30.md:7` says HCB has not been contacted, while the grant drafts say HCB is "in process".

Eligibility for an adult-led project is an open fact. One email or one application to HCB settles it.

### Confidence

High on the fee. Low on eligibility.

### Files to correct

- `nonprofit-application/00-BASE-INFO-MEMO.md:106`, `:115`, `:124`: fee and ranking.
- `grants-targets/prep/hcb-application-packet.md:8`, `:110`: fee and the savings claim.
- `grants-targets/bucket.md:52`: "7% of revenue".
- `nonprofit-application/03-BUDGET.md:32`: 7% for HCB or 6% for PPF in place of 10%.
- `grants-targets/drafts/ef-esp-application.md:87`, `gitcoin-gg-round.md:79`: "Hack Club Bank in process" where no application exists.
- `learning/research-os/funding/FISCAL-SPONSOR-DECISION.md` and `_intake/ideas/FUNDING-PATH.md:25`: reconcile eligibility once HCB answers.

## 8. Story Protocol Royalties

### Evidence

The newest dated decision: `learning/EPIC.md:93` to `:96`, "Decision (2026-06-14): no Story Protocol." Credentials use Open Badges 3.0, the creator rail carries no on-chain mint and no token royalties, and every Story reference in the research documents is superseded. `CHANGELOG.md:8`, `docs/foundation/HISTORY.md:24` and `src/app/about/page.tsx:61` repeat the removal.

What the code does:

- `package.json` has no Story dependency. `scripts/test-research-os-no-story-surface.ts` fails the build if any file under `src` imports Story, Walrus, Dynamic or wagmi, or if `package.json` regains them.
- `src/lib/academy/credential/issuer.ts:14` states no Story Protocol and no blockchain.
- PR #485 (2026-09-30) removed Story and Walrus from rendered pages; PR #490 archived the Story-era pitches.
- One rendered leftover: `src/app/canon/[slug]/BranchEntriesTable.tsx:96` carries the tooltip "Story Protocol IP NFT minting, coming soon".

Documents that still keep Story or on-chain royalties:

| File | Lines | Dated |
|---|---|---|
| `learning/research/revenue/MONETIZATION-GTM.md` | `:9`, `:14`, `:15`, `:25`, `:118`, `:162`, `:237`, `:428`, `:432`, `:461` | 2026-06-12 |
| `learning/research/landscape/MARKET-MONETIZATION.md` | `:53`, `:180` | 2026-06-15 |
| `learning/PRODUCT.md` | `:49`, `:122`, `:153` | 2026-06-11 |
| `learning/research/_synthesis/DECISIONS.md` | `:52`, `:89` | 2026-06-11 |
| `grants-targets/drafts/ef-esp-application.md` | `:58` | 2026-05-04 |
| `grants-targets/drafts/gitcoin-gg-round.md` | `:54`, "now being revived" | 2026-05-04 |
| `grants-targets/prep/hcb-application-packet.md` | `:55`, $1,200 minting line | 2026-05-04 |
| `grants-targets/bucket.md` | `:3`, `:58` | 2026-05-04 |
| `nonprofit-application/00-BASE-INFO-MEMO.md` | `:60` | 2026-05-03 |
| AGFarms `CLAUDE.md` | Bucket row: "`publish` survived as the terminal action, now = Story Protocol IP NFT mint" and the canon table's "Story Protocol minting" source | undated |

One of these, `MARKET-MONETIZATION.md`, was written a day after the decision.

### Ruling

Story Protocol royalties are withdrawn. The decision of 2026-06-14 is the newest, the code matches it, and a test holds the line. Every remaining mention predates the decision or missed it, and none reflects a later reversal. Author payment now rests on the x402 citation rail alone, which does not settle yet (item 2), so no royalty mechanism of any kind is running.

### Confidence

High.

### Files to correct

- `src/app/canon/[slug]/BranchEntriesTable.tsx:96`: remove the tooltip.
- `learning/research/revenue/MONETIZATION-GTM.md`, `learning/research/landscape/MARKET-MONETIZATION.md`, `learning/PRODUCT.md`, `learning/research/_synthesis/DECISIONS.md`: add the superseded header from `EPIC.md:93`, or rewrite the Scholar tier without minting.
- `grants-targets/drafts/ef-esp-application.md:58`, `gitcoin-gg-round.md:54`, `grants-targets/prep/hcb-application-packet.md:55`, `grants-targets/bucket.md:3` and `:58`, `nonprofit-application/00-BASE-INFO-MEMO.md:60`.
- AGFarms `CLAUDE.md`: the Bucket Foundation row and the Canon Research Indexes source column.
