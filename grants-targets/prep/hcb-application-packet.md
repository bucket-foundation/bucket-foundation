# HCB Fiscal Sponsorship Application — Bucket Foundation

**Bead:** bkt-1k5
**Date:** 2026-05-04
**Submit at:** https://hcb.hackclub.com/applications/new
**Sponsor:** The Hack Foundation (DBA Hack Club Bank), 501(c)(3), EIN 81-2908499
**Expected turnaround:** within 1 weekday for first contact + Zoom call; full onboarding ~1 week.
**Fee:** Effectively 0% on standard tier (no upfront, no per-donation cut; HCB relies on float + donor cover).

---

## First-screen gate

> **"Are you a teenager?"** → **"No, I'm an adult"** (Gian, b. ~199x — verify, age >18)

HCB is mostly teen-coded but accepts adult-led OSS / research / civic projects. Plenty of adult projects on HCB (e.g., college hackathons, OSS infra). The Zoom call is where you make the case for an adult research-infra project.

---

## Application content (paste-ready)

### Project name
**Bucket Foundation**

### Project tagline (one line)
Primary research paid-for-once and citeable-forever. The patronage layer for the new Renaissance.

### Website
https://bucket.foundation
GitHub: https://github.com/gianyrox/bucket-foundation (MIT, public)

### Mission statement
*(Lifted from MANIFESTO.md §3 + GOVERNANCE.md §1, condensed)*

Bucket Foundation makes primary research **paid-for-once and citeable-forever**, and routes citation fees to the authors who produced the foundations — not to publishers who extract rent from a process they did not create.

We do this by maintaining four things:
1. An **open protocol** (`PROTOCOL.md`, CC0-in-intent) so anyone can run an interoperable bucket — a content-addressed folder containing a paper, a manifest, and an HTTP 402 payment receipt.
2. A **reference implementation** at bucket.foundation (Next.js + Story Protocol IP NFTs + Walrus on-chain storage + Dynamic web3 auth + Supabase) as a non-exclusive example.
3. A **conservative canon** of foundation-tier research — axioms, real math, rules, laws, principles, primary derivations — across seven branches: mathematics, physics, chemistry, information & computation, biophysics, cosmology, and mind.
4. A **payment rail** that returns citation revenue to original authors at a default ≥80% of net receipts.

The protocol, the code (MIT), and the spec (CC0-in-intent) cannot be enclosed by any single party — including Bucket Foundation itself.

### What problem does this solve?
The current academic publishing economy charges authors to publish, charges readers to read, and pays nothing to the people whose foundations everyone else builds on. Sci-Hub, the open-access mandates, and the editorial-board exodus from Elsevier titles are leading indicators that this regime is cracking. Bucket is the substrate — protocol, canon, payment rail — that's ready when it cracks the rest of the way. Combined with frontier AI (which can read primary literature and refuse to bullshit only when grounded in real foundations) and HTTP 402 micropayments on Base L2, this is the first time in 500 years that the three Renaissance preconditions (foundations + tools + working patronage) are aligning at scale.

### Use of funds (year 1)

| Bucket | $ | Notes |
|---|---:|---|
| Reference site infrastructure (Vercel, Supabase, Walrus storage, x402 wallet gas, domain) | $1,800 | Already running; covers 12 months at current scale |
| Author payouts seed (citation fee subsidy + initial canon-author honoraria) | $4,000 | Returns to authors ≥80% per GOVERNANCE.md §4 |
| Canon curation contractor labor (research librarian, ~40 hrs across 7 branches) | $3,000 | Branch curators for math/physics/chem/info/biophysics/cosmology/mind |
| Story Protocol minting + chain costs for first ~50 canon papers | $1,200 | IP NFT registration on Story testnet → mainnet |
| Legal — 501(c)(3) Form 1023-EZ filing + state incorporation + counsel UBIT opinion | $2,500 | $275 IRS fee + ~$1,500 attorney UBIT memo + state filing |
| Accounting / bookkeeping (annual 990-N, basic ledger) | $500 | Volunteer-hour gap fill |
| Reserve / buffer | $1,000 | Per GOVERNANCE.md §4 (no reserves >12mo opex) |
| **Total Year 1** | **$14,000** | |

### 12-month budget projection

**Income:**

| Source | Conservative | Plausible |
|---|---:|---:|
| Individual donations (web3-native, HCB Stripe, ETH/USDC) | $1,000 | $5,000 |
| Citation fee revenue (x402 micropayments through reference bucket) | $200 | $2,000 |
| Small grants (Gitcoin OSS, Ethereum Foundation ESP, Protocol Labs RFP-X) | $5,000 | $50,000 |
| Foundation grant (Sloan exploratory tech LOI — moonshot) | $0 | $50,000 |
| **Total** | **$6,200** | **$107,000** |

Conservative scenario funds Y1 operating burn ($14k) by closing one $5k OSS round + small donations. Plausible scenario funds 2 years of runway and seeds author payouts.

**Expenses:** as per Use of funds table above.

### Governance / board sketch
*(Lifted from GOVERNANCE.md §5 + nonprofit-application memo §5.2)*

Until formal 501(c)(3) determination, Bucket runs under **maintainer authority** with full transparency:
- **Founding maintainer:** Gianangelo Dichio (@gianyrox) — decision-maker of last resort.
- **Open process:** Every non-trivial decision recorded as a GitHub issue tagged `governance`. Community objections considered + responded to before finalization.
- **On-chain transparency default:** All financial flows through the Foundation's reference wallet are public on-chain and independently auditable. HCB's transparent ledger (https://hcb.hackclub.com/bucket-foundation, once active) reinforces this.

**Planned board (3 directors minimum, IRS rule; ≥2 independent of founder):**
1. **Founding maintainer (Gian)** — technical lead. Disqualified person under IRS §4958.
2. **Academic / open-research scientist** — assistant or associate prof in any canon branch (math/physics/info/biophysics/cosmology) OR research librarian at a research university. Must be independent.
3. **Nonprofit ops / open-source veteran** — past board member of an Apache/Linux Foundation / NumFOCUS-style project. Must be independent.
4. *(Optional 4th)* Pro-bono CPA or nonprofit attorney.
5. *(Y2+)* A canon author who has been paid via Bucket's citation rail.

**COI structural protections** (GOVERNANCE.md §7 + nonprofit-app memo §6):
- Founder is also founder of AGFarms LLC (for-profit venture studio). This is disclosed; AGFarms has zero ownership/equity/control over Bucket.
- Standing recusal for any motion touching AGFarms or any AGFarms venture.
- Open-output requirement on any Bucket-funded research (CC-BY / CC0 / MIT, deposited in public canon).
- Arms-length pricing parity — any AGFarms-Bucket transaction at identical rate to public rate card, contract published quarterly.

### Prior-year financials
**None.** Bucket is pre-revenue and was reactivated 2026-04-14 from a 14-month dormancy (originally prototyped Dec 2022 as a different product — see `HISTORY.md`). No prior EIN, no prior bank account, no prior state filing. This HCB application is the first formal financial vehicle.

### Expected first-year donations + grants
- **Donations (individual):** $1,000–$5,000. Crypto-native audience; small donor base initially via founder network + Twitter / canon-figures outreach.
- **Grants pursued in Y1:** Gitcoin OSS round, Ethereum Foundation ESP, Protocol Labs RFP-X, Sloan exploratory tech LOI. Combined plausible: $50–100k. See `grants-targets/bucket.md`.
- **Citation fee revenue:** experimental; targeting first $500 in Y1 to prove the rail.

### Why HCB specifically?
- **Open-source culture fit.** HCB is built by hackers; the platform itself is open-source (github.com/hackclub/hcb). Aligns with Bucket's MIT-code / CC0-protocol ethos.
- **Web3 / crypto donations supported natively.** Bucket's payment rail is x402 on Base L2 — we need a sponsor who can receive ETH/USDC donations and bridge to fiat, not a sponsor who flinches at crypto.
- **Transparent ledger by default** — Bucket's GOVERNANCE.md §5 commits to "transparency default"; HCB is the only major fiscal sponsor whose entire ledger is public.
- **Effectively 0% fee** on standard tier vs 6–10% at PPF / Social Good Fund / CS&S — every dollar of fee saved goes to author payouts.
- **Speed** — days-to-weeks intake vs months at CS&S/SFC. We need to be able to receive Sloan / Gitcoin / ESP funds in June 2026.

### Risk disclosures (offered proactively, not asked)
1. **Adult-led project** in a teen-majority sponsor — confirmed in intake gate. Plenty of precedent (adult OSS projects on HCB).
2. **Crypto component** — citation rail uses x402 on Base L2. Wallet activity will be on-chain transparent. We will cooperate with HCB compliance review of any specific transaction pattern.
3. **AGFarms COI** — founder also runs AGFarms LLC (for-profit). Structural separation documented in GOVERNANCE.md §7 and `nonprofit-application/00-BASE-INFO-MEMO.md` §6. Bucket holds no AGFarms equity; AGFarms holds no Bucket equity. Founder will recuse on any AGFarms-touching motion.
4. **Founder personal capacity custody (today)** — domain, wallet, and GitHub repo currently in founder's personal name. HCB onboarding is part of moving these to a c3 vehicle. Repo transfer to AGFarms or to a future c3 entity scheduled for post-determination.
5. **Long-tail c3 path** — Form 1023-EZ filing planned for May–June 2026; determination expected Q3–Q4 2026. HCB is the bridge.

### Founder bio (one paragraph)
Gianangelo Dichio. Founder of AGFarms LLC (Delaware, self-funded venture studio with 16+ ventures). Previously: software engineering at multiple early-stage startups; built and shipped Nucleus Brain (an open-source AI enterprise platform), DerbyFish (competitive fishing platform), and several other products under the AGFarms umbrella. Bucket Foundation is held in personal capacity, separate from AGFarms equity, with full COI disclosure.

---

## Submission checklist

- [ ] Confirm founder's age gate answer (adult) and primary email
- [ ] Confirm physical address for application — recommend founder's home address, NOT AGFarms address (per nonprofit-application memo §6 — keep COI separation)
- [ ] Have GitHub repo (gianyrox/bucket-foundation) public with MANIFESTO + GOVERNANCE + LICENSE visible
- [ ] Have https://bucket.foundation reachable (public-facing landing page)
- [ ] Be ready for 1-weekday Zoom call — talking points: adult project, OSS+web3 fit, transparent ledger, AGFarms COI handled
- [ ] After approval: open HCB account, get debit card + Stripe + crypto donate URLs, update bucket.foundation site donate page

## Sources
- [Hack Club — Fiscal Sponsorship](https://hackclub.com/fiscal-sponsorship/)
- [HCB application](https://hcb.hackclub.com/applications/new)
- [HCB Help — How HCB is unique as a fiscal sponsor](https://help.hcb.hackclub.com/article/17-what-is-fiscal-sponsorship-how-is-it-different-from-501c3-status-how-is-hcb-unique-as-a-fiscal-sponsor)
- [HCB GitHub (open source platform)](https://github.com/hackclub/hcb)
- [Fiscal Sponsor Directory — The Hack Foundation](https://fiscalsponsordirectory.org/?page_id=11879)
