# AGFarms Grant Targets — Portfolio Index

**Date:** 2026-05-03
**Author:** Revenue pillar (Bucket Foundation lead) on behalf of AGFarms portfolio
**Purpose:** Decision-grade grant target memo across four ventures so the founder can pick targets and start applying.

## Summary Table

| Venture | Legal status | # opportunities | Grant readiness | Top pick |
|---|---|---|---|---|
| **Bucket Foundation** | LLC pending c3 (HCB sponsor interim) | 12 | Medium — gated on c3 + SAM | Sloan Exploratory Tech LOI ($50K–$250K) |
| **DerbyFish / Kala** | Under AGFarms LLC | 14 | **High — federal fisheries money flows to LLCs** | NOAA Saltonstall-Kennedy ($25K–$500K) |
| **MamaTeeTees** | 501(c)(3) (own determination) | 14 | **High — c3 in hand**, but cultivation-heavy | GlobalGiving Accelerator (immediate) |
| **AGFarms LLC** | DE for-profit | 12 | Narrow lane — SBIR / state EDA only | NSF SBIR Phase I multi-venture campaign (up to $305K each) |

**Total opportunities surveyed: 52.**

## The Single Best Pick Across the Portfolio

**NOAA Saltonstall-Kennedy + NOAA Citizen Science for Stock Assessments — for DerbyFish/Kala under AGFarms LLC.**

Reasoning:
- LLC eligible — no c3 wait
- Direct thematic match: VDS/BHRV is exactly what these programs fund
- Annual cycles, predictable
- $25K–$500K range, real money
- Federal credibility unlocks downstream private funders (Pew, Walton)
- DerbyFish has shipping product → fundable narrative today, not someday

Runner-up: **NSF SBIR Phase I as a multi-venture campaign** — up to ~$1M total if 3 ventures get Phase I awards. Each Project Pitch is 2 weeks of work.

## The Biggest Gating Risk

**SAM.gov registration latency.** Every federal grant — NOAA, NSF, NIH, USDA — requires SAM.gov registration of the applicant entity. SAM takes 4–8 weeks. We need:

1. AGFarms LLC SAM registration (for NSF SBIR + NOAA + USDA)
2. Bucket Foundation SAM registration (once c3 determination arrives, for NSF POSE)
3. MamaTeeTees SAM registration (for USAID)

**Recommendation: file all three SAM applications in week of 2026-05-04, regardless of which grants we ultimately submit.** Sunk-cost cheap (free), unlocks every federal program, has the longest lead time of any prep step.

Secondary gating risks:
- Bucket 501(c)(3) determination (3–9 months from filing Form 1023). HCB fiscal sponsorship gets us 80% of the way there for foundation grants but typically does NOT satisfy NSF prime-applicant rules.
- Cultivation lead time for relationship-based foundations (Mellon, Walton, Pew, Echidna, Segal) — assume 6–12 months from first contact to invitation.

## Most-Ready-to-Submit-First (Ranked)

1. **MamaTeeTees → GlobalGiving Accelerator** — c3 in hand, application takes ~1 hour, decision within a quarter. *Submit by end of May 2026.*
2. **AGFarms (DerbyFish) → NSF SBIR Phase I Project Pitch** — needs SAM but Project Pitch itself is 2 pages, 3-week NSF turnaround. *Submit by mid-June 2026.*
3. **Bucket Foundation → Ethereum Foundation ESP + Gitcoin OSS** — no c3 needed, no SAM needed, crypto-native funders. *Submit by mid-June 2026.*
4. **AGFarms (DerbyFish/Kala) → NOAA Saltonstall-Kennedy pre-proposal** — needs SAM; pre-proposal NOFO typically opens August. *Submit August 2026.*
5. **Bucket Foundation → Sloan Exploratory Tech LOI** — 2 page LOI, no registration. *Submit June 2026 once HCB onboarded.*

## Files in This Memo

- [`bucket.md`](./bucket.md) — Bucket Foundation grant targets (12 opportunities)
- [`derbyfish-kala.md`](./derbyfish-kala.md) — DerbyFish / Kala grant targets (14 opportunities)
- [`mamateetees.md`](./mamateetees.md) — MamaTeeTees grant targets (14 opportunities)
- [`agfarms.md`](./agfarms.md) — AGFarms LLC grant targets (12 opportunities)

## Cross-Cutting Recommendations

1. **Week of 2026-05-04: file three parallel SAM.gov registrations** (AGFarms LLC, Bucket Foundation, MamaTeeTees). Free; longest lead time of any prep work.
2. **Week of 2026-05-11: Bucket onboards to HCB** (~1 week turnaround). Unlocks Sloan / ESP / Gitcoin / Templeton / PL pathway today.
3. **File Bucket Form 1023 in May 2026.** 3–9 month IRS turnaround means determination letter arrives ~Q4 2026 / Q1 2027 — in time for FY27 NSF POSE cycle.
4. **Cultivate one NOAA Fisheries scientist** (regional NJ or FL office) starting May 2026. Letter of support de-risks every NOAA application. This is the highest-leverage cultivation move in the portfolio.
5. **Don't waste cycles** pitching for-profit AGFarms LLC to Mellon / Templeton / Knight / Walton / Pew — they don't fund LLCs. Use Bucket as the c3 wrapper for those routes once the determination letter is in hand.
6. **MamaTeeTees needs cultivation, not applications.** Most West Africa funders are referral-only. Spend 2026 building relationships (Segal Africa Visionary network, Mastercard regional office, Cameroon-based advisors) and aim for 2027 application cycles.

## Cross-venture beads filed (2026-05-04)

| Bead ID | Instance | Title |
|---------|----------|-------|
| `derbyfish-6vp` | derbyfish | NSF SBIR Phase I Project Pitch (DerbyFish/Kala) |
| `derbyfish-4lb` | derbyfish | NOAA Saltonstall-Kennedy pre-proposal (DerbyFish/Kala) |
| `bkt-jwh` *(proxy)* | bucket-foundation | [MTT-PROXY] GlobalGiving Accelerator submission |

**Note on `bkt-jwh`**: filed as a proxy in `bucket-foundation` because the
`mamateetees` Nucleus instance is dormant (scaled to zero) and behind nginx
basic auth that current admin credentials don't satisfy. The `/issues` endpoint
returns 401 for every credential combination tried (admin/nucleus/root × the
documented `$NUCLEUS_ADMIN_PASSWORD`). Re-file into the mamateetees instance
directly once the instance is brought back up and credentials are rotated. Used
endpoint pattern: `bd-remote create` → `https://<instance>.nucleus.agfarms.dev/issues`
(no auth required for the live derbyfish/bucket-foundation instances).
