# Bucket Foundation Research-Tools Platform: Monetization & Pricing Strategy

**Doc:** `03-monetization.md` · **Owner:** Revenue pillar · **Date:** 2026-06-18
**Status:** v1 strategy. Sibling docs `01-*` (Data: `research_tools_needs.csv`) and `02-tool-roadmap.md` (Product) not yet present at authoring time, this doc is self-contained and will reconcile per-tool weights when they land.

**Payment rail:** x402 on Base + Viatika metered-credit substrate. **1 credit = $0.001 USD** (org-wide). All metered AI/data pricing across AGFarms routes through Viatika per Strategic Priority #6, Bucket does NOT roll its own ledger.

**Framing constraint (load-bearing):** bucket.foundation is a **nonprofit**. The legitimate, defensible posture is **cost-recovery + sustaining fees**, held well clear of profit extraction. This is also the *strongest* competitive position: it mirrors the academic core-facility recharge model researchers already trust and already have grant budget lines for ([NIH core-facility costing guidance](https://grants.nih.gov/grants/guide/notice-files/not-od-13-053.html)). We price to cover compute + sustain the platform + fund the canon, and we say so out loud.

---

## 1. Who pays, and why

The platform has three distinct buyers with different wallets and different decision logic. Critically, **almost none of them pay out of personal money**, research-tool spend comes from grants, and the grant has already been justified to a funder.

| Buyer | Who | Whose money | Decision driver | Willingness to pay |
|---|---|---|---|---|
| **Individual researcher** (PhD, postdoc, RSE) | The person who runs the tool, reads the output, and cites it | Personal card for trials; **PI's grant** for real usage | "Does this get my paper out faster / unblock my analysis?" Speed and reproducibility, ahead of features. | Low personal ($0-20/mo reflex, anchored by Elicit $10, SciSpace $20, Scite $12). High via grant if framed as compute. |
| **Lab / PI** | Principal investigator funding 3-15 people | **Direct grant costs** (NIH/NSF/EU/CZI), software & compute are allowable direct costs when "primarily or exclusively used in the actual conduct of the proposed scientific research" ([NIH 7.9](https://grants.nih.gov/grants/policy/nihgps/html5/section_7/7.9_allowability_of_costs_activities.htm)) | "Cheaper/faster than a core facility or a hire; reproducible methods my students can cite." | Medium-high. A PI thinks in $K/yr, not $/mo. A $500-5,000/yr lab line is invisible inside a $250K, 1M grant. |
| **Institution / core facility** | Research-computing office, structural-biology core, library | **F&A (indirect) + recharge accounts**; site licenses | "Recover cost across many labs; one invoice; compliance." Core facilities are *required* to price at cost recovery and rebate surplus ([NOT-OD-13-053](https://grants.nih.gov/grants/guide/notice-files/not-od-13-053.html)). | Lump-sum site license ($10K, 100K/yr norm). Slow sales cycle (6-18 mo). Not the early wedge. |

**Why a nonprofit fits all three:** cost-recovery pricing is *the same mental model* a core facility uses. We are not asking a PI to fund a startup's margin; we are asking them to pay for compute + a sustaining fee, which their grant officer already knows how to approve. That removes the single biggest friction in selling software to academics: the suspicion that they're overpaying a vendor.

---

## 2. Pricing-model options & recommendation

### The five options on the table

1. **Free tier (loss-leader, adoption engine).** Capped runs/credits per month, watermarked/non-citable outputs, community queue. Purpose = get the tool into the workflow and into a methods section.
2. **Metered per-run over x402/Viatika (usage-based).** Each tool run debits credits sized to its real compute cost. No subscription. Pure cost-recovery + thin sustaining margin.
3. **Pro / lab subscription.** Flat $/mo or $/yr for a seat or a lab, bundling a credit allowance + reproducibility features (private projects, version-pinned runs, citable DOIs, priority queue).
4. **Institutional site license.** Annual lump sum, unlimited or large-pool credits, SSO, invoice billing, data-residency.
5. **Paid-to-cite canon (Bucket's existing model).** Free-to-read, pay-per-citation over x402 ($0.002-0.010/call today). Tool *outputs* become citable canon artifacts.

### Recommended primary model

> **Metered per-run over x402/Viatika (option 2) as the spine, wrapped in a generous free tier (option 1) for adoption, with an optional lab subscription (option 3) that is purely a convenience/predictability bundle sitting outside any paywall.** Institutional (option 4) is a later harvest. Paid-to-cite canon (option 5) is the reinforcing flywheel, folded into the same product.

**Why this is the right model for a nonprofit research-tools platform:**

- **It is cost-recovery by construction.** Credit price ≈ compute cost + small sustaining fee. We can publish the formula. That is the most credible thing a nonprofit can say to a skeptical PI, and it directly mirrors NIH recharge rules.
- **It survives the free-OSS reality.** The underlying *models* are free and open: AlphaFold, ColabFold (~1,000 structures/day on one GPU), RFdiffusion, Boltz-1 ([Boltz-1, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC11601547/); [ColabFold, Nature Methods](https://www.nature.com/articles/s41592-022-01488-1)). **You cannot sell the model.** You *can* sell the thing nobody wants to maintain: the serving layer, the orchestration, the RAG-over-this-lab's-corpus, the reproducible/citable run record. Metered pricing charges only for the work done, which is the only thing to charge for when the model is free.
- **It maps to how money flows.** A PI cannot get a recurring SaaS seat approved, but compute and per-use core-facility charges are routine, pre-justified grant lines. Usage-based = "compute," which procurement already understands.
- **It needs no sales team.** x402 + Viatika means an agent or a researcher tops up credits and runs. Self-serve. This is the same "run a barbell: one grant-first open-source tool + one paid-commercial" insight from the strategy report, metered is the paid-commercial side that needs zero headcount.
- **Subscriptions stay.** The lab tier is *not* gating capability; it's a discount + predictability bundle (prepay credits at a small discount, get private projects and citable DOIs). A nonprofit selling a "Pro tier that gates features" reads as extraction; a "prepay-and-save + reproducibility" bundle reads as a co-op.

**What we explicitly reject:** seat-based enterprise SaaS as the primary model (the Benchling/Dotmatics path, $20K+/yr, 5-seat minimums, contact-sales, multi-million enterprise contracts; see [Scispot's Benchling pricing guide](https://www.scispot.com/blog/the-complete-guide-to-benchling-pricing-plans-costs-and-alternatives-for-biotech-research)). That model maximizes revenue per logo but is hostile to individual academics, requires a sales org, and is the opposite of nonprofit framing. We let the *institutional* tier (option 4) capture that buyer later, on our terms.

---

## 3. Per-tool pricing

**Method.** Each tool gets a **compute weight class** from its dominant resource (CPU-only / light-GPU / heavy-GPU / RAG-LLM-token). We price = (estimated real compute cost per run) + a flat **sustaining fee** (~25-40% of compute, our nonprofit overhead recovery), rounded to a clean credit number. GPU cost anchor: H100 ≈ **$2-4/GPU-hr** on specialized clouds, ≈$3/hr GCP on-demand, with per-second billing for short/bursty inference ([Spheron 2026](https://www.spheron.network/blog/gpu-cloud-pricing-comparison-2026/); [CloudZero](https://www.cloudzero.com/blog/cloud-gpu-pricing-comparison/)). LLM-token cost anchor: a non-trivial RAG answer ≈ $0.02-0.15 in model tokens.

Recall **1 credit = $0.001**, so $1.00 = 1,000 credits.

| Tool | What it does | Compute class | Est. real cost/run | **Price (credits)** | **≈ USD/run** | GPU-heavy? |
|---|---|---|---|---|---|---|
| **LabBrain** | Literature-RAG / agentic co-scientist over a lab's papers | RAG-LLM tokens (light) | $0.03-0.10 | **120 cr** | $0.12 | No |
| **ScreenServer** | ADMET / property prediction screening | CPU + light GPU, batchy | $0.01-0.05 per compound; batched | **40 cr / compound** (vol. Discount >1k) | $0.04 | Light |
| **PatchSeqML** | Patch-seq / electrophysiology ML analysis | CPU + light GPU | $0.05-0.20 | **250 cr** | $0.25 | Light |
| **ProteinScout** | Protein structure/feature prediction & annotation | **GPU** (folding-class inference) | $0.30-1.00 | **900 cr** | $0.90 | **Yes** |
| **StabilityDesigner** | ΔΔG mutational stability prediction/design | **GPU** | $0.40-1.20 | **1,200 cr** | $1.20 | **Yes** |
| **CryoTriage** | Cryo-EM micrograph / particle QC triage | **GPU**, can be long | $0.50-2.00 per session | **1,800 cr / session** | $1.80 | **Yes** |
| **TrajMine** | MD trajectory mining + Markov-state modeling | **GPU + storage**, heaviest | $1.00-4.00 per trajectory | **2,500 cr / trajectory** | $2.50 | **Yes (flag)** |

**Notes & guardrails**
- **GPU-heavy flag** (ProteinScout, StabilityDesigner, CryoTriage, **TrajMine**): these are where real cost lives and where we must NOT under-price into a loss. TrajMine is the heaviest (large trajectories + storage egress); meter on actual GPU-seconds + GB processed in place of a flat fee, so a 100ns run and a 10µs run don't pay the same. The flat numbers above are *typical-run* anchors for the pricing page.
- **CPU/RAG-light tools** (LabBrain, ScreenServer, PatchSeqML) are near-free to run, so price them low, they are adoption drivers and citation generators, with revenue coming from elsewhere. LabBrain at ~$0.12/run undercuts the personal mental anchor of Elicit/SciSpace/Scite ($10-20/mo) on a per-use basis and is the front door.
- **Volume / batch discounts** for screening-class tools (ScreenServer): credits/unit drop with batch size, matching how compute amortizes.
- **Free tier**: e.g. 5,000 free credits/mo (= ~40 LabBrain runs, or ~5 ProteinScout runs, or ~2 TrajMine runs). Enough to get hooked and into a methods section; not enough to run a production pipeline free.
- **Citable run upgrade**: any run can be registered as a citable canon artifact (real DOI via Zenodo + feed402 cite-forever block; no blockchain) for a small premium (see §5).

### Lab subscription
- **Lab Sustaining tier ≈ $50/mo or $500/yr** → includes ~600,000 credits/yr ($600 of compute at face, i.e. A ~17% prepay bonus), private/version-pinned projects, free citable-DOI minting on runs, priority queue. Sized to be an invisible direct-cost line inside any funded grant. Anchored *below* Elicit Enterprise / SciSpace Labs ($18/user/mo) on a per-lab basis, far below CryoSPARC-commercial / Benchling territory.
- **Institutional (later):** site license $10K, 100K/yr (matching the academic norm from the strategy report), SSO, pooled credits, invoice billing, data residency. Sold to research-computing offices once 3+ labs at an institution are already metered users (land-and-expand).

---

## 4. Market sizing

Built bottom-up from our own dataset: **3,870 ranked advisors**, **45 fields/subfields**, **~80 ranked programs**, **107 scored software opportunities**, and the strategy report's funding pool.

**Top-down anchor (from `Biophysics_Software_Opportunity_Strategy.pdf`):**
- Biophysics research funding pool: **$3.29B** (NIH $5.23B across 9,998 projects + EU €3.78B, scoped).
- **Software-addressable ≈ $1.57B** (~48% of pool).
- Academic *purchasing* market: **~3,800 advisors / 1,353 institutions** = the funnel + grant-funder base, sitting upstream of the revenue base. The report's own warning: "monetize core facilities ($5-50K/yr), site licenses ($10-100K/yr), pharma seats (the real money)."

**Bottom-up for THIS platform (research-tools, metered):**

| Layer | Definition | Count basis | Annual value (rough) |
|---|---|---|---|
| **TAM** | All computational/quantitative biophysics & comp-bio labs globally who could run ≥1 tool | Our 3,870 advisors are a *biophysics-lineage sample*; the real population of comp-bio/biophysics/structure labs worldwide ≈ 30-50K labs (scaling from 849 institutions already active in ion-channel modeling, 159 in MD/protein structure, 70 in cryo-EM per the report). At a cost-recovery ~$1-3K/lab-yr of tool spend that we could touch → **~$50-120M/yr** addressable tool-run + sustaining spend. | ~40K labs | **$50-120M** |
| **SAM** | English-speaking, compute-comfortable, grant-funded labs in our reachable geographies (US 1,657 + DE 616 + GB 475 + CA 192 + AU 146 + NL 128 + CH 93 + SE 79 +... ≈ our 3,870 sample is the seed) scaled to ~8-12K labs that adopt agentic/RAG + GPU tools | ~10K labs × ~$1.5K/yr | **~$15M/yr** |
| **SOM (early-adopter wedge)** | The labs we can land in year 1 via the PhD-application + advisor-outreach funnel and the canon flywheel | see §6 | **$50-250K/yr Y1** |

**Reality check on the wedge:** Our `advisors_ranked` tiering gives **194 A+**, **387 A**, **967 B**, 2,322 C; **425 rising stars**. The A+/A pool (581 labs) are the highest-fit, most-computational, most-reachable PIs, and several already map directly to our 7 tools (the strategy report flags 849 labs in ion-channel modeling, 159 in MD/protein structure, 70 in cryo-EM image analysis as "your fastest adopters"). That is the SOM seedbed.

---

## 5. The flywheel: tool-runs ⇄ paid-to-cite citations

This is what makes a nonprofit research-tools platform self-reinforcing instead of a pure cost center.

```
   Researcher runs a tool (metered credits)  ──┐
            │ produces an output                │
            ▼                                    │
   Output registered as a CITABLE canon artifact│ tool-run revenue
   (small premium; real DOI via Zenodo +         │ funds compute + sustaining
    canonical_url; no blockchain)               │
            │                                    │
            ▼                                    │
   Paper cites the artifact over x402           │
   (paid-to-cite, $0.002–0.010/call)  ──────────┘
            │ citation fees route to the author (Bucket's thesis)
            ▼
   Cited artifacts rank higher in LabBrain RAG  ──┐
            │ more useful tool → more runs        │  ← reinforcing loop
            ▼                                      │
   More researchers run the tool  ────────────────┘
```

**Why each arrow is real money / real pull:**
1. **Tool-run → citable artifact.** A reproducible, version-pinned, DOI-bearing run is *more valuable in a paper* than an ad-hoc Colab notebook. Researchers pay a small premium for the DOI registration (via Zenodo; no blockchain) because it makes their methods section bulletproof and reproducible. This converts free-OSS-model output into a *citable* asset, the one thing ColabFold-in-a-notebook can't give them.
2. **Citable artifact → paid-to-cite revenue.** Bucket's existing free-to-read / paid-to-cite canon over x402 now has a *supply engine*: every tool run is a candidate citation. Citation fees route to authors (the foundation's mission), with a protocol cut sustaining the platform.
3. **Citations → better RAG.** LabBrain's literature-RAG ranks canon artifacts;-cited tool outputs surface more, making the cheapest tool (LabBrain) more useful, pulling more users into the metered funnel.
4. **Compute-cost coupling.** Tool-run credits *fund the GPU bill* directly (cost-recovery), so the flywheel is solvent at every turn, we never subsidize compute out of nothing.

This is the same supply-side bootstrap as feed402's thesis (x402 has middleware but no merchants): **Bucket's research tools are the merchants, and their outputs are the inventory.**

---

## 6. The early-adopter wedge

> **Wedge = LabBrain (free/cheap RAG front door) + TrajMine and CryoTriage (the two highest-demand, demonstrable GPU tools) sold metered to the ~50-150 most computational, grant-funded MD / protein-structure / cryo-EM labs in our A+/A advisor tier, landed through the PhD-application + advisor-outreach funnel, then expanded lab → institution.**

**Why these,:**
- **LabBrain is the wedge's nose.** Cheapest to run (~$0.12), zero GPU risk, beats the personal-tool price anchor, and is the citation-generator that feeds the flywheel. Give it away generously. It is the "chat-kruse cold-email weapon" / co-scientist from the strategy report.
- **TrajMine is the strategy report's #1 lead bet** (demand-score 10, maps to 6 open positions; "build it, run it on an A+ MD advisor's own trajectory, attach the 1-page report as the cold-email flash"). It is GPU-heavy → real metered revenue per run.
- **CryoTriage rides the cleanest paid-commercial precedent (CryoSPARC).** Cryo-EM is the densest "free-academia + paid-commercial" market, and CryoSPARC is *free* to academics ([CryoSPARC licensing](https://guide.cryosparc.com/licensing)), so we do NOT compete on the academic model; we compete on metered convenience + reproducible/citable QC sessions and let the commercial path mature into the institutional tier.
- **The 581 A+/A labs** are the seedbed; the **425 rising stars** are the ideal first buyers (less entrenched, more compute-native, hungry for an edge). Concentrate on US (1,657) + DE/GB/NL/CH/SE EU-direct labs that the outreach funnel already targets.

**Year-1 SOM target:** convert **30-60 paying labs** (out of the A+/A seedbed) at ~$1-3K/yr metered + sustaining = **$50-150K/yr recurring**, plus citation-fee tail. That fully cost-recovers platform compute and seeds the institutional pipeline for Year 2.

---

## 7. Risks

| Risk | Severity | Why it's real | Mitigation |
|---|---|---|---|
| **Academics are price-sensitive** | High | Reflex willingness-to-pay personally is $0-20/mo (Elicit/SciSpace/Scite). Many will balk at *any* per-run charge on principle. | Generous free tier; price the front-door tools near-free; frame ALL paid use as grant-funded compute, never as personal SaaS. |
| **Free open-source models eat the value** | High | AlphaFold, ColabFold (~1,000 structures/day/GPU), RFdiffusion, Boltz-1 are free; a competent postdoc can self-host. The model is never the moat. | Never sell the model. Sell serving + orchestration + RAG-over-their-corpus + *reproducible, citable run records*. The flywheel (§5) is the moat. |
| **Free academic licenses from incumbents** | High | CryoSPARC, Rosetta, Benchling Academic are all **free to academics** ([CryoSPARC](https://guide.cryosparc.com/licensing), [Rosetta FAQ](https://rosettacommons.org/software/licensing-faq/), [Benchling](https://www.scispot.com/blog/the-complete-guide-to-benchling-pricing-plans-costs-and-alternatives-for-biotech-research)). We can't undercut free. | Compete on (a) tools incumbents *don't* offer (agentic RAG, ΔΔG-as-a-service, MD mining), (b) zero-setup metered convenience vs self-hosting GPU, (c) citability. Don't fight CryoSPARC on cryo-EM reconstruction; win on triage + reproducibility. |
| **Nonprofit constraints on pricing** | Medium | Must price at cost-recovery; can't accumulate "profit"; surplus on internal recharge must rebate ([NOT-OD-13-053](https://grants.nih.gov/grants/guide/notice-files/not-od-13-053.html)). Limits margin and reserves. | This is a *feature*, and our most credible selling point. Sustaining fee (25-40% over compute) is allowable overhead recovery; route citation fees to authors per mission. Keep a published cost formula. |
| **Long institutional sales cycles** | Medium | Site licenses take 6-18 mo; F&A/recharge approval is slow. | Don't lead with institutional. Land individual labs metered (self-serve, no sales), expand to institution only after 3+ labs are live. |
| **Grant-budget timing & approval friction** | Medium | "General-purpose computing" can be pushed to indirect costs ([NIH 7.9](https://grants.nih.gov/grants/policy/nihgps/html5/section_7/7.9_allowability_of_costs_activities.htm)); a PI may not have a clean line for our charge. | Provide a one-line budget-justification template ("metered scientific computing, primarily used in the conduct of this project"). Make invoices/receipts grant-audit-clean. |
| **x402/Base + crypto-rail friction for academics** | Medium-High | Most PIs will not touch a wallet; university procurement won't pay in crypto. | Viatika's Stripe↔x402 bridge is essential, researchers pay by card/invoice in USD; x402 settlement is invisible plumbing. Never expose the wallet to the buyer. |
| **Compute-cost underpricing (GPU tools)** | Medium | A flat fee on TrajMine/CryoTriage can lose money on large jobs. | Meter GPU-seconds + GB for the heavy four; flat anchors are illustrative only. Alert when a run's real cost exceeds its charged credits. |
| **Reproducibility/scientific-trust bar** | Medium | If a tool's output is wrong, citability turns into a liability. | Version-pin everything; publish methods; only register/DOI citable artifacts from validated tool versions. |

---

## Appendix: comparable pricing landscape

| Comparable | Academic | Commercial | Model takeaway for us |
|---|---|---|---|
| **CryoSPARC** | Free (non-profit research) | Contact sales, opaque | Freemium; commercial is the money. We meter convenience and leave the model free. |
| **Rosetta / RosettaCommons** | Free | Annual fee by global FTE count (not seats); ramp fee for >200-FTE firms | Don't price by seat; price by usage/scale. |
| **Benchling** | Free Academic | ~$20K/yr (5-seat min); startups $15K; enterprise multi-$M | The seat-SaaS path we explicitly reject as *primary*. |
| **Schrödinger / Maestro** | Academic site license (quote) | Custom enterprise quote; courses $140-825 | Opaque, sales-led. Our self-serve metered model is the anti-pattern advantage. |
| **Elicit** | $10-12/mo (12k credits); Inst. Custom | Enterprise custom | Sets the *personal* price anchor; LabBrain must beat it per-use. |
| **SciSpace** | Free basic; $20/mo premium; $18/user/mo labs | - | Per-user lab pricing anchor for our lab tier. |
| **Scite** | $12/mo personal; inst. Enterprise | - | Personal anchor; citation-analysis adjacency to our cite flywheel. |
| **Cloud GPU (H100)** | - | $2-4/GPU-hr (specialized), ~$3 GCP, per-sec billing | The literal cost floor for our GPU-heavy four. |
| **NIH core facility** | Cost-recovery recharge; surplus rebated | - | The mental model our whole pricing imitates. |

Sources: [CryoSPARC licensing](https://guide.cryosparc.com/licensing) · [Rosetta licensing FAQ](https://rosettacommons.org/software/licensing-faq/) · [Benchling pricing (Scispot)](https://www.scispot.com/blog/the-complete-guide-to-benchling-pricing-plans-costs-and-alternatives-for-biotech-research) · [Schrödinger academic](https://www.schrodinger.com/life-science/use-cases/academics/) · [Elicit pricing](https://elicit.com/pricing) · [SciSpace/Elicit comparison](https://paperguide.ai/blog/elicit-vs-scispace/) · [Scite review](https://elephas.app/blog/scite-ai-review) · [GPU pricing (Spheron)](https://www.spheron.network/blog/gpu-cloud-pricing-comparison-2026/) · [GPU pricing (CloudZero)](https://www.cloudzero.com/blog/cloud-gpu-pricing-comparison/) · [NIH core-facility costing](https://grants.nih.gov/grants/guide/notice-files/not-od-13-053.html) · [NIH allowable costs 7.9](https://grants.nih.gov/grants/policy/nihgps/html5/section_7/7.9_allowability_of_costs_activities.htm) · [ColabFold (Nature Methods)](https://www.nature.com/articles/s41592-022-01488-1) · [Boltz-1 (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11601547/)
