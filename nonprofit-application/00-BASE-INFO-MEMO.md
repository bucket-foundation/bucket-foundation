# 00 — Base Info Memo (Pre-Filing)

> **Status:** 2026-05-03. Decision-oriented gap analysis assembled by Operations pillar (bead `bkt-ikk`) ahead of any filing or sponsor outreach. **Nothing has been filed. No sponsor has been contacted.** This memo only assembles the facts and recommendations that need founder sign-off before files 01–07 can be submitted.

---

## 1. Gap analysis — what's missing before files 01–07 are file-ready

Reading files `00-COVER-LETTER.md` through `07-FORM-1023-EZ-WORKSHEET.md` end-to-end, the packet is well-drafted but **not file-ready**. Concrete gaps:

| # | Gap | Where it bites | Severity |
|---|---|---|---|
| G-1 | **No EIN.** Form SS-4 not filed. Required before any bank account, sponsor agreement, or 1023-EZ. | All paths | Blocker for Path B; non-blocker for sponsor model-A intake (sponsor's EIN is used) |
| G-2 | **No board members named.** `04-BOARD-AND-GOVERNANCE.md` lists role profiles only. `06-ARTICLES` Article VI has 2 of 3 directors as `[TBD]`. IRS will not approve a 1023/1023-EZ with only one director, and majority must be unrelated. | Path B | Hard blocker |
| G-3 | **No bylaws.** `06-ARTICLES` Filing checklist references "Adopt Bylaws at organizational meeting" but no bylaws draft exists in the packet. | Path B | Hard blocker (1023-EZ technically does not attach bylaws but state law and banks require them) |
| G-4 | **State of incorporation undecided.** Packet defaults to Delaware but founder resides in NY/NJ. See §4 below — recommendation is to **pick founder's home state, not Delaware.** | Path B | Decision blocker |
| G-5 | **Registered agent address blank.** `06-ARTICLES` Article II has `[REGISTERED AGENT ADDRESS]` placeholders. | Path B | Easy fix, but required |
| G-6 | **Cover letter (`00`) addresses OCF as a candidate sponsor — OCF is dissolved.** OCF wound down 12/31/2024 ([source](https://opencollective.com/foundation/updates/announcement-we-are-dissolving-open-collective-foundation-at-the-end-of-this-year)). Letter needs revision before any sponsor receives it. | Path A | Embarrassing if sent as-is |
| G-7 | **Year-3 budget at the 1023-EZ ceiling.** `03-BUDGET.md` projects $50,000 Y3, exactly the EZ threshold. `07-WORKSHEET` flags this as borderline. The packet has no decision rule for which form to file. See §2 below. | Both paths | Decision blocker |
| G-8 | **Citation revenue + x402 paid endpoints UBIT analysis is absent.** `07-WORKSHEET` Q13 marks UBI as "open question — counsel review." No counsel has been engaged. See §2.3 below for first-pass legal analysis. | Both paths | Risk blocker |
| G-9 | **AGFarms COI mitigations are written, but the structural separation is not enforced in code/wallet.** Founder still personally custodies the wallet, the domain, and the GitHub repo (per `04-BOARD-AND-GOVERNANCE.md` §1). A c3 cannot be primarily for AGFarms's benefit. See §6 below. | Both paths | Existential risk if sloppy |
| G-10 | **No state charitable solicitation registration plan.** NY and NJ both require registration before any donation solicitation in-state (NY EPTL Article 7-A, NJ Charitable Registration Act). Packet does not mention this. | Both paths | Compliance blocker once donations open |
| G-11 | **No Form 990 / 990-N filing plan.** Annual e-postcard required even for sponsored projects that operate at scale; required for direct c3. | Both paths | Operational gap |
| G-12 | **`README.md` says "reactivated 2026-04-14" with 14-month dormancy — packet treats this as stylistic, but if founder ever issued the project an EIN or filed any state paperwork in 2024 we have a different fact pattern.** Verify there is truly no prior legal entity, no prior EIN, no prior state filing under the bucket.foundation name. | Both paths | Founder must confirm |

**Bottom line:** Path A (fiscal sponsor) is currently 60% file-ready (fix G-6 cover letter, then send). Path B (direct c3) is ~30% file-ready — needs board recruitment (G-2), bylaws (G-3), state decision (G-4), counsel UBIT opinion (G-8), and EIN (G-1) before anything goes to IRS.

---

## 2. 1023 vs 1023-EZ decision memo

### 2.1 Eligibility math

Form 1023-EZ requires ([IRS Instructions for Form 1023-EZ, Rev. Jan 2025](https://www.irs.gov/instructions/i1023ez)):

- Annual gross receipts **≤ $50,000** in each of past 3 years AND projected next 3 years
- Total assets **≤ $250,000** FMV
- Not formed as LLC, foreign entity, church, school, hospital, supporting org, or successor to a for-profit
- User fee: **$275** (long Form 1023 user fee is **$600**)

### 2.2 Bucket's projection vs ceiling

Per `03-BUDGET.md`:

| Year | Expected cash income | Headroom under $50k |
|---|---:|---:|
| Y1 | $1,950 | $48,050 |
| Y2 | $15,000 | $35,000 |
| Y3 | $50,000 | **$0 — at ceiling** |

The Y3 expected number sits exactly on the line. If a single grant lands ($25k Mozilla/Sloan/PL Network, contemplated as I-3 in the budget), Y2 alone could already cross $50k.

### 2.3 Earned revenue / UBIT analysis (first pass — needs counsel)

Bucket's planned earned revenue streams:
- **Citation fees via x402** — micropayments routed ≥80% to authors, ≤20% retained.
- **Paid x402 data endpoints** (Kruse Index preview, future canon API).
- **Story Protocol IP NFT mints** — author copyright registration, not financial instruments.

UBIT three-prong test ([IRS](https://www.irs.gov/charities-non-profits/unrelated-business-income-defined)): (1) trade or business, (2) regularly carried on, (3) **not substantially related** to exempt purpose.

**First-pass conclusion: most of this revenue is substantially related and therefore NOT UBI.**

- Citation fees on bucketed papers directly implement the exempt purpose (returning revenue to authors, lowering reader cost). The activity *is* the charitable program. This is on all fours with arXiv-style infrastructure: the paid component funds and *is* the dissemination.
- The 20% retained portion that funds operations is fee-for-service against the exempt activity itself — the analog is a museum admission fee, which is well-settled as program revenue, not UBI.
- Paid x402 endpoints into the canon are **educational dissemination at marginal cost**. As long as pricing is calibrated to access (not profit maximization), this stays substantially related.
- Reminder: **using income for a mission-related purpose does not shield it** — the test is whether the *activity* is related ([Adler & Colvin](https://www.adlercolvin.com/unrelated-business-income-tax-a-primer/)). Bucket's case is strong because the activity itself disseminates research.

**Risk areas that COULD trigger UBIT and need a written counsel opinion:**

- A B2B API selling bulk-rate citation data to a for-profit AI company (Nucleus Brain, AGFarms-adjacent, or any third party). If that becomes a regularly-carried-on revenue line distinct from public dissemination, it **probably is** UBI. Mitigations: keep public/free tier identical to paid tier on a per-call basis; price at cost-recovery; document every B2B contract.
- Sponsorship / advertising on the reference site — almost always UBI unless structured as qualified sponsorship per IRC §513(i). Avoid in Y1.
- Any AGFarms Nucleus Brain integration that pays Bucket on terms unavailable to other consumers — same as G-9.

Form 990-T required at $1,000+ gross UBI in a year. Bucket has zero today, but the structure must be designed to keep it that way.

### 2.4 Recommendation

**File 1023-EZ in Y1 or early Y2.** Reasoning:

1. Eligibility holds today and in Y1; Y3 is the danger zone, so file early to lock in determination before crossing.
2. $275 vs $600 fee + 30-day vs 3–12 month processing is a meaningful operational difference for a volunteer-run project.
3. The packet is already structured around 1023-EZ in `07-WORKSHEET`.
4. Get a 1-page written counsel opinion on UBIT (citation revenue is program-related) BEFORE submitting — this is the single attestation question on Form 1023-EZ that has the most determination-revocation risk if wrong.

**Trigger to switch to long Form 1023:** if a binding ≥$30k grant is committed in Y1 OR if any B2B paid-data contract is in negotiation OR if AGFarms commercial relationship is contemplated within 24 months. In any of those cases, file the long form — it gives the IRS the activity detail it needs and reduces the chance of a later scope challenge.

---

## 3. Fiscal sponsor shortlist (Path A bridge)

Goal: enable tax-deductible donations + grant eligibility within 4–12 weeks while Path B is prepared in parallel.

### 3.1 Confirmed: Open Collective Foundation is dissolved

OCF wound down its fiscal sponsorship program **September 30, 2024**, with full dissolution **December 31, 2024** ([OCF announcement](https://opencollective.com/foundation/updates/announcement-we-are-dissolving-open-collective-foundation-at-the-end-of-this-year), [Open Source Collective response](https://opencollective.com/opensource/updates/regarding-the-announcement-to-dissolve-open-collective-foundation)). Remove from `00-COVER-LETTER.md` and `README.md` (Path A list).

Note: **Open Source Collective** (OSC) is a *separate* 501(c)(6) entity that survived OCF's dissolution. OSC is a (c)(6), not (c)(3), so donations to it are **not tax-deductible to donors** — that disqualifies it for Bucket's main use case (deductible donations + grants). Useful for sponsorships and dues, not for charitable bridging.

### 3.2 Recommended shortlist (3–5 candidates, ranked)

| Rank | Sponsor | 501(c)(3)? | Fee | Intake speed | Web3 / earned-revenue fit | Verdict |
|---|---|---|---|---|---|---|
| **1** | **Hack Club Bank / HCB (The Hack Foundation)** ([hackclub.com/fiscal-sponsorship](https://hackclub.com/fiscal-sponsorship/)) | Yes | **Effectively 0% — no upfront, no per-donation cut on the standard tier**; relies on float + donor cover. Industry comparison cited 7–14% on rivals ([HCB help](https://help.hcb.hackclub.com/article/17-what-is-fiscal-sponsorship-how-is-it-different-from-501c3-status-how-is-hcb-unique-as-a-fiscal-sponsor)). | Days–weeks | **Excellent** — built by hackers, Stripe + crypto donations supported, transparent ledger, open-source platform | **Top pick.** Cheapest, fastest, fits open-source + web3 culture. Risk: skews young/teen-coded; verify they accept founder-led adult research projects (they do — many adult OSS projects are sponsored). |
| **2** | **Players Philanthropy Fund (PPF)** ([ppf.org](https://ppf.org/fiscal-sponsorship/)) | Yes | **6% on aggregate monthly deposits**, no fee on in-kind ([PPF FAQ](https://ppf.org/faqs/)) | Weeks | Good — broad mandate, accepts diverse projects. Less web3-native than HCB. | **Strong fallback.** Lowest paid-fee in the industry, professional ops, no minimum project size. |
| **3** | **Social Good Fund** ([socialgoodfund.org](https://www.socialgoodfund.org/fiscal-sponsorship/sponsorship-rates/)) | Yes | **6.5% or 8% of revenue** + $29/mo refundable admin (refunded once project raises $5k/yr) | ~5 business days to first call | Moderate — broad mission fit, less open-source specific | Solid generalist. Higher fee than HCB/PPF but well-run. |
| **4** | **Code for Science & Society (CS&S)** ([codeforscience.org](https://codeforscience.org/)) | Yes | ~10–15% (varies; ask) | Weeks–months, more selective | **Best mission fit** — they sponsor open-data and open-research infrastructure (e.g., Dat, scientific software) | Best **alignment**, slowest intake. Worth applying as Tier-2 even if HCB accepts, because CS&S brings a research-infrastructure peer network. |
| **5** | **Software Freedom Conservancy (SFC)** ([sfconservancy.org](https://sfconservancy.org/)) | Yes | ~10% | Months; selective; expects mature OSS projects | OSS-focused, less aligned with research-data side; cautious on crypto | Apply only if HCB/PPF/CS&S all decline; SFC's bar is mature, established OSS. |

### 3.3 Deal-breakers checked

- **Players Philanthropy Fund** — has been criticized in some media (politically conservative-leaning donors among its sponsored projects per InfluenceWatch); not a c3 issue but a brand association consideration. Operationally clean.
- **Hack Club Bank** — biggest risk is brand fit (Hack Club is teen-coded). Confirm in intake call that adult research-infra projects are welcome before submitting.
- **CS&S / SFC** — long onboarding queues; do not block on these.
- **FreeCodeCamp** — does not run a general fiscal-sponsor program (operates its own programs only). Removed from candidate set.
- **Code for America** — runs civic-tech fellowships, not general fiscal sponsorship for unrelated research orgs. Removed.
- **NumFOCUS** — strictly focused on open-source scientific *computing* projects (NumPy, Jupyter, etc.). Bucket is research-data, not numerical computing. Borderline fit at best; not in top 5.
- **Aspiration / Allied Media Projects** — strong on social-justice frame; possible fit if framed as access-equity, but adds advocacy expectations Bucket may not want.

### 3.4 Recommended sequencing

Apply to **HCB first** (fastest, cheapest, best culture fit). If response is positive within 2 weeks, sign and stop. If declined or slow, apply to **PPF** in parallel with **CS&S** (CS&S is a longer process so start it early as insurance). Do not apply to all 5 simultaneously — sponsors talk and double-applying signals desperation.

---

## 4. State of incorporation — DE vs founder's home state (NY or NJ)

### 4.1 The Delaware-default is wrong for small nonprofits

Conventional Delaware-LLC wisdom does not transfer to nonprofits ([Foundation Group on DE nonprofits](https://www.501c3.org/incorporate-nonprofit-delaware/), [Charity Lawyer Blog](https://charitylawyerblog.com/2022/03/21/choice-of-domicile-for-nonprofit-corporations/)):

- Delaware's flexible governance (single-director boards, etc.) does **not** apply because the IRS overrides it for c3s — the IRS requires multi-director boards regardless of state law.
- Delaware nonprofits operating elsewhere must register as a **foreign nonprofit** in the state of operation, doubling compliance and cost.
- Cost comparison ([James Hsui PLLC](https://www.jameshsuilaw.com/legal-guides/best-state-start-501c3-nonprofit-delaware-new-york/)): NY-incorporated nonprofit operating in NY ≈ $85 startup, $0 minimum annual; DE-incorporated nonprofit operating in NY ≈ $379 startup, $70 annual minimum (DE registered agent + foreign qualification).
- For-profit advantages of Delaware (Court of Chancery, sophisticated case law) almost never apply to small charities — disputes are governed by the state attorney general, who is in your state of operation regardless.

### 4.2 NY vs NJ for Bucket

Founder resides in NY/NJ. Either is workable; the differentiator is regulatory aggression.

| Factor | NY | NJ |
|---|---|---|
| Incorporation cost | ~$75 | ~$75 |
| State charitable solicitation registration | **Aggressive** — NY EPTL Article 7-A + audit threshold at $1M (CHAR500 annual) | Required — NJ Charitable Registration Act, simpler |
| AG oversight | Aggressive (Letitia James office very active) | Moderate |
| 501(c)(3) state corporate income tax exemption | Automatic on IRS determination | Automatic on IRS determination |
| Sales tax exemption | Separate ST-119 application | Separate ST-5 application |
| Annual filing | CHAR500 + Form 990 | CRI-300 + Form 990 |

**Recommendation:** Incorporate in **the state where Bucket will primarily operate / where founder is domiciled at the time of filing**. If founder is NJ-resident: file NJ. If NY-resident: file NY (accept higher compliance burden — NY's rigor is reputationally useful for an open-research nonprofit). Either is materially better than Delaware.

**Action item for founder:** confirm domicile as of intended filing date. Then we discard `06-ARTICLES-OF-INCORPORATION-DRAFT.md` (DE) and draft a state-specific replacement.

---

## 5. Board recruitment shortlist criteria

### 5.1 IRS rules

- **Minimum 3 directors** for IRS to approve 1023/1023-EZ as a public charity ([Foundation Group](https://www.501c3.org/kb/related-board-members-of-a-nonprofit/)).
- **Majority unrelated**: at least 51% of voting directors must be unrelated to each other and to the founder by blood, marriage, outside business, or employment relationship ([IRS governance guidance](https://www.irs.gov/pub/irs-tege/governance_practices.pdf)).
- **Independence**: a director is "independent" if they (a) are not compensated as an officer or employee of the organization or a related organization, (b) have no family member receiving over $10k/yr from the organization, (c) have no business transactions with the organization above the IRS threshold, and (d) are not a "disqualified person" under §4958.
- **Disqualified person** (§4958): substantial contributors, founders with substantial influence, family members of those, and entities ≥35% owned by them. Founder Gian = disqualified person; therefore **at least 2 of any 3-person board must be NOT disqualified persons** (independent of founder and AGFarms).
- **Quorum trap**: if 2 of 5 directors are related, both being present at a vote requires all 5 present to keep quorum majority-unrelated ([Foundation Group](https://www.501c3.org/kb/related-board-members-of-a-nonprofit/)). Avoid this by recruiting more independents than relateds from day one.

### 5.2 Profile types needed (3 minimum, 5 ideal)

| Seat | Profile | Why this profile | Independence |
|---|---|---|---|
| 1 | **Founder (Gian)** — technical lead, founding maintainer | Continuity, technical authority, vision | NOT independent (disqualified person) |
| 2 | **Academic / open-research scientist** — assistant or associate prof in any canon branch (math, physics, info, biophysics, cosmology) OR a librarian at a research university | Voice of constituency. Brings credibility for grant applications. Critical for canon editorial decisions. | Must be independent — no AGFarms / Nucleus / DerbyFish ties |
| 3 | **Nonprofit ops / open-source veteran** — someone who has served on a c3 board before, ideally in OSS or open-data (e.g., past board member of an Apache/Linux-Foundation project, NumFOCUS contributor, or similar) | Governance discipline. Translates between "founder velocity" and "fiduciary duty." | Must be independent |
| 4 (recommended) | **CPA or nonprofit attorney pro-bono** — small-firm CPA who handles c3 990s, OR a nonprofit-focused attorney willing to serve | Form 990 sign-off, COI policy review, audit prep. The "no surprises" seat. | Must be independent. Beware: if they bill the org, they are NOT independent. Must serve unpaid as a director, billing limited to attorney-client work outside of board service. |
| 5 (later) | **Author/researcher who has been paid via Bucket** | Once the Foundation has paid out citation revenue, a recipient-author seat closes the feedback loop and is a strong public-benefit signal. | Must be independent |

**Filing minimum: seats 1 + 2 + 3.** That is the smallest board the IRS will accept and that satisfies the majority-independent rule (2 of 3 unrelated).

### 5.3 Recruitment heuristics (not specific people)

- Don't recruit anyone with an AGFarms, DerbyFish, or Viatika connection. Even unpaid advisory roles disqualify them as "independent" if they have a financial interest in a related entity.
- Don't recruit family or longtime business partners for the independent seats. The IRS interprets "outside business connection" broadly.
- Recruit at least one director who lives in a different metro than the founder — geographic dispersion is a soft signal of independence and helps with the "rubber-stamp board" optic.
- Get verbal commits from all three before filing 1023-EZ. The form requires names + titles.

---

## 6. AGFarms COI structure — the existential question

### 6.1 The IRS rule that bites

A 501(c)(3) **must not be operated for the substantial benefit of a private interest**, including the founder's other entities ("private benefit doctrine"). Even one transaction that confers more than incidental benefit on AGFarms can trigger:

- Excise tax under §4958 (excess benefit transaction) on the disqualified person and on any board member who approved it,
- In severe cases, revocation of c3 status.

The COI policy in `05-CONFLICT-OF-INTEREST-POLICY.md` is good but is **procedural, not structural**. Procedural fixes (recusal, disclosure) are not enough if the org's *primary activity* benefits AGFarms. The IRS looks at substance, not form.

### 6.2 Structures that work

To allow Bucket to fiscally support charitable work that overlaps with AGFarms ventures (DerbyFish marine science, MamaTeeTees education) without jeopardizing exempt status:

1. **Bracketing rule — Bucket only funds the charitable, openly-published portion.** Bucket can grant funds to a researcher studying fish populations whose data is published openly under CC-BY into the bucket-canon. Bucket cannot fund DerbyFish app development. The line: **does the deliverable end up open and accessible to the public, or does it stay inside an AGFarms commercial product?**
2. **Open-output requirement.** Any grant from Bucket to a researcher (whether or not affiliated with an AGFarms venture) must require the deliverable be released under an open license (CC-BY, MIT, CC0) and deposited into the public canon. No exclusive licenses to AGFarms.
3. **Arms-length pricing + parity term.** If AGFarms (Nucleus Brain, etc.) ever pays Bucket for an x402 endpoint or data access, the price and terms must be **identical to the public rate card**, in writing, with the contract published in the next quarterly report. Volume discounts are okay only if available to any third party who hits the same volume.
4. **No labor or compute swap.** Founder labor on Bucket is volunteered. AGFarms infrastructure (Hetzner CPX42, Nucleus Brain) hosting Bucket components must either be (a) billed to Bucket at fair market rate or (b) documented as an in-kind donation with a fair-market-value attribution. Mixing AGFarms infra into Bucket without accounting is the single largest practical risk today (see CLAUDE.md — Bucket runs against `bucket-foundation.nucleus.agfarms.dev`).
5. **No AGFarms vendor exclusivity.** Bucket cannot contract Viatika as its sole metering vendor on terms negotiated by founder for AGFarms; any vendor relationship must be evaluated independently by an unrelated director.
6. **Founder recusal is automatic, not requested.** Standing recusal on any motion that touches AGFarms or any AGFarms venture, recorded in minutes.
7. **Annual independent review.** Once a year, an independent director (preferably the CPA seat) reviews every transaction touching an AGFarms entity and certifies arm's-length compliance in writing. This is the Form 990 schedule L attachment.
8. **Public-facing disclosure on every page that solicits donations.** A one-line "Bucket Foundation is a nonprofit. AGFarms LLC is a separate for-profit company. They share a founder but no equity, ownership, or control." This is already in `05-...-COI-POLICY.md`; ensure the website implements it before any donation page goes live.

### 6.3 Specifically: Bucket as fiscal sponsor for AGFarms ventures

Once Bucket has its own c3 determination, it could in principle fiscally sponsor charitable subprojects of AGFarms ventures (e.g., a DerbyFish open marine-data initiative, a MamaTeeTees educational program in West Africa). **This is allowed but high-risk** and should not be done in Y1. Constraints:

- The sponsored subproject must have a **distinct charitable purpose**, **distinct deliverables**, and **distinct accounting** from the parent venture's commercial activity.
- Donor funds routed through Bucket cannot subsidize the commercial product. Example legal: "Bucket grants $10k to DerbyFish-Research-Initiative for open publication of fish population data" where the data and methodology end up in canon. Example illegal: "Bucket grants $10k to DerbyFish for app servers" — that's private benefit, end of story.
- The independent directors must approve any sponsored subproject by majority vote with founder recused.
- Each sponsored subproject must be reported separately in 990 Schedule R.

**Recommendation: defer sponsoring AGFarms-affiliated subprojects until Y2 at earliest, after Bucket has its own determination, an audited 990, and at least one unrelated grant cycle as proof of independence. Doing it Y1 confirms exactly the suspicion any sponsor or auditor will have.**

---

## Cited sources

- [IRS — Form 1023-EZ Instructions, Rev. Jan 2025](https://www.irs.gov/instructions/i1023ez)
- [IRS — Unrelated business income defined](https://www.irs.gov/charities-non-profits/unrelated-business-income-defined)
- [IRS — Governance and Related Topics — 501(c)(3) Organizations](https://www.irs.gov/pub/irs-tege/governance_practices.pdf)
- [Adler & Colvin — UBIT: A Primer](https://www.adlercolvin.com/unrelated-business-income-tax-a-primer/)
- [OCF — Dissolution announcement (12/31/2024)](https://opencollective.com/foundation/updates/announcement-we-are-dissolving-open-collective-foundation-at-the-end-of-this-year)
- [Open Source Collective — response to OCF dissolution](https://opencollective.com/opensource/updates/regarding-the-announcement-to-dissolve-open-collective-foundation)
- [Hack Club — Fiscal Sponsorship (HCB)](https://hackclub.com/fiscal-sponsorship/)
- [HCB — How is HCB unique as a fiscal sponsor](https://help.hcb.hackclub.com/article/17-what-is-fiscal-sponsorship-how-is-it-different-from-501c3-status-how-is-hcb-unique-as-a-fiscal-sponsor)
- [Players Philanthropy Fund — Fiscal Sponsorship](https://ppf.org/fiscal-sponsorship/) and [PPF FAQ](https://ppf.org/faqs/)
- [Social Good Fund — Sponsorship Rates](https://www.socialgoodfund.org/fiscal-sponsorship/sponsorship-rates/)
- [Foundation Group — Should I Incorporate My Nonprofit in Delaware?](https://www.501c3.org/incorporate-nonprofit-delaware/)
- [Foundation Group — Related Members on a Nonprofit Board](https://www.501c3.org/kb/related-board-members-of-a-nonprofit/)
- [James Hsui PLLC — Best State to Start a 501(c)(3): DE vs. NY](https://www.jameshsuilaw.com/legal-guides/best-state-start-501c3-nonprofit-delaware-new-york/)
- [Charity Lawyer Blog — Choice of Domicile for Nonprofit Corporations](https://charitylawyerblog.com/2022/03/21/choice-of-domicile-for-nonprofit-corporations/)
