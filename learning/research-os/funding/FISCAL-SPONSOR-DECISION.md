# Fiscal sponsor decision

Bead `ros-09`. This decision gates `FAST-FORWARD-2026.md` section 2 and every "pending 501(c)(3) or fiscal sponsor" eligibility line in `WAVE-1-TARGETS.md`. Nothing has been filed and no sponsor has been contacted as of this draft (`nonprofit-application/00-BASE-INFO-MEMO.md`); this document recommends which sponsor to contact first and what to do this week.

## 1. The prior recommendation is out of date

`nonprofit-application/00-BASE-INFO-MEMO.md` section 3.2, drafted 2026-05-03, ranked Hack Club Bank (HCB) as the top pick, with a caveat flagged but not resolved: "Risk: skews young/teen-coded; verify they accept founder-led adult research projects (they do, many adult OSS projects are sponsored)." `_intake/research-os-k12/04-compliance-distribution.md` section 7, compiled as part of this same intake pass, already read the opposite and called it "confirmed from HCB's own eligibility page": HCB's sponsorship is "scoped to projects led and primarily run by teenagers aged 13-18," a poor fit for a founder-led adult project.

This pass re-verified directly against HCB's own help-center page and confirms the newer, more pessimistic read. Quoted verbatim: "HCB cannot provide accounts for individuals under 13, even with parental consent," the program targets "teenagers aged 13 to 18," an applicant must "be led and primarily run by teenagers (ages 13 to 18)," and, decisively, "Existing nonprofits or 501(c)(3) organizations" are named as ineligible because "fiscal sponsorship isn't the right tool" once an organization already has or is pursuing its own determination. **HCB is not a viable sponsor for Bucket Foundation. Remove it as the top pick in `nonprofit-application/00-BASE-INFO-MEMO.md` section 3.2**, the only file in the packet that names HCB; `00-COVER-LETTER.md`'s salutation does not name HCB, but it does still open with the now-dissolved Open Collective Foundation, a separate stale reference `00-BASE-INFO-MEMO.md` gap G-6 already flags for a fix before anything is sent.

Source: [help.hcb.hackclub.com, who can apply for fiscal sponsorship](https://help.hcb.hackclub.com/en/articles/15409923-who-can-apply-for-fiscal-sponsorship), fetched 2026-09-10.

## 2. Two options

`00-BASE-INFO-MEMO.md` section 3.2 ranked Players Philanthropy Fund (PPF) second and Social Good Fund third, both behind the now-disqualified HCB. With HCB out, these two are the live options; this pass re-verified both against their own current fee and process pages rather than carrying the 2026-05-03 numbers forward unchecked.

### Option A: Players Philanthropy Fund

**Fee.** 6% flat, confirmed on ppf.org: "PPF's standard management fee of 6% on deposits is one of the lowest in the fiscal sponsorship industry." No separate monthly admin charge found. This matches the `_intake/research-os-k12/04-compliance-distribution.md` section 7 table's "6% on aggregate monthly deposits, no fee on in-kind."

**Timeline.** PPF's own FAQ states initial review and contact within 3 to 5 business days of a submitted application. Full onboarding timeline to a signed, live sponsorship agreement was not stated on any page fetched; treat as **UNVERIFIED beyond the 3-to-5-day first response**, and confirm total time-to-live directly during that first contact.

**What it unlocks before the IRS letter arrives.** Tax-deductible donations under PPF's own determination letter immediately upon a signed agreement; grant eligibility for any funder in `WAVE-1-TARGETS.md` or `04-funding-and-people.md`'s broader list that requires current 501(c)(3) status as a threshold condition (per `04-compliance-distribution.md` section 7's general rule, most institutional funders require exactly this); and a concrete, non-hypothetical answer to Fast Forward's own eligibility question in `FAST-FORWARD-2026.md` section 2.

**Gaps confirmed unresolved on this pass.** PPF's fetched pages did not explicitly name research or education nonprofits, or crypto and x402 payment rails, as an accepted or excluded project type; the FAQ's own examples (individual hardship support, academic scholarships) sit closer to direct-service philanthropy than to open-protocol research infrastructure. This reads as an absence of confirmation rather than a stated rejection, and should be the first question asked in the initial 3-to-5-day contact window.

### Option B: Social Good Fund

**Fee.** Tiered by budget and model. Confirmed on socialgoodfund.org: Model A runs 8% for budgets under $500,000, dropping to 7% at $500,000 to $1,000,000 and 6% above $1,000,000; Model C runs 6.5% under $500,000, 5% at $500,000 to $1,000,000, and a separate 8% rate for international projects. A refundable $29 monthly admin fee applies to both models, refunded once the project has raised at least $5,000 in a year, and waived outright if the project already holds at least $10,000 in funding at intake.

**Timeline.** Not stated on the fetched fee page. `00-BASE-INFO-MEMO.md` section 3.2's prior, unverified-on-this-pass figure was "about 5 business days to first call," comparable to PPF's confirmed 3-to-5-day figure; treat the timeline as **UNVERIFIED**, a figure carried forward from the prior pass and left unconfirmed on this one.

**What it unlocks.** The same category of things PPF unlocks, tax-deductible donations, grant eligibility gated on current 501(c)(3) status, and a real answer to Fast Forward's eligibility question, under Social Good Fund's own determination letter instead of PPF's.

**Where it is weaker than PPF at Bucket's current budget size.** Bucket Foundation's own multi-year projection (`nonprofit-application/03-BUDGET.md` section 5) puts Year 1 cash income at an expected $1,950 and Year 3 at $50,000, both comfortably inside Social Good Fund's under-$500,000 Model A tier, the one carrying the 8% rate, two full points above PPF's flat 6% at every budget size Bucket is likely to reach in the near term.

## 3. Recommendation

**Contact Players Philanthropy Fund first.** The flat 6% fee beats Social Good Fund's 8% at every budget tier Bucket's own three-year projection reaches, the confirmed 3-to-5-business-day first response is fast enough to matter against Fast Forward's eight-day window, and nothing found on this pass disqualifies a research-infrastructure nonprofit the way HCB's own page disqualifies Bucket outright. Run Social Good Fund as a parallel backup rather than a sequential fallback: `00-BASE-INFO-MEMO.md` section 3.4's own sequencing advice, apply to the top candidate first and only escalate to the next if declined or slow, was written when HCB was the top candidate and PPF was the fast-fallback; with HCB removed, that same logic now argues for PPF as primary and Social Good Fund as the live backup, contacted at the same time rather than held in reserve, since the fee gap is real but small enough that a lost week waiting for PPF's answer costs more than it saves.

## 4. Founder actions this week

1. Submit PPF's application (ppf.org/apply) and Social Good Fund's intake in the same window, this week, so the eight days remaining before Fast Forward's 2026-09-18 deadline are not spent waiting on one sponsor's response before starting the other.
2. In PPF's initial 3-to-5-day contact, ask directly whether a research/open-protocol nonprofit with planned x402 micropayment revenue is an accepted project type; this is the one material gap this pass could not close from public pages alone.
3. Fix `nonprofit-application/00-BASE-INFO-MEMO.md` section 3.2 (remove HCB as top pick, per the finding in section 1 above) and `nonprofit-application/00-COVER-LETTER.md`'s salutation (replace the dissolved Open Collective Foundation, per gap G-6, with Players Philanthropy Fund), before either file goes to a real sponsor.
4. Once a sponsor responds, update `_intake/research-os-k12/funding-log.md`'s "Fiscal sponsor" row from "open" to the real status, and restate `FAST-FORWARD-2026.md` section 2's nonprofit-status answer from "in progress, undecided" to whatever the sponsor's actual response makes it.
