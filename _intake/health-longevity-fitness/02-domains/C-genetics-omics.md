# Domain C — Genetics, Epigenetics & -Omics

> **Status:** v0.1 (Wave 1) — 2026-06-27. Graded claim set; companion data in `C-claims.json` (25 claims).
> **Discipline:** the *measurement* layer of aging. This domain is mostly **biomarkers and associations** —
> what predicts aging/mortality, not (yet) what causes or reverses it. The single rule that governs it:
> **a predictor is not a cause, and a cause is not a validated surrogate.** A clock that forecasts death
> (cohort) is not proof methylation drives death; a GWAS hit is an association, never an intervention.
>
> **Relationship to Domain B:** B holds the mechanisms/hallmarks (epigenetic alterations, mitochondrial
> dysfunction, genomic instability). C holds how those hallmarks are *read out* — clocks, GWAS, omics
> signatures. The five C-tagged claims already in `B-claims.json` (FOXO3, APOE, the polygenic-longevity
> deflation, the metformin cohort, and the TAME design) are the seed; **this file extends, does not repeat them.**

## How to read the tiers (descending rigor)
`meta` > `rct` > `cohort` > `case-control` > `cross-sectional` > `mechanistic` > `animal` > `invitro`.
Almost everything in this domain is observational: GWAS = `case-control`/`cohort`/`meta`; clocks and omics
signatures = `cohort`/`cross-sectional`. The few `animal` claims (mtDNA mutator mouse, pan-mammalian clock)
are the strongest causal evidence here, and even they don't translate cleanly to normal human aging.

---

## 1. Longevity genetics & GWAS — the deflationary story

The honest headline: **beyond APOE, human longevity genetics barely replicates.**

| Finding | Tier | Source |
|---|---|---|
| Longevity meta-GWAS: only **APOE/TOMM40** + **5q33.3** reach genome-wide significance | `meta` | Deelen et al., Nat Commun 2019 `10.1038/s41467-019-11558-2` |
| 1M-parent-lifespan GWAS: lifespan loci are mostly **smoking + cardiometabolic disease genes** (CHRNA3/5, LPA, CETP, APOE) | `cohort` | Timmers et al., eLife 2019 `10.7554/elife.39856` |
| 281-SNP centenarian "signature" — **but the 2010 *Science* version was retracted** (genotyping artifact); 2012 PLoS ONE is the corrected re-run | `case-control` | Sebastiani et al., PLoS ONE 2012 `10.1371/journal.pone.0029848` |
| Ashkenazi centenarians: **CETP** (I405V) + **APOC3** lipoprotein-size phenotype | `case-control` | Barzilai et al., JAMA 2003 `10.1001/jama.290.15.2030` |

- **APOE** and **FOXO3** (in `B-claims.json`) are the *only* loci replicated across most longevity GWAS.
- **CETP caveat:** the centenarian CETP association did NOT translate into drug benefit — pharmacological
  CETP inhibitors (torcetrapib, dalcetrapib, evacetrapib) failed in CVD outcome trials. Genotype-association
  ≠ drug-target validity (logged as `conflict-cetp-longevity-vs-drug`).
- **Lifespan heritability is modest (~10-25%)** — most longevity is environmental/stochastic. The Sebastiani
  retraction is the cautionary spine of `conflict-longevity-gwas-reproducibility`.

## 2. Epigenetic clocks — deep, head-to-head

The clocks are the most-hyped objects in this domain. The discipline is to separate **generation**,
**what they predict**, and **whether they're even reliable**.

### Generations (Bell et al. 2019 consensus, `10.1186/s13059-019-1824-y`)
- **First-generation** — trained to predict **chronological age**: **Horvath multi-tissue** (353 CpG,
  MAE ~3.6y; in `B-claims.json`) and **Hannum** (blood). They measure age, not health.
- **Second-generation** — trained on **clinical phenotype / mortality**: **PhenoAge** (Levine 2018),
  **GrimAge** (Lu 2019), **DunedinPACE** (Belsky 2022 — a *rate* of aging). These predict mortality and
  disease materially better than first-gen (all three already carded in `B-claims.json`).

### What they actually predict (this file's additions)
- **Marioni 2015** (`10.1186/s13059-015-0584-6`) — *first* demonstration that DNAm age acceleration predicts
  all-cause mortality (~5%/yr), independent of chronological age. `cohort`.
- **Chen 2016** (`10.18632/aging.101020`) — **meta-analysis** across 13 cohorts confirming epigenetic age
  acceleration robustly forecasts time-to-death. `meta` (one of only two meta-tier claims in this domain).
- **GrimAge > DunedinPACE > PhenoAge ≈ Hannum/Horvath** for mortality prediction — second-gen wins, but
  **clocks correlate imperfectly with each other** (they capture partly different signal).

### The reliability problem (the part the hype skips)
- **Higgins-Chen 2022** (`10.1038/s43587-022-00248-2`) — original clocks have **poor test-retest
  reliability** (ICC as low as ~0.6-0.8); **principal-component (PC) versions** push ICC >0.95. **Many
  published "age-reversal" effects are within the measurement noise of the original clocks.** `mechanistic`.
- **Fahy 2019 / TRIIM** (`10.1111/acel.13028`) — the famous "first human age reversal" (~2.5y DNAm
  reversal + thymus regrowth) is **n=9, single-arm, GH-confounded**, and the effect is near that noise
  floor. Indexed as a pilot, **not** as efficacy.

### Is the clock even biology? (yes, partly)
- **Pan-mammalian clock 2023** (`10.1038/s43587-023-00462-6`) — one methylation clock works across **348
  mammal species**; age-related CpGs map to conserved development/polycomb targets → methylation aging is
  an evolutionarily conserved process, not pure curve-fitting. `animal`.
- **Still:** every clock is a **correlate**. Causality is unestablished (Bell 2019). → `conflict-which-clock-is-valid`.

## 3. -Omics aging signatures (proteome, metabolome, multi-omic)

- **Proteomic waves — Lehallier 2019** (`10.1038/s41591-019-0673-2`): the plasma proteome changes
  **non-linearly in three waves** (~ages 34, 60, 78). Aging isn't a smooth ramp. `cohort` (cross-sectional).
- **Organ-specific clocks — Oh 2023** (`10.1038/s41586-023-06802-1`): plasma proteomics gives **per-organ
  ages**; organs age at different rates within one person; **~1 in 5 healthy adults** has a strongly
  accelerated organ; accelerated organ age predicts that organ's disease + mortality. `cohort`.
- **Ageotypes — Ahadi 2020** (`10.1038/s41591-019-0719-5`): dense longitudinal multi-omics → people age
  along **different molecular axes** (metabolic / immune / hepatic / nephrotic). A single biological-age
  number hides this. `cohort` (small n, within-person).
- **Inflammatory clock (iAge) — Sayed 2021** (`10.1038/s43587-021-00082-y`): deep-learning immune clock for
  multimorbidity/frailty; flags **CXCL9** as a dominant inflammaging driver — operationalizes the
  inflammaging hallmark (Domain B) as a measurable clock. `cohort`.
- **The meta-statement — Moqri 2023** (`10.1016/j.cell.2023.08.003`): the Biomarkers of Aging Consortium
  consensus — **no omics biomarker is yet a validated surrogate** that moves with interventions AND predicts
  their clinical benefit. Predictive ≠ validated. This anchors the whole domain.

## 4. Microbiome & aging

- **Centenarian remodeling — Biagi 2010** (`10.1371/journal.pone.0010667`): with extreme age, diversity
  falls, **SCFA-producers (Faecalibacterium) are lost**, pathobionts rise, tracking inflammaging. `cross-sectional`.
- **Gene richness — Le Chatelier 2013** (`10.1038/nature12506`): low microbial gene richness ↔ adiposity,
  insulin resistance, inflammation (longevity-relevant intermediates). `cross-sectional`.
- **Uniqueness predicts survival — Wilmanski 2021** (`10.1038/s42255-021-00348-0`): in **healthy** aging the
  microbiome becomes increasingly **individual** (drifts off the Bacteroides core); uniqueness predicts
  survival. Crucially, **unhealthy** elders keep the "average" microbiome — so the signal is partly a
  *readout* of host health. `cohort`.
- **Centenarian bile acids — Sato 2021** (`10.1038/s41586-021-03832-5`, Honda lab): centenarian microbiomes
  make unusual bile acids (**isoalloLCA**) with potent anti-Gram-positive (incl. *C. difficile*) activity —
  isolate/gnotobiotic-backed **mechanism**, not just correlation. `mechanistic`.
- **Microbiome aging clock — Galkin 2020** (`10.1016/j.isci.2020.101199`): DL predicts age from taxonomy
  (~6y MAE). Biomarker only; commercial-group source. `cross-sectional`.
- **SCFA mechanism**: butyrate/propionate/acetate fuel colonocytes, induce colonic Tregs, hold the gut
  barrier; age-related loss of fiber-fermenters is the proposed **dysbiosis → inflammaging** bridge. `mechanistic`.
- **Open question:** does dysbiosis **cause** aging or **reflect** it (diet, polypharmacy, reduced motility)?
  → `conflict-microbiome-cause-or-consequence`.

## 5. Mitochondrial genetics & heteroplasmy (Wallace)

- **Heteroplasmy threshold — Wallace 2013** (`10.1101/cshperspect.a021220`): mtDNA is maternal, high-copy,
  often heteroplasmic; a pathogenic variant only causes dysfunction once it crosses a **tissue-specific
  threshold** (~60-90% mutant). mtDNA mutates far faster than nuclear DNA. **Direct UP-link to the
  biophysics canon** (mitochondria, electron transport). `mechanistic`.
- **Mutator mouse — Trifunovic 2004** (`10.1038/nature02517`): POLG proofreading-deficient mice accumulate
  mtDNA mutations and **age prematurely** with shortened lifespan — causal proof that mutation load can drive
  aging features. `animal`.
- **Mutator mouse, replicated — Kujoth 2005** (`10.1126/science.1112125`): the phenotype is driven by
  mutation-induced **apoptosis**, **not** elevated ROS — **challenges the naive free-radical theory**
  (cross-links to the free-radical/mitohormesis conflict in B). `animal`.
- **Human reality — Bratić & Larsson 2013** (`10.1172/jci64125`): somatic mtDNA mutations/heteroplasmy
  **accumulate clonally with age** in brain, muscle, colon, substantia nigra (mosaic respiratory-deficient
  cells) — but human loads usually sit **below** the mutator-mouse range, so whether they cause *normal*
  aging is contested. → `conflict-mtdna-mutation-causality`.

---

## Canon cross-links (UP to bucket-canon/05-biophysics)
Mitochondrial heteroplasmy/threshold (Wallace), mutator-mouse apoptosis-vs-ROS (Kujoth — ties to the redox
conflict), pan-mammalian methylation clock, SCFA→barrier mechanism. The mtDNA-mutation-causality conflict is
flagged as a live biophysics-canon question (mutation-accumulation vs free-radical theory of aging).

## Gaps for Wave 2 (priority order)
1. **More `meta`/`rct` tier:** Mendelian-randomization on telomere length/lipids→lifespan; any RCT moving a
   clock with a hard endpoint (none exists yet — that *is* the Moqri 2023 gap).
2. **Telomere genetics depth:** TERT/TERC GWAS, MR showing bidirectional cancer↔longevity (only sketched in B).
3. **Metabolomic/lipidomic specifics:** ceramide/sphingolipid aging signatures, the longevity metabolite
   panels (e.g., citrate, BCAA) — currently folded into ageotypes; deserve their own claims.
4. **Klotho** (KL-VS) longevity variant; **IGF1R** centenarian variants (Suh/Barzilai) — candidate-gene depth.
5. **Microbiome causality experiments:** FMT young→old mouse lifespan/healthspan studies (turritopsis,
   killifish — Smith 2017) to push the cause-vs-consequence conflict toward resolution.
6. **Single-cell mtDNA** (Wallace/Chinnery): clonal expansion dynamics; mitochondrial-replacement/mito-donation.
7. **People carding:** Deelen, Sebastiani, Perls, Barzilai, Wallace, Trifunovic, Larsson, Horvath, Levine,
   Belsky, Higgins-Chen, Lehallier, Wyss-Coray, Oh, Snyder, Wilmanski, Gibbons, Honda, Ferrucci, Franceschi,
   Gladyshev/Moqri → push to `01-people/` in canon-figures schema.

## Provenance method
All DOIs verified via OpenAlex direct-DOI lookup (`filter=doi:`) or cited-by-desc search,
`mailto=gianyrox@gmail.com`. Two initial DOIs returned the wrong paper (Timmers, Wilmanski) and were
corrected against title+author+venue before use. No `curl|python3` (hook-safe: saved to file, parsed in a
separate step). Raw JSON archived to `_intake-raw/openalex/c-*.json`. Random walk: longevity GWAS → APOE/CETP
→ epigenetic clocks (generation split) → reliability critique → proteomic/organ/ageotype omics → microbiome
(centenarian → uniqueness → bile acids) → mtDNA heteroplasmy → mutator mouse → free-radical-theory bridge.
