# Bucket Market Analysis on Record

Dated 2026-10-11. Read from `bucket-foundation` at `origin/dev` e61d717, its untracked `_intake/ideas/`, and the AGFarms workspace. 134 analyses sit in `market-analyses.jsonl` and 842 claims in `market-claims.jsonl`: 440 sourced, 138 asserted, 119 contradicted, 88 estimated, 57 stale. Every figure here is quoted from a document.

## Who Bucket Serves

Ordered by strength of evidence.

1. **Researchers and PhD students.** The one segment sized from Bucket's own data: 1.17M profiled researchers (`research-atlas/docs/USERS_NEEDS.md`) and 3,870 ranked biophysics advisors (`docs/research-tools/01-needs-analysis.md`). The file states that no researcher was surveyed. `learning/research-os/ROADMAP.md` (2026-09-21) sets the MVP user as one researcher on one machine.
2. **Self-directed adult learners.** `learning/research/revenue/MONETIZATION-GTM.md` and `learning/EPIC.md` (June) name the serious STEM autodidact and USMLE, MCAT and GRE takers. Their sizes come from vendor reports plus a funnel model.
3. **K-12 students and teachers.** `learning/research-os/PLAN-REVISION-1` to `4` (September) plan a grades 3-5 classroom pilot. Revision 2 records no partner school, no IRB approval and no fiscal sponsor.
4. **Funders.** They appear as grant sources and as the subject of four metascience papers. No document treats a funder as a paying customer.
5. **AI agents.** `docs/foundation/PROTOCOL.md` and `public/llms.txt` set the agent's price at zero. The payer is a downstream publisher, and `docs/ARCHITECTURE-TARGET.md` says nothing identifies one or makes one pay.
6. **Working professionals.** Corporate training appears once as context. The sibling inventories record nothing on workplace learning.

## Market Size Figures

- Consumer self-directed learning TAM about $80B and 250M+ learners; SAM about 15M learners at $90 a year, about $1.5B; three-year SOM 30-60K payers, $4-8M ARR (`MONETIZATION-GTM.md`, vendor reports plus own model, estimated).
- Global EdTech $187B in 2025 (Grand View Research) and corporate training $412.5B (`learning/research/landscape/MARKET-MONETIZATION.md`, sourced).
- Biophysics research funding $3.29B, about $1.57B software-addressable; research-tools TAM 30-50K labs, $50-120M a year; SAM about $15M; year-one SOM $50-250K (`docs/research-tools/03-monetization.md`, internal report plus an estimate the file calls rough).
- Research funding in the atlas: $1.04T across 1,670,434 grants and 75 funders (`research-atlas/docs/LANDSCAPE.md`, measured).
- Total x402 volume about $28,000 a day in March 2026 (`_intake/ideas/PRIOR-ART-music-and-data-markets.md`, citing CoinDesk).
- About 0.136% of humanity works at the research frontier (education-atlas, UNESCO data).

## Pricing and Revenue Thinking

- Free to read, paid to cite, at least 80% to authors, protocol licence at $0 (`docs/foundation/GOVERNANCE.md`). The exact split waits on real costs.
- Per-call tiers of $0.010, $0.005 and $0.002 (`grants-gateway/README.md`). The PROTOCOL example shows a $0.05 cite price.
- June consumer tiers: Free, Pro at $12 a month, Scholar at $24, a 2% creator fee, credentials paid by verifiers (`learning/research/_synthesis/DECISIONS.md`, decision 13, accepted 2026-06-11).
- Research tools: metered credits and a $500 a year lab tier.
- `nonprofit-application/03-BUDGET.md` expects $250 of citation fees in year one.

## Funding and Grants

`grants-targets/bucket.md` (May) lists Sloan, Templeton, Mellon, Knight, NSF POSE, Ethereum Foundation and Gitcoin with award ranges from funder sites. Drafts exist for the last two and for Sloan. `_intake/ideas/FUNDING-PATH.md` (2026-09-28) records no EIN, no incorporation and no sponsor agreement, and rules that no draft be written before a sponsor exists. The four funding papers measure concentration (Gini 0.929 across institutions) and find the 2.11x funded-career gap falls to 1.23x after matching.

## Competitors Named

- Learning: Duolingo, Anki, Quizlet, Brilliant, Khan Academy, Math Academy, Coursera.
- Research tools: Elicit, SciSpace, Scite, Benchling, CryoSPARC, FutureHouse.
- Data and science markets: Molecule, VitaDAO, ResearchHub, Story Protocol, Ocean, Vana, Bittensor.
- Publishers: Elsevier and RELX, as the incumbent gate.

## Contradictions

- **Customer.** The manifesto serves a small number of people doing genius work with AI. `llms.txt` and the September revisions serve K-12. The September roadmap serves one researcher.
- **Settlement.** `docs/ROADMAP.md` and the manifesto call x402 settlement live. `docs/ARCHITECTURE.md` and `docs/growth/LAUNCH.md` say no fee settles.
- **Market size.** Test prep is $47B in one June file and $70.7-79.0B in another, citing one source.
- **Prices.** The insight tier is $0.005, $0.002 or zero depending on the file. The protocol fee is 2% in the partnership pitches and up to 20% in governance.
- **Budget.** Year-one spend is $1,695 in the budget and $14,000 in the HCB packet, and the Ethereum Foundation draft asks $200,000. The HCB fee is 0% in one memo and 7% in two others.
- **Story Protocol** royalties stay in the June revenue files and are withdrawn in `EPIC.md`.

## Stale Since the Desktop Turn

39 analyses assume the website is the product. The main ones: the June Pro and Scholar tiers and their funnel model, the web research-tools platform, the K-12 classroom plans, the agent-distribution playbook in `gtm/`, the grant drafts that cite a live web rail, and the Kruse pitch. `docs/growth/LAUNCH.md` and `docs/ROADMAP.md` match today's product. The site funnel proposal in PR #604 places the download at step 4, against two clicks in `LAUNCH.md`.

## Questions No Document Answers

- Who pays. The citation payer is a publisher nobody has identified, and payment is voluntary.
- Measured demand. No traffic, download, signup or retention figure exists. `IMPACT-ESTIMATE-bucket-academy.md` counts one learner, the founder, and zero conversions.
- User interviews or surveys. None are on record.
- What a citation is worth to a buyer, and whether any author has been paid.
- Which segment comes first for the desktop app. Bead bkt-1l5z, the education market study, is unbuilt.
- Whether Pro at $12 survives the nonprofit, desktop model.
- The 73 open overnight-proposal PRs hold engineering task rankings and no market content.
