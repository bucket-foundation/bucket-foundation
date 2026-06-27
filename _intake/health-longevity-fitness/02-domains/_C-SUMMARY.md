# Domain C — Summary (Wave 1, 2026-06-27)

**Deliverables written:**
- `02-domains/C-genetics-omics.md` — human-readable, organized by sub-domain (GWAS, clocks, omics, microbiome, mtDNA).
- `02-domains/C-claims.json` — **25 graded claims** (schema-conformant, every claim DOI-sourced + tiered).
- `06-evidence/CONFLICTS.md` — **+5 first-class conflicts** appended (GWAS reproducibility, CETP genotype-vs-drug, which-clock-valid, microbiome cause-vs-consequence, mtDNA-mutation causality).
- `00-map/discovered-people.md` — **+26 figures** (Deelen, Sebastiani, Perls, Wallace, Trifunovic, Larsson, Prolla, Horvath, Levine, Lu, Higgins-Chen, Belsky, Lehallier, Wyss-Coray, Oh, Snyder, Ferrucci, Gladyshev, Moqri, Barzilai, Wilmanski, Gibbons, Honda, Biagi, Franceschi, Galkin).
- `00-map/discovered-concepts.md` — **+14 concepts** (clock generations, PC-clocks, proteomic waves, organ clocks, ageotypes, iAge/CXCL9, microbiome uniqueness, isoalloLCA, SCFA, heteroplasmy threshold, mutator mouse, biomarker-validation gap, lifespan heritability).

## Non-duplication
The 5 C-tagged claims already in `B-claims.json` (FOXO3, APOE, centenarian-gwas-polygenic, metformin-cohort, TAME) were **extended, not repeated**: Deelen meta-GWAS gives the actual meta result behind the polygenic-deflation; Timmers reframes lifespan genes as disease genes; Barzilai adds CETP; clocks deepen the Horvath/PhenoAge/GrimAge/DunedinPACE seeds with generation-split, head-to-head, and reliability critique.

## Claims by evidence tier (25 total)
| Tier | Count | Note |
|---|---|---|
| `meta` | 2 | Deelen longevity meta-GWAS; Chen 2016 DNAm-clock meta predicting death — **the only meta-tier claims; both are meta-analyses of OBSERVATIONAL data, not RCTs** |
| `cohort` | 8 | Timmers GWAS, Marioni DNAm-mortality, Lehallier proteomic waves, Oh organ clocks, Ahadi ageotypes, Sayed iAge, Wilmanski uniqueness, somatic-mtDNA accumulation |
| `case-control` | 2 | Sebastiani signature (+retraction), Barzilai CETP |
| `cross-sectional` | 3 | Biagi centenarian gut, Le Chatelier richness, Galkin microbiome clock |
| `mechanistic` | 6 | Bell clock consensus, Higgins-Chen PC-reliability, Wallace heteroplasmy, Sato bile acids, SCFA, Moqri validation-gap |
| `rct` | 1 | Fahy TRIIM (n=9, single-arm, GH-confounded — flagged as pilot, NOT efficacy) |
| `animal` | 3 | pan-mammalian clock, Trifunovic + Kujoth mutator mice |

## Claims by type
- `outcome` 16 · `mechanism` 9.
- **Predictor ≠ cause discipline enforced:** every clock/GWAS/omics signature is tagged as a biomarker/association in `confidence_notes`; the Moqri-2023 claim states explicitly that **no aging biomarker is yet a validated surrogate**. The one human `rct` (TRIIM) is flagged as an uncontrolled pilot near the clocks' measurement-noise floor. No claim launders an association into a demonstrated causal/interventional human longevity effect.

## Top conflicts added (all logged in CONFLICTS.md, with JSON)
1. **Longevity GWAS reproducibility** — APOE/FOXO3 real vs broad non-replication + Sebastiani 2010 retraction. `partially-resolved` (deflated).
2. **CETP genotype vs drug** — centenarian CETP variant vs failed CETP-inhibitor RCTs. `open`.
3. **Which clock is valid** — second-gen mortality prediction vs correlative/noisy/unvalidated (Bell, Higgins-Chen, Moqri). `open`.
4. **Microbiome cause vs consequence** — dysbiosis drives inflammaging vs reflects host health/diet/drugs. `open`.
5. **mtDNA-mutation causality** — mutator mouse causal vs supraphysiological-load/apoptosis-not-ROS. `open`; cross-links to the Domain-B free-radical/mitohormesis conflict.

## Canon cross-links made (UP to bucket-canon/05-biophysics)
mtDNA heteroplasmy/threshold (Wallace), mutator-mouse apoptosis-vs-ROS (ties to redox conflict), pan-mammalian methylation clock, SCFA→gut-barrier mechanism. The mtDNA-mutation-causality conflict is flagged as a live biophysics-canon question.

## Gaps for Wave 2 (priority order)
1. **Still only 2 meta + 1 (weak) rct.** No RCT moves a clock with a hard endpoint — that absence *is* the Moqri-2023 message; document it as the field's central gap.
2. **Telomere genetics depth** — TERT/TERC GWAS, Mendelian randomization showing bidirectional cancer↔longevity (only sketched in B's telomere claim).
3. **Metabolomic/lipidomic specifics** — ceramide/sphingolipid aging signatures, longevity metabolite panels (currently folded into ageotypes).
4. **Candidate-gene depth** — KLOTHO (KL-VS), IGF1R centenarian variants (Suh/Barzilai), APOC3.
5. **Microbiome causality experiments** — young→old FMT lifespan/healthspan (killifish Valenzano 2017, mice) to push the cause-vs-consequence conflict toward resolution.
6. **Single-cell mtDNA** — clonal-expansion dynamics (Wallace/Chinnery); mitochondrial donation/replacement.
7. **People carding** — push the 26 Domain-C figures to `01-people/` in the canon-figures schema.

## Provenance method
All DOIs verified via OpenAlex direct-DOI lookup (`filter=doi:`) or cited-by-desc search, `mailto=gianyrox@gmail.com`. Two initial DOIs returned the wrong paper (Timmers, Wilmanski) and were corrected against title+author+venue before use. No `curl|python3` (hook-safe: saved to file, parsed in a separate python3 step). Raw JSON + manifest archived to `_intake-raw/openalex/c-*.json` + `MANIFEST-C-domain.txt`. Random walk: longevity GWAS → APOE/CETP → epigenetic clocks (generation split) → reliability critique → proteomic/organ/ageotype omics → microbiome (centenarian → uniqueness → bile acids) → mtDNA heteroplasmy → mutator mouse → free-radical-theory bridge.
