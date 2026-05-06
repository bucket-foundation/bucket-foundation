## ☐ FOUNDER TODO BEFORE SUBMIT

- [ ] **SAM.gov registration for AGFarms LLC** — start immediately (4–8 wk turnaround). Required for any federal money. Pull EIN from ops vault before starting.
- [ ] **AGFarms LLC EIN** — locate in ops vault (Delaware filing) and paste into the header below; SAM will require it.
- [ ] **UEI** — assigned by SAM upon registration completion; replace `[[FOUNDER: pull from SAM after registration]]` in header.
- [ ] **NSF Research.gov account** — create org account under AGFarms LLC; designate Gianangelo Dichio as Authorized Organizational Representative (AOR) and Principal Investigator (PI). Anthony Tedesco as co-PI/CTO.
- [ ] **One-page biosketches** for Gian (PI) + Anthony (co-PI) in NSF format (NSF-approved fillable PDF, not NIH).
- [ ] **Topic-area code decision** — recommended primary: **Distributed Ledger Technologies (DLT)**; secondary fit: **Internet of Things (IoT) / Sensors**, **Artificial Intelligence (AI)**. Confirm exact 2026 topic taxonomy at seedfund.nsf.gov/topics before submission.
- [ ] **Target submission date**: target window **mid-June 2026** (rolling Project Pitch model; 3-week NSF turnaround → invitation to full proposal in early July, full proposal due ~6 weeks after invitation).
- [ ] **Letter-of-support cultivation** (not required for pitch, required for full proposal): one NOAA Fisheries scientist (regional NJ or FL stock-assessment lead) or a state F&W recreational-fisheries biologist. Begin outreach now.
- [ ] **Confirm small-business eligibility self-certification**: AGFarms LLC must be >50% US-owned, ≤500 employees, principal place of business in US. All three trivially true.
- [ ] **Verify program is active** — NSF temporarily paused new Project Pitch submissions during the FY26 reauthorization lapse; confirm reopen status at seedfund.nsf.gov before pressing submit.
- [ ] **DerbyFish iOS `NSMotionUsageDescription`** — required for IMU capture under iOS 17+; tracked as cross-venture `dbt-` bead. Must be live on the App Store before Phase I kickoff.
- [ ] **Pick 1–2 named target species** (recommended: striped bass *Morone saxatilis* on the Atlantic coast; red drum *Sciaenops ocellatus* on the Gulf/SE coast) and confirm both are under active NOAA stock assessment so the data-utility claim in §3 is concrete and reviewable.

---

# NSF SBIR Phase I Project Pitch

**Applicant:** AGFarms LLC (Delaware) · UEI [[FOUNDER: pull from SAM after registration]] · EIN [[FOUNDER: pull from ops vault]]
**Project title:** Verified Data Sessions (VDS): a wallet-signed sensor-attested mobile-capture protocol for citation-grade citizen-science fisheries data
**Topic area:** Distributed Ledger Technologies (DLT) — primary; IoT/Sensor Systems — secondary [[FOUNDER: confirm 2026 topic codes at seedfund.nsf.gov/topics]]
**Submitted:** [[FOUNDER: target mid-June 2026]]
**Phase I award requested:** $305,000 over 12 months (inclusive of $25,000 NSF I-Corps allocation and up to $6,500 TABA)
**PI:** Gianangelo Dichio, Founder · **Co-PI / CTO:** Anthony B. Tedesco

---

## 1. Technology Innovation

We propose to develop and validate **Verified Data Sessions (VDS)** — a wallet-signed, sensor-attested, mobile-capture protocol that produces tamper-evident, cryptographically citeable scientific records from a consumer smartphone. The reference instantiation, **BHRV (Bump → Hero → Release → Validate)**, is a four-step capture flow used by anglers in DerbyFish, our competitive sport-fishing platform: the angler bumps the fish against a reference object of known length, captures a hero photo, releases the fish on camera, and the device emits a signed validation bundle containing the IMU trace, GPS track, frame-accurate timestamps, sensor-fusion confidence scores, and a SHA-256 commitment to the raw video. The bundle is signed by a per-device wallet on the Base network and is independently verifiable against on-chain anchors and a public verifier ruleset.

The innovation is not any single component — wallet signatures, IMU traces, and computer-vision length estimation each exist in the literature — but the **end-to-end binding of physical-world capture to a portable, machine-readable, cryptographically attested record** that downstream consumers (federal stock assessors, regulators, insurers, scientists) can verify without trusting the capturing party. VDS treats *capture itself* as the unit of verification, not the storage layer or the analytics layer. Cross-step consistency rules — IMU continuity across Bump→Hero→Release, GPS plausibility, timestamp monotonicity, frame-hash chaining, sensor-fusion confidence thresholds — are enforced at session close and recorded in the verifier-findings field of the signed bundle. A record that fails any consistency check is still emitted, but is emitted *with the failure stamped into it*, preserving evidentiary integrity rather than silently dropping data.

VDS is the first non-`source` citation type defined in the open-source **feed402** data protocol (`SPEC.md §3.1`), an MIT-licensed extension point for citation-grade machine-readable scientific records over the x402 micropayment rail on Base. DerbyFish BHRV is named in the spec as the canonical reference implementation, shipping as `derbyfish.bhrv.v2`. Because the bundle format is open and the verifier ruleset is open, any third-party scientist or regulator can re-verify a VDS record years after capture without any dependency on AGFarms LLC, on DerbyFish servers, or on any centralized API. This is a structurally different trust model from existing recreational-catch reporting systems (NOAA MRIP angler-survey self-report, state-level harvest cards, app-based logbooks like Fishbrain or iAngler) which all require trusting either the angler's recall or the operator's database.

The patentable surface is the **cross-step consistency-rule engine and the binding of the wallet signature to the sensor-fusion trace**, not the cryptographic primitives. The defensibility is twofold: (1) the integration cost — building a working capture-and-verify loop across iOS IMU APIs, Base wallet signing, and an open verifier — is a 12–18 month engineering effort that data-collection NGOs and incumbent fisheries-app operators are not staffed to undertake; (2) the network effect — a verifier ruleset only becomes a regulatory standard once enough records and verifiers exist, which we are positioned to bootstrap through the existing DerbyFish tournament base (multiple thousands of recorded sessions to date, growing weekly).

The Phase I question this Project Pitch poses is narrow and falsifiable: *can a wallet-signed VDS bundle, captured by a non-expert angler on consumer hardware, produce a fish-length estimate whose error distribution is statistically indistinguishable from a trained biologist's measurement under controlled and field conditions, and can the verifier independently reject adversarial captures (spoofed IMU, replayed video, GPS injection) at a stated false-accept rate?*

## 2. Technical Objectives & Challenges (Phase I scope)

The 12-month Phase I program has four milestones, each with a quantitative pass/fail gate:

**Objective 1 — VDS protocol v1.0 freeze and reference verifier (months 1–3).** Finalize the bundle schema (IMU sample rate, frame-hash cadence, GPS resolution, signature scheme, cross-step consistency rules), publish as an MIT-licensed extension to the feed402 SPEC, and ship an open-source TypeScript verifier that consumes a bundle and emits a structured findings report. *Gate:* spec frozen, verifier passes a published test-vector suite of 200 synthetic bundles (50 valid, 50 with each of three named adversarial perturbations).

**Objective 2 — Length-estimation accuracy validation (months 2–6).** Conduct a controlled study against ground-truth measurement: 300 captures of known-length reference objects (calibrated rods, 10–60 cm), then 300 captures of live fish in cooperation with a state F&W or NOAA biologist, with biologist-measured fork length as ground truth. *Gate:* mean absolute error ≤ 5% of fork length on the live-fish set; 95th-percentile error ≤ 10%; estimator behavior characterized across species, water clarity, and lighting. *Risk:* underwater-refraction and pose-error effects on monocular length estimation; *mitigation:* the bump-against-reference step is specifically designed to remove monocular ambiguity and is what differentiates BHRV from prior CV-only fish-length systems.

**Objective 3 — Adversarial-capture robustness (months 4–8).** Red-team the verifier against six named attack classes: (a) replayed video from prior session, (b) IMU trace injection from a non-co-located device, (c) GPS spoofing, (d) photo-of-a-photo bump step, (e) clone-stamped time injection, (f) collusion between two devices. *Gate:* false-accept rate ≤ 1% on each attack class at a fixed false-reject rate of ≤ 5% on legitimate captures. *Risk:* the (d) photo-of-a-photo attack is the hardest; *mitigation:* parallax check on the bump-step IMU trace plus a forced live-release step that closes a video-continuity loop.

**Objective 4 — Regulator-facing data product (months 7–12).** Deliver a NOAA-facing read endpoint that exposes verified, anonymized, species-tagged catch records to designated stock-assessment scientists at no cost (recreational catch is a public good; we sell verification, not the data itself). *Gate:* one named NOAA Fisheries or state F&W stock-assessment scientist signs off that the data product, for one named species (target: striped bass *Morone saxatilis*), would be admissible as a supplementary input to the next assessment cycle. *Risk:* the sign-off is the entire Phase I commercial-validation deliverable; *mitigation:* letter-of-support cultivation begins immediately and is a prerequisite for the Phase II proposal.

A dedicated I-Corps cohort during months 3–6 will be used to conduct customer-discovery interviews across federal stock assessors, regional fishery management council staff, state F&W recreational-fisheries managers, and adjacent verticals (fisheries observers, recreational charter compliance, sport-fishing insurance). The discovery output directly informs the Phase II commercialization plan.

## 3. Market Opportunity

The immediate market is **federal and state recreational-fisheries data infrastructure**. NOAA Fisheries' Marine Recreational Information Program (MRIP) is the federal-state-regional partnership responsible for estimating recreational catch and effort for U.S. saltwater fisheries; MRIP estimates are statutory inputs to stock assessments under the Magnuson-Stevens Act. The underlying data collection is dominated by the Access Point Angler Intercept Survey and the Fishing Effort Survey — both phone- and dock-side self-report instruments whose precision is acknowledged-noisy and whose sample sizes are small relative to the 200+ million annual recreational saltwater fishing trips they are designed to characterize. Recreational fishing in the U.S. supports roughly **694,000 jobs and generates approximately $145 billion in annual sales impacts and $78 billion in value-added impact** (NOAA Fisheries, 2023 Fisheries Economics report). The federal-and-state spend on recreational catch-data collection across MRIP, NOAA Sea Grant, and state F&W programs is on the order of **$30–50M annually** [[FOUNDER: confirm exact figure from NOAA FY26 budget request before final submission]] — a meaningful but constrained budget against the size of the activity it covers.

VDS is positioned as a **per-record verification rail** that complements rather than replaces MRIP: angler-side capture is free to NOAA, AGFarms monetizes verification access via a per-call x402 micropayment under the feed402 protocol ($0.005–$0.05 per record depending on tier), and the data itself remains an open public good. At current DerbyFish capture volume (low-thousands of sessions/month, growing) a 1% conversion of recreational saltwater trips to VDS-attested captures would represent ~2M records/year and a SAM of $10–100M annually in verification fees alone — and that is before adjacent verticals.

Adjacent verticals widen the TAM substantially:
- **Sport-fishing insurance and tournament integrity**: ~$1B+ U.S. tournament prize-pool market, presently policed by polygraph (yes, literally polygraphs at tournament weigh-ins).
- **Regulatory compliance for charter and commercial operators**: NOAA Electronic Monitoring and Reporting investments approaching ~$3.4M/yr in NFWF-administered grants alone.
- **Insurance claims with mobile-capture evidence** (auto, property, agriculture, livestock): a multi-billion-dollar mobile-evidence-of-loss market currently served by Snap-style apps with no cryptographic attestation.
- **Citizen-science environmental monitoring** (water quality, invasive species, wildlife counts): NSF, EPA, and NOAA fund this aggregate at >$100M/yr.

The fisheries beachhead is the wedge; the long-run market is **any high-trust mobile data capture where today's options are "trust the capturer" or "send a professional"**.

## 4. Company & Team

**AGFarms LLC** is a Delaware-registered, founder-owned (50/50 Gianangelo Dichio / Anthony B. Tedesco) venture studio operating 16+ active products, of which DerbyFish (the reference implementation host) is among the most commercially mature. AGFarms is self-funded, pre-revenue, and headquartered in [[FOUNDER: confirm registered office address; New Jersey for principal place of business]]. Small-business status under SBA criteria is satisfied trivially (2 employees, US-owned, single principal place of business).

**Principal Investigator: Gianangelo Dichio (Founder).** Sole canonical author of the **feed402** open-source data protocol (MIT code + CC0 spec) and of the **x402-research-gateway** (seven live x402-paid research endpoints on Base Sepolia, including PubMed, Semantic Scholar, OpenAlex, ClinicalTrials, PubChem). Architect of the BHRV/VDS protocol. Full-stack engineer; primary author of all DerbyFish backend, native, and protocol code. github.com/gianyrox.

**Co-PI / CTO: Anthony B. Tedesco.** Co-founder of AGFarms LLC. Infrastructure and platform lead; primary owner of the K3s-on-Hetzner deployment that runs the 18-instance Nucleus Brain control plane underlying DerbyFish and the rest of the AGFarms portfolio. github.com/anthonybtedesco.

**Sub-PI / Scientific Advisor (to be named in full proposal):** [[FOUNDER: identify and secure commitment from one fisheries scientist — preferred candidates: a NOAA Fisheries Northeast Regional stock-assessment lead, a NJ DEP Bureau of Marine Fisheries biologist, or a Rutgers Haskin Shellfish Research Laboratory faculty member with recreational-fisheries focus. Letter of support required for full proposal; sub-award compensation budgeted at ~$15K of Phase I.]]

**Senior Personnel — Computer Vision (to be named in full proposal):** [[FOUNDER: optional sub-award to a CV/ML consultant or PhD student for Objective 2 ground-truth study; budget reserved at ~$25K of Phase I.]]

AGFarms has no prior NSF SBIR award. AGFarms has no current federal funding and no pending federal applications other than a planned NOAA Saltonstall-Kennedy pre-proposal in August 2026.
