# NOAA Saltonstall-Kennedy FY26 Pre-Proposal — DerbyFish / Kala (AGFarms LLC)

**Status:** DRAFT v0.1 (2026-05-04). Bead: `derbyfish-4lb`. NOFO expected to open August 2026; this draft is positioned to be tightened and submitted within 2 weeks of NOFO release.

---

## ☐ FOUNDER TODO BEFORE SUBMIT

**Single highest-leverage item:**
- [ ] **Cultivate at least one NOAA Fisheries scientist as a named project partner with a letter of support.** Tracked in bead `bkt-z9o` (NOAA scientist cultivation). Target offices: NOAA Fisheries Northeast Regional Office (Greater Atlantic / NJ — striped bass, summer flounder, black sea bass) and/or NOAA Fisheries Southeast Regional Office (FL — red drum, snapper-grouper complex). Without this letter, the application drops from "competitive" to "long shot." With it, the application has direct line-of-sight to a stock assessment use-case and a near-guaranteed invitation to submit the full proposal.

**Registration / compliance (4–8 week lead time — start NOW):**
- [ ] **SAM.gov registration for AGFarms LLC** (UEI assignment, ~4–6 weeks). Required.
- [ ] **Grants.gov account** linked to AGFarms LLC SAM record.
- [ ] **NOAA Grants Online (eGrants)** account.
- [ ] **AGFarms LLC EIN** confirmed and on file (likely already done — verify).
- [ ] **Indirect cost rate decision**: negotiate or use **de minimis 10% MTDC** (recommended for Phase I — far simpler).
- [ ] **DUNS retired** — UEI replaces it. Verify SAM record is post-2022.

**Content prep:**
- [ ] **Confirm FY26 S-K topic priorities** when NOFO drops on Grants.gov (typically late Aug). Re-tune Section 3 to match the year's priority list verbatim.
- [ ] **Pick ONE primary species + region** for the Phase I deployment. Recommended: **striped bass, Mid-Atlantic (NJ/NY/MA)** — high recreational pressure, active stock assessment cycle, MRIP coverage region, DerbyFish has user base. Backup: red drum, FL Atlantic.
- [ ] **Pull live DerbyFish metrics** for Section 4 (MAU, total catches logged YTD, # tournaments run, # validated catches via BHRV). Replace `[FOUNDER: METRIC]` placeholders.
- [ ] **Produce a Phase I budget** at the chosen ask band ($250K–$300K recommended). Line items: 1.0 FTE engineering, 0.4 FTE biologist consultant, hardware/sensor kits for partner anglers, regional travel, outreach, indirect.
- [ ] **Letters of support — minimum three:**
  - [ ] NOAA Fisheries scientist (regional office) — **required de-risker**
  - [ ] Captain / fishing club / tournament organizer in target region
  - [ ] Stock assessment academic (e.g., Rutgers Marine, UMass Dartmouth SMAST, U. Miami RSMAS)
- [ ] **Data Sharing Plan** (1 page) — required attachment. Describe VDS → NOAA pipeline, formats (NetCDF? CSV? MRIP-compatible schema?), open licensing.
- [ ] **Confirm Magnuson-Stevens citation** in Section 3 maps to the chosen species' active FMP.

**Strategic:**
- [ ] **Decide regional anchor** before drafting full proposal. Pre-proposal can be region-agnostic; full proposal cannot.
- [ ] **Pre-brief NOAA program officer.** S-K program officer contact lives on the NOFO. A 20-minute pre-call before submission is standard practice and worth the time.
- [ ] **Decide whether to apply as "Science or Technology that Enhances Sustainable U.S. Fisheries" priority** (recommended) vs. "Development, Infrastructure, and Capacity Building." The S/T priority has historically funded fewer but larger awards — better fit for our mid-range ask.

---

# NOAA Saltonstall-Kennedy Pre-Proposal — FY26 Cycle

**Applicant:** AGFarms LLC (Delaware, for-profit) · UEI [[FOUNDER: assigned by SAM.gov — pending registration]]
**Project title:** *Verified Data Sessions for Recreational Catch Records: Sensor-Grade Citizen-Science Inputs to Federal Stock Assessments*
**S-K topic priority:** Science or Technology that Enhances Sustainable U.S. Fisheries [[FOUNDER: confirm against FY26 NOFO when posted, expected Aug 2026]]
**Region:** [[FOUNDER: pick — recommend Mid-Atlantic (NJ/NY/MA), striped bass; backup FL Atlantic, red drum]]
**Total ask:** $275,000 [[FOUNDER: confirm band — recommend $250K–$300K; under cap, signals discipline]]
**Period of performance:** 12 months
**Project lead:** Gianangelo Dichio (Co-Founder, AGFarms LLC). Co-investigator: Anthony Tedesco (Co-Founder/CTO).
**Named federal partner:** [[FOUNDER: NOAA Fisheries scientist — bead bkt-z9o]]

---

## 1. Project Summary (300 words)

Federal recreational fisheries data — collected primarily through NOAA's Marine Recreational Information Program (MRIP) — is acknowledged across NOAA Fisheries, the National Academies, and recent independent peer review (CIE 2025) to suffer from recall bias, telescoping error, non-response bias, and small effective sample sizes. These limitations propagate directly into stock assessments for high-value recreational species, including striped bass, summer flounder, red drum, and the South Atlantic snapper-grouper complex. NOAA has invested heavily in survey-design improvements, but the underlying data-collection modality — angler self-report, recalled days or weeks after the trip — has structural ceilings that survey re-design cannot exceed.

This project deploys **Verified Data Sessions (VDS)** — wallet-signed, sensor-grade mobile catch records — as a complementary data stream to MRIP. VDS uses the **Bump–Hero–Release–Validate (BHRV)** capture workflow already shipping in DerbyFish, AGFarms LLC's competitive fishing platform: a scripted sensor session that timestamps the encounter, locks GPS, photographs the fish on a calibrated bump board, and cross-validates length, species, and release status before signing the record with the angler's cryptographic key. The result is a deduplicated, length-validated, geo-attested catch record produced in real time — not recalled.

Phase I will (1) deploy VDS to ~500 partner recreational anglers in the [[FOUNDER: chosen region]], (2) generate ~10,000 sensor-verified catch records on [[FOUNDER: target species]] over 12 months, (3) deliver records to a named NOAA Fisheries partner in MRIP-compatible formats, and (4) publish a methods paper comparing VDS catch-rate and length-frequency distributions against the MRIP estimates for the same stratum and period.

The output is not a replacement for MRIP — it is **a high-fidelity supplemental stream** that NOAA stock assessors can use to triangulate, calibrate, or correct survey-based estimates. The marginal cost to NOAA is zero; the data pipeline is built and operational.

## 2. Project Description (~700 words / 1.5 pages)

**The data-quality problem.** MRIP's Fishing Effort Survey (FES) asks households to recall cumulative saltwater fishing effort over the prior two months (recently reduced to monthly). The Access Point Angler Intercept Survey (APAIS) catches anglers in person but covers a small fraction of trips. The 2017 National Academies review and the 2025 CIE peer review both flagged recall error, telescoping, non-response, and coverage gaps as persistent structural limitations. NOAA Fisheries has responded with redesigned survey instruments, but acknowledges in its own response documents that the modality has limits. **No federal data stream presently delivers sensor-verified, real-time, individually-attributable catch records at scale for recreational anglers.**

**The instrument.** DerbyFish is a recreational fishing platform shipping in production since [[FOUNDER: launch date]]. Its native iOS/Android app implements the BHRV capture workflow:
- **Bump** — fish placed on a calibrated bump board; mobile camera captures with sensor metadata (accelerometer, gyroscope, GPS, timestamp, ambient lux, magnetometer).
- **Hero** — angler photo with the fish, geo- and time-attested.
- **Release** — release-shot or harvest declaration recorded.
- **Validate** — on-device computer-vision length measurement against the calibrated board, species classification, and cross-step consistency rules. Records that fail validation are flagged or rejected.

The validated record is signed with the angler's wallet key and posted to a verifiable data session log. The full schema is published as part of the open-source **feed402** data protocol (`derbyfish.bhrv.v2`), which AGFarms maintains. Records are citation-grade by construction: tamper-evident, deduplicated, length-truthed, and source-attributed.

**Phase I deliverables (12 months).**

1. **Partner-angler deployment.** Recruit and onboard ~500 recreational anglers in [[FOUNDER: chosen region]], with a target cohort spanning shore, private-boat, and for-hire modes. Distribute calibrated bump boards (~$15 each) and onboarding kits.
2. **Sensor-verified catch records.** Generate ≥10,000 BHRV-validated catch records on [[FOUNDER: target species]] across the 12-month period, with a target ≥80% trip-coverage rate among enrolled anglers.
3. **MRIP-compatible delivery pipeline.** Co-design with our named NOAA Fisheries partner the schema, transport, and cadence for delivery into the MRIP analytical workflow. Records will be packaged in NOAA-standard formats and delivered monthly. Open-licensed (CC-BY) for redistribution.
4. **Comparative methods paper.** Co-author with the NOAA partner and an academic stock-assessment scientist a peer-reviewed manuscript comparing VDS- and MRIP-derived catch-per-unit-effort and length-frequency distributions for the target stratum.
5. **Open spec maintenance.** Publish the BHRV/VDS protocol revision (`derbyfish.bhrv.v3`) as part of feed402 so any other operator — state agencies, tournament series, citizen-science programs — can produce interoperable records.

**Why this project, why now.** DerbyFish is a shipping product with [[FOUNDER: MAU]] active anglers and [[FOUNDER: catches logged YTD]] catch records logged year-to-date. The capture pipeline is built. What this grant funds is the **scientific instrumentation layer** — the partner-angler cohort, the NOAA-side integration, and the comparative analysis that turns a consumer product into a federal data infrastructure asset. The marginal cost per additional record approaches zero; Phase I funds the one-time integration cost.

**Risks.** (1) Angler retention — mitigated by tournament/leaderboard incentives already operating in the platform. (2) Species mis-classification — mitigated by on-device CV plus angler self-attestation, with random-sample ground-truth review. (3) NOAA integration friction — mitigated by named federal partner and pre-submission program-officer brief.

## 3. Federal Fishery Management Relevance (300 words)

This project directly serves NOAA Fisheries' statutory mandate under the **Magnuson-Stevens Fishery Conservation and Management Act** (16 U.S.C. §§ 1801 et seq.), specifically National Standard 2 ("conservation and management measures shall be based upon the best scientific information available"). Recreational catch data is a documented weak link in the BSIA chain for several federally managed species. The 2017 National Academies report *Review of the Marine Recreational Information Program* and the 2025 CIE peer review of the FES both identified recall bias and survey-modality limitations as material risks to assessment quality.

VDS records are a **best-scientific-information-available enhancement** for the following near-term federal assessment use cases:

- **Striped bass** (Atlantic States Marine Fisheries Commission cooperative management) — recreational sector dominates removals; CPUE and length-frequency distributions are highly leveraged.
- **Summer flounder, scup, black sea bass** (Mid-Atlantic Fishery Management Council) — recreational allocation disputes hinge on MRIP precision.
- **Red drum, snapper-grouper complex** (South Atlantic FMC / FL FWC) — high recreational pressure, contested stock status.

VDS does not seek to displace MRIP; it provides a sensor-truthed parallel stream that stock assessors can use as a calibration check, a high-precision sub-sample, or an early-warning signal for catch-composition shifts. The data pipeline is also directly responsive to NOAA's recreational-fishing-data modernization priorities articulated in the *NOAA Fisheries Recreational Fishing Action Agenda* and aligns with electronic-monitoring/electronic-reporting (EM/ER) directions that NOAA has co-funded with NFWF since 2024.

The S-K priority "Science or Technology that Enhances Sustainable U.S. Fisheries" maps to this project precisely: **technology** (sensor-grade mobile data capture, cryptographic attestation), applied to **science** (stock-assessment input data quality), in service of **sustainability** (more accurate assessments → better-calibrated catch limits → reduced over- and under-fishing risk).

## 4. Team & Capabilities (250 words)

**AGFarms LLC** (Delaware, for-profit, est. [[FOUNDER: year]]) is a venture studio operating 16+ properties under one roof, with a published portfolio dashboard and shipping products in fisheries (DerbyFish), wellness, e-commerce, and SaaS. AGFarms is self-funded and pre-revenue at the studio level; DerbyFish is the venture with paying-user revenue potential and has been in active production since [[FOUNDER: launch]]. AGFarms maintains its own infrastructure stack (Hetzner CPX42, K3s, Cloudflare DNS), CI/CD, and a 28-connector data platform (Nucleus Brain) that handles cross-venture observability.

**DerbyFish** [[FOUNDER: MAU, total catches logged, # tournaments operated, # BHRV-validated records to date — pull from analytics]]. DerbyFish ships a native mobile app (iOS + Android), a web platform (derby.fish, fishdex.net), an API, a captain-facing tournament tool, and a data warehouse. The BHRV/VDS capture workflow is in production today; the protocol is published open-source in the **feed402** data-standard repository.

**Project lead — Gianangelo Dichio** (Co-Founder, AGFarms LLC). Author of the feed402 protocol and the x402-research-gateway (live paid research API on Base Sepolia, 7 endpoints across PubMed, Semantic Scholar, OpenAlex, ClinicalTrials, PubChem). Software/protocol architect background.

**Co-investigator — Anthony Tedesco** (Co-Founder/CTO, AGFarms LLC; github.com/anthonybtedesco). Mobile and infrastructure lead for DerbyFish.

**Federal partner —** [[FOUNDER: NOAA Fisheries scientist, regional office, bead bkt-z9o]] *(letter of support attached)*.

**Academic partner —** [[FOUNDER: stock-assessment academic — Rutgers Marine, UMass SMAST, or U. Miami RSMAS recommended]] *(letter of support attached)*.

## 5. Budget Summary (200 words)

**Total federal request: $275,000** over 12 months [[FOUNDER: confirm]]. No cost share required for S-K but ~10% in-kind contribution from AGFarms (existing DerbyFish platform engineering) is documented in the full-proposal budget narrative.

| Category | Year 1 |
|---|---|
| **Personnel** — 1.0 FTE engineering (integration, MRIP-format pipeline, partner-angler tooling); 0.4 FTE biologist/data-science consultant; 0.1 FTE PI | ~$155,000 |
| **Fringe** — at federally negotiated rate or de minimis | ~$15,000 |
| **Equipment & supplies** — calibrated bump boards (~500 × $15), onboarding kits, sensor calibration jigs | ~$15,000 |
| **Travel** — regional deployment (3 trips), NOAA partner meetings (2 trips), one conference (AFS or ASMFC) | ~$12,000 |
| **Subaward** — academic partner (length-frequency comparative analysis, co-authorship on methods paper) | ~$30,000 |
| **Contractual** — angler-cohort outreach via regional fishing club / captain network | ~$15,000 |
| **Other direct** — data hosting, CI, open-licensing | ~$8,000 |
| **Indirect** — de minimis 10% MTDC | ~$25,000 |
| **TOTAL** | **~$275,000** |

[[FOUNDER: full SF-424A and budget narrative produced for full proposal phase only — pre-proposal requires summary level]].

## 6. Letters of Support

The following letters will be solicited and attached to the pre-proposal (and re-confirmed for the full proposal):

1. **[[FOUNDER: NOAA Fisheries scientist, regional office]]** — required, highest-leverage. Cultivation tracked in bead `bkt-z9o`. Without this letter, application probability of invitation drops sharply.
2. **[[FOUNDER: Captain / tournament organizer / fishing club president]]** — regional partner-angler recruitment lead. Demonstrates community uptake.
3. **[[FOUNDER: Stock-assessment academic]]** — co-investigator on the comparative methods paper. Demonstrates scientific co-design.

[[FOUNDER: solicit minimum 3, accept up to 5 if available — quality > quantity. NOAA scientist letter is non-negotiable.]]

---

## Sources & References (for full-proposal citations)

- NOAA Fisheries, *Saltonstall-Kennedy Grant Competition*, https://www.fisheries.noaa.gov/grant/saltonstall-kennedy-grant-competition
- NOAA Fisheries, *Marine Recreational Information Program Research*, https://www.fisheries.noaa.gov/recreational-fishing-data/marine-recreational-information-program-research
- NOAA Fisheries, *Fishing Effort Survey Research and Improvements*, https://www.fisheries.noaa.gov/recreational-fishing-data/fishing-effort-survey-research-and-improvements
- NOAA Fisheries (2026), *Response to the 2025 CIE Peer Review of the FES Design*, https://www.fisheries.noaa.gov/s3//2026-02/Revised-FES-Design_NMFS-Overview-Response-to-CIE-Reviewsa-508.pdf
- National Academies (2017), *Review of the Marine Recreational Information Program*, https://www.nationalacademies.org/read/24640/
- Congressional Research Service, *Saltonstall-Kennedy Act: Background and Issues*, R46335, https://www.congress.gov/crs-product/R46335
- 2024 S-K awards announcement: https://www.fisheries.noaa.gov/feature-story/noaa-announces-projects-recommended-saltonstall-kennedy-funding
- feed402 protocol spec (Gian Dichio, AGFarms LLC) — `derbyfish.bhrv.v2` reference implementation in §3.1

---

*Draft prepared 2026-05-04 by the Revenue pillar of the AGFarms / Bucket Foundation workflow under bead `derbyfish-4lb`. NOFO expected to open August 2026; this draft to be re-tightened against the FY26 priority list within 2 weeks of NOFO release. The single highest-leverage prep item is the NOAA Fisheries scientist letter of support — see bead `bkt-z9o`.*
