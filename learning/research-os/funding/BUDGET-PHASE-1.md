# Research OS for K-12: Phase 1 Budget

Bead `ros-09`. Twelve-month budget for Phase 1 as scoped in `_intake/research-os-k12/RESEARCH-OS-K12-SYSTEM-REVIEW.md` section 8 ("Phase 1, pilot school"): three to five subjects across grades K-8, one to two willing schools, roughly 500 learners. Every figure below is the section 6 cost model's own monthly range for this phase, annualized across the three sub-periods section 8 already names (build, then a pilot semester, then evaluation); nothing here is a new estimate. Where this document adds a period-level assumption not stated verbatim in section 6 or 8, that assumption is called out explicitly as this document's own addition, separate from the system review's figures.

**Reporting period:** twelve months from Phase 1 kickoff, date to be set once the five blocking decisions in `learning/research-os/PLAN-REVISION-1.md` section 3 resolve (decision 1, the grade-band and corpus choice, most directly shapes this budget's compliance line, since section 3 item 8 ties COPPA-versus-teen-consent scope directly to that decision).
**Currency:** USD.
**Reporting basis:** cash, consistent with `nonprofit-application/03-BUDGET.md`'s own reporting basis.
**Scope:** one to two schools, 500 learners, per system review section 8's Phase 1 scope statement. Nothing below assumes a school has been recruited, a pilot has started, or any learner is enrolled; this is a pre-pilot budget for funder review.

## 1. Three sub-periods

System review section 8 states Phase 1's duration as "two to four months to build, then a school semester to run the pilot." A school semester runs roughly four to five months. This document allocates the twelve-month year as: **build, months 1 to 3**; **pilot semester, months 4 to 8** (five months); **evaluation and Phase 2 preparation, months 9 to 12** (four months). The three-to-four-month build estimate and the semester-length pilot are section 8's own language; the exact month boundaries chosen to fill a twelve-month year are this document's assumption, stated here rather than left implicit.

During the build period, no learner is enrolled: infrastructure stands up ahead of traffic, AI inference and data-query cost are zero because no learner is generating either, and compliance work is the Common Sense self-assessment and the SDPC NDPA signature, prep and paperwork rather than the certification spend that lands once a district signature is imminent. During the pilot semester, all five categories run at system review section 6's own Phase 1 monthly rate. During the evaluation period, the pilot has ended: AI inference and data-query cost return to zero on the same logic as the build period (no live learner traffic), while infrastructure keeps running and compliance and people costs continue at a reduced rate to cover the pilot's own write-up.

## 2. Cost by category, annualized

Each cell shows the month count multiplied by section 6's own Phase 1 monthly range, so the arithmetic is checkable against the source figure directly. Cells marked "this document's assumption" state a rate section 6 does not itself give, always at or below section 6's own Phase 1 ceiling for that category.

| Category | Build, 3 mo | Pilot semester, 5 mo | Evaluation, 4 mo | 12-mo total, low | 12-mo total, expected | 12-mo total, high |
|---|---|---|---|---:|---:|---:|
| Infra | 3 x $25-80/mo = $75-240 | 5 x $25-80/mo = $125-400 | 4 x $25-80/mo = $100-320 | $300 | $600 | $960 |
| AI inference | no live learners, $0 | 5 x $125-500/mo = $625-2,500 | pilot ended, $0 | $625 | $1,500 | $2,500 |
| Data | no live learners, $0 | 5 x $0-50/mo = $0-250 | pilot ended, $0 | $0 | $125 | $250 |
| Compliance | 3 x $0-300/mo (self-assessment and NDPA prep only, this document's assumption) = $0-900 | 5 x $500-2,000/mo = $2,500-10,000 | 4 x $250-1,000/mo (wind-down review, this document's assumption) = $1,000-4,000 | $3,500 | $5,400 | $14,900 |
| People | founder only, $0 | 5 x $0-10,000/mo = $0-50,000 | 4 x $0-3,750/mo (evaluation write-up support, this document's assumption) = $0-15,000 | $0 | $11,500 | $65,000 |
| **12-month total** | | | | **$4,425** | **$19,125** | **$83,610** |

Basis for every per-month figure in the table above except where marked "this document's assumption": `_intake/research-os-k12/RESEARCH-OS-K12-SYSTEM-REVIEW.md` section 6, "Phase 1, pilot, 500 learners, one to two schools" table.

## 3. Reading the range

The low-to-high spread in section 2 is not noise; it is the same spread section 6 states outright: "wide range driven entirely by the people line; a founder-only Phase 1 lands near $650-2,600/mo" for the pilot-semester months, the same $0-10,000-per-month people range this budget annualizes in the People row. The **low** column ($4,425) is a founder-only Phase 1 with no hire at all, pilot proceeds on existing AGFarms-shared infrastructure, and no certification spend. The **expected** column ($19,125) assumes a founder-only team through the build period, one part-time hire (teacher-success or engineering) starting partway through the pilot semester at roughly $1,500 a month averaged across the semester and continuing at a lighter rate through evaluation, and a compliance spend that stays inside the non-certification part of section 6's range throughout. The **high** column ($83,610) is one part-time hire in place from the start of the pilot semester at the top of section 6's people range, plus the iKeepSafe FERPA certification pursued mid-pilot rather than deferred to Phase 2.

The compliance row's high end includes room for the iKeepSafe FERPA certification's amortized cost. Section 6 states this certification at "$6,400 one-time, amortized over 12 months at about $533/mo" as part of its Phase 1 compliance range; system review section 8 places the iKeepSafe certification at Phase 2, "ahead of any formal RFP," a Phase 2 requirement rather than a Phase 1 one. This budget's high column includes it as an option worth showing a funder is available, without committing it as a Phase 1 spend; the **expected** column's compliance figure ($5,400) stays under section 6's stated $500-2,000 monthly ceiling throughout the pilot semester and excludes the certification, consistent with section 8's own sequencing.

## 4. What this budget does not include

Consistent with `nonprofit-application/03-BUDGET.md`'s own convention of stating what a budget deliberately omits:

- **No payout or citation-fee revenue line.** System review section 8 places payout accrual and the custodial ledger at Phase 2; Phase 1 ships peer-review-only productions with no payout.
- **No revenue assumption of any kind.** Research OS for K-12 is free to the learner and the school at every phase per `MANIFESTO.md`'s own commitment; this is a cost budget alone, with no break-even projection attached.
- **No district or grant revenue already secured.** Every dollar in section 2 is a projected cost against funding this packet is actively seeking (`FAST-FORWARD-2026.md`, `WAVE-1-TARGETS.md`); none of it is backed by a signed grant or contract as of this draft.
- **No compensation for the founder.** Consistent with `nonprofit-application/03-BUDGET.md` section 2c's "compensation is zero in year one" rule; the People line in section 2 above covers a possible contractor or part-time hire, separate from founder pay.

## 5. Assumptions a funder form asks to see stated separately

- **Blended AI cost per learner.** $0.25 to $1.00 per learner per month, system review section 6's own figure, at 500 learners giving the $125 to $500 monthly pilot-period range used above.
- **Infrastructure baseline.** The same stack as Phase 0 (Vercel Pro, Supabase, Cloudflare free tier, Sentry OSS) plus Supabase Pro once real student data exists, per section 6's Phase 1 infra assumption.
- **Compliance floor.** The Common Sense Privacy self-assessment and a signed SDPC NDPA are the two required pre-pilot deliverables per `_intake/research-os-k12/04-compliance-distribution.md` section 8's own sequencing recommendation; both are free to run or sign, with legal-review time as the real cost, which this budget folds into the compliance line's lower end.
- **Compute runs on shared infrastructure.** Per `CLAUDE.md`'s tenancy model, Research OS for K-12 runs on the shared AGFarms pool infrastructure unless and until it earns a dedicated instance; no dedicated-hosting line item is budgeted here.
