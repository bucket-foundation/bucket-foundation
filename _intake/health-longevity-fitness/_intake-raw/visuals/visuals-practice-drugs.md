# Visual Design Spec — Practice & Drugs Cluster

> **Reviewer pass:** Visual design review of the "practice-and-drugs" chapter cluster of the
> AGFarms / Bucket Foundation health manual. Output is a **buildable spec list**, not the graphics.
> Chapters reviewed: 38 (surgery/perioperative), 39 (anesthesia/critical-care), 40 (imaging/radiology),
> 41 (pathology/lab-medicine), 28 (pharmacology-full), 10 (medical-pharmacology), 31 (regenerative-frontier),
> 30 (complementary-medicine), 32 (biohacking-fringe).
>
> **Build tooling tags:** (a) PROCEDURAL SVG (cairosvg) · (b) DATA CHARTS (matplotlib) ·
> (c) DECISION FLOWCHARTS · (d) MATRIX/HEATMAP grids · (e) TIMELINES · (f) REAL MEDIA (Wikimedia open-license) ·
> (g) INFOGRAPHIC.
> **Buildability:** QUICK-SVG / CHART / FLOWCHART / ANATOMICAL / REAL-MEDIA / COMPLEX.
> **Priority:** P1 (must-have, high-leverage) · P2 (strong) · P3 (nice-to-have).
>
> ⭐ **Flagship P1 of the whole cluster:** §41 *Bayes / pre-test-probability worked example* — the
> PPV-collapses-at-low-prevalence visualization. This is the single most leverage-dense figure in the
> manual; build it first.

---

## §40 — Diagnostic Imaging & Radiology

| # | Figure title | Type | What it shows | Source (content) | Buildability | Priority |
|---|---|---|---|---|---|---|
| 40-1 | **Imaging-modality comparison matrix** | d | Modalities (X-ray, fluoro, CT, US, MRI, nuclear, PET, DEXA, mammo, angio) as rows × columns: physics, what-it-sees-best, radiation dose, relative cost, best-for, key limit. Color-coded radiation column (green=none → red=highest). | §40.2 master table | MATRIX | **P1** |
| 40-2 | **Radiation dose in context (mSv bar chart)** | b | Horizontal log-scale bars: dental/DEXA ~0.001 → CXR 0.02 → mammo 0.4 → CAC 1 → head CT 2 → **background 3/yr (reference line)** → chest CT 5–7 → abdo/pelvis 8–10 → FDG-PET 15–25. Anchor annotations (flight, years-of-background). | §40.3.1 dose table | CHART | **P1** |
| 40-3 | **The four physics principles of imaging** | g/a | Four-panel infographic: ionising EM (X-ray/CT) · mechanical wave (US) · magnetic resonance (MRI) · radioactive decay (nuclear/PET) — each with the probe→tissue→signal idea and the hazard note ("image and hazard are the same photon"). | §40.1 | QUICK-SVG | P2 |
| 40-4 | **Incidentaloma prevalence heatmap** | d | Grid: modality/organ × prevalence-of-incidental-finding and × malignancy-rate-within-finding. Highlights cardiac MRI/chest CT >⅓; renal/thyroid/ovarian ~25%, breast ~42%. | §40.4 (O'Sullivan/Ioannidis) | MATRIX | P2 |
| 40-5 | **Image a question, not a body — decision flow** | c | Flowchart: symptom/clinical question? → which physical question → matched modality (bone/trauma→CT, soft-tissue→MRI, fetus/repeat→US, metabolism→PET); asymptomatic "checkup" branch → STOP (incidentaloma cascade). | §40.9, §40.8 | FLOWCHART | P2 |
| 40-6 | **CT cancer-burden: cohort + population projection** | b | Twin-panel bar: childhood-CT excess cancer (Mathews +24%, EPI-CT ERR ~1.96/100mGy) and Smith-Bindman 2025 (~93M scans → ~103k projected cancers, ~5% of dx). Labelled "modelled, not body count." | §40.3.2 | CHART | P3 |

---

## §41 — Pathology & Laboratory Medicine  *(the test-performance P1 cluster)*

| # | Figure title | Type | What it shows | Source (content) | Buildability | Priority |
|---|---|---|---|---|---|---|
| 41-1 | ⭐ **Bayes worked example — PPV collapses at low prevalence** | g+b | The flagship. The 99%-sens/99%-spec test on 1-in-1,000 disease, 100,000 screened: 100 true cases → 99 TP; 99,900 well → 999 FP; **1,098 positives, only 99 real → PPV ≈ 9%.** Show as a 100k-dot/icon array or proportional block diagram + the arithmetic, then the contrast panel (1-in-10 clinic → PPV >90%). "Same test, opposite meaning." | §A.4 | COMPLEX (icon-array infographic) | **P1** |
| 41-2 | **The 2×2 confusion table** | a/d | TP/FP/FN/TN grid with the column-reads (sens/spec, "down the columns = property of test") vs row-reads (PPV/NPV, "across the rows = meaning for you"). Annotated SnNout / SpPin. | §A.1–A.3 | QUICK-SVG | **P1** |
| 41-3 | **PPV-vs-prevalence curve** | b | Line chart: PPV (y) against disease prevalence/pre-test probability (x, log), one curve per sens/spec pair (e.g. 99/99, 95/95, 90/90). Marks the 1-in-1,000 and 1-in-10 points from 41-1. The mathematical spine of "screening low-prevalence floods false positives." | §A.4 | CHART | **P1** |
| 41-4 | **Likelihood-ratio (Fagan) nomogram** | a | Classic three-axis nomogram: pre-test probability → LR → post-test probability, with the LR field guide (>10 conclusive ↑, <0.1 conclusive ↓, ~1 useless) as a side legend. | §A.5 | QUICK-SVG | **P1** |
| 41-5 | **Reference-range false-positive math** | b | Bar/curve: probability ≥1 abnormal flag = 1 − 0.95ⁿ as panel size grows; 14 analytes ≈ 51%, 20 ≈ 64%. "More than half of healthy people 'fail' a broad panel by statistics alone." | §A.7 | CHART | **P1** |
| 41-6 | **ROC curve + AUC interpretation** | b | Sensitivity vs 1−specificity, several curves (AUC 0.5 diagonal, 0.7 modest, 0.9 excellent), with the threshold-as-policy-choice annotation. | §A.6 | CHART | P2 |
| 41-7 | **Lab-category map (table-as-grid)** | d | Categories (CMP, glycemic, LFT, kidney, lipids, CBC, inflammatory, endocrine, tumor markers, coagulation, UA, histopath) × core tests / what it tells you / honest caveat. | §B.1 | MATRIX | P2 |
| 41-8 | **The cascade — how one false positive cascades** | c/g | Flow: broad panel on low-pre-test person → false flag (low PPV) → repeat → imaging → specialist → biopsy (complication risk) → overdiagnosis/anxiety. The "cost of more." | §A.9 | FLOWCHART | P2 |

---

## §28 — Pharmacology (Full) & Pharmacogenomics

| # | Figure title | Type | What it shows | Source (content) | Buildability | Priority |
|---|---|---|---|---|---|---|
| 28-1 | **Dose-response + therapeutic-index curve** | b | Two sigmoid log-dose curves (benefit Emax + toxicity), the **therapeutic window** shaded between ED50 and TD50; wide-TI (penicillin) vs narrow-TI (warfarin/digoxin/lithium) inset. "The dose makes the poison." | §A.1.4 | CHART | **P1** |
| 28-2 | **ADME journey of a drug** | g/a | Pipeline infographic: Absorption (route + first-pass via portal/liver) → Distribution (protein binding, BBB, fat) → Metabolism (CYP Phase I/II) → Excretion (kidney). | §A.2 | QUICK-SVG | **P1** |
| 28-3 | **CYP450 interaction matrix** | d | Big-four enzymes (3A4/5, 2D6, 2C19, 2C9) × rows: share of metabolism, key substrates, strong inhibitors, classic inducers. Grapefruit + St. John's Wort flagged. | §A.2.3 | MATRIX | **P1** |
| 28-4 | **Pharmacogenomics actionable gene-drug grid** | d | The CPIC table as a heatmap: gene × drug × what-the-variant-does × clinical-action × evidence-tier (CYP2C19/clopidogrel, CYP2D6/codeine, CYP2C9+VKORC1/warfarin, TPMT-NUDT15/thiopurines, DPYD/5-FU, SLCO1B1/simvastatin, HLA-B*57:01/abacavir, HLA-B*15:02/carbamazepine, G6PD). | §C.3 | MATRIX | **P1** |
| 28-5 | **Metabolizer-phenotype × prodrug-inversion** | d/g | 2-axis grid: phenotype (PM/IM/NM/UM) × drug-type (active drug vs prodrug), cells showing the inversion (PM = toxicity for active, failure for prodrug; UM = failure for active, **overdose** for prodrug — codeine deaths). | §C.2 | MATRIX | P2 |
| 28-6 | **Half-life & steady state curve** | b | Concentration-time: ~4–5 half-lives to plateau on repeat dosing and same to wash out; loading-dose overlay. | §A.2.4 | CHART | P2 |
| 28-7 | **Agonist spectrum** | a | Receptor-activation continuum: inverse agonist (below baseline) — antagonist (0) — partial agonist (submaximal ceiling) — full agonist (Emax); allosteric modulator as side-binding. | §A.1.2 | QUICK-SVG | P2 |
| 28-8 | **Placebo / nocebo as endogenous pharmacology** | g | Two-sided diagram: placebo (expectation → endogenous opioid/dopamine, naloxone-reversible; dose-response of ritual) vs nocebo (negative expectation → real symptoms, SAMSON ~90% on placebo). | Part E | INFOGRAPHIC | P2 |

---

## §10 — Medical & Pharmacology

| # | Figure title | Type | What it shows | Source (content) | Buildability | Priority |
|---|---|---|---|---|---|---|
| 10-1 | **GLP-1 trial outcomes chart** | b | Grouped bars: STEP-1 −14.9% weight, SURMOUNT-1 −20.9%, SELECT −20% MACE, FLOW −24% kidney events — surrogate (weight) vs hard-outcome (MACE/renal) coded differently. | §1.2 | CHART | **P1** |
| 10-2 | **Statin NNT: primary vs secondary prevention** | b/g | Icon-array / bar contrast: large absolute benefit (low NNT) in secondary prevention vs small (high NNT, tens–hundreds) in primary — "same pill, baseline risk is the story." | §2.2 | CHART | P2 |
| 10-3 | **ASPREE — the clean "stop"** | b | Three-panel: disability-free survival (no benefit), CV events (no reduction), major hemorrhage (↑), all-cause mortality (slightly ↑). The negative-result figure. | §4 | CHART | P2 |
| 10-4 | **Geroprotector evidence grid** | d | Drug (metformin, rapamycin, SGLT2i, acarbose) × approved-use × best-evidence-tier-for-aging × honest verdict. Heatmap: only SGLT2i has hard human outcomes (for disease, not aging). | §6 table | MATRIX | P2 |
| 10-5 | **Interventions ranked by hard-outcome evidence** | g | Ladder/pyramid: proven large benefit → proven negative (stop) → deficiency-only → experimental/off-label → no-evidence. Inverts the marketing-loudness order. | §8 | INFOGRAPHIC | P2 |
| 10-6 | **Vaccines as longevity medicine** | d | Vaccine × target × beyond-target signal × tier (Shingrix→dementia, flu→CV, pneumococcal, RSV). | §5 table | MATRIX | P3 |

---

## §38 — Surgery & Perioperative Medicine

| # | Figure title | Type | What it shows | Source (content) | Buildability | Priority |
|---|---|---|---|---|---|---|
| 38-1 | **Surgery verdict map (operation × honest verdict)** | d | The §0 master table as a heatmap: representative operations × verdict band (transformative / genuinely effective / over-sold / debunked-vs-sham), with best-evidence anchor. | §0 | MATRIX | **P1** |
| 38-2 | **Sham-surgery results chart** | b | The canonical failures: knee arthroscopy (Moseley), meniscectomy (FIDELITY), vertebroplasty (Buchbinder/Kallmes), PCI for stable angina (ORBITA) — real vs sham, effect difference ≈ 0. Mechanism ≠ outcome made visual. | §2.2 | CHART | **P1** |
| 38-3 | **Open vs laparoscopic vs robotic** | d | Access-axis matrix: invasiveness, recovery, cost, OR time, evidence-for-better-outcomes. Robotic = equivalent-but-pricier (ROLARR) called out. | §1 robotic | MATRIX | P2 |
| 38-4 | **The named over-uses (reflex → honest evidence)** | d/g | Grid: over-use × "the reflex" × "the honest evidence" × corpus location (knee scope, spinal fusion, vertebroplasty, stent-for-stable, robotic, C-section past threshold). | §5 table | MATRIX | P2 |
| 38-5 | **Bariatric surgery outcomes** | b | STAMPEDE diabetes-remission rates (surgery vs medical) + SOS mortality reduction — "most effective obesity/diabetes intervention we have." | §3 bariatric | CHART | P2 |
| 38-6 | **Questions before any elective operation** | c/g | Decision/checklist flow: natural history? symptoms-survival-or-picture? best blinded evidence for MY indication? real trial of non-surgical? surgeon/centre volume? prehab window? Emergency branch = skip (speed is the treatment). | §5 questions | FLOWCHART | P2 |

---

## §39 — Anesthesiology & Critical Care

| # | Figure title | Type | What it shows | Source (content) | Buildability | Priority |
|---|---|---|---|---|---|---|
| 39-1 | **Anesthesia types map** | d/g | GA / spinal / epidural / peripheral nerve block / local / sedation × what's switched off × how given × typical use × patient state. | §2.1 table | MATRIX | P2 |
| 39-2 | **The sedation continuum** | a | Spectrum bar: local → light sedation → deep sedation → general anesthesia as one dial, with the "unintentionally too deep, not breathing" danger zone marked. | §2.1 note | QUICK-SVG | P2 |
| 39-3 | **Anesthesia-attributable mortality decline** | b/e | Drop from ~357/million (pre-1970s) → ~34/million (1990s–2000s) → ~1-in-100,000 healthy patients; annotate the drivers (oximetry, capnography, difficult-airway algorithm). | §2.5 | CHART | P2 |
| 39-4 | **The sepsis evidence that turned over** | e | Timeline: 2001 Rivers EGDT (celebrated) → 2014–15 ProCESS/ARISE/ProMISe (deflation, no benefit) → 2021 Surviving Sepsis (keep the simple core). "The signal survived; the ritual didn't." | §6 | TIMELINE | **P1** |
| 39-5 | **ICU organ-substitution map** | d/g | Failing organ (lungs/circulation/kidneys/brain/metabolic) × the support (vent/ECMO, vasopressors, dialysis/CRRT, etc.) × "what it's honestly doing = buying time." | §5 table | MATRIX | P2 |
| 39-6 | **Less-is-more in critical care** | b | Paired bars of the RCT wins where gentler beat aggressive: ARDSNet low-tidal-volume (~9pp mortality ↓), PROSEVA proning, RECOVERY dexamethasone. | §5.1 | CHART | P2 |
| 39-7 | **Delirium prevention bundle (HELP / ABCDEF)** | g | Infographic of the low-tech bundle elements; note antipsychotics don't work, the bundle does. Highest-yield literacy topic. | §7 | INFOGRAPHIC | P3 |

---

## §31 — Regenerative Medicine & the Longevity Frontier

| # | Figure title | Type | What it shows | Source (content) | Buildability | Priority |
|---|---|---|---|---|---|---|
| 31-1 | **Regenerative-medicine evidence-stage ladder** | d | The §1 master table as a heatmap: intervention × best-evidence-stage (meta/rct/cohort/animal/invitro/anecdotal/speculative) × honest status. Top = regulator-approved hard endpoints; bottom = paying for a story. | §1 table | MATRIX | **P1** |
| 31-2 | **The four-beat structure of the field** | g | Cycle/flow infographic: (1) striking biology → (2) spectacular mouse result → (3) brutal translation gap → (4) predatory clinic filling the gap. "Clinic shows you the Nobel, sells you the infusion." | §0 | INFOGRAPHIC | **P1** |
| 31-3 | **Gene-therapy price reality** | b | Bar chart of the most-expensive-drug-ever launches: Zolgensma ~$2.1M, Casgevy ~$2.2M, Hemgenix ~$3.5M, Lenmeldy ~$4.25M; access/equity annotation. | §3.3 | CHART | P2 |
| 31-4 | **PRP — marketing vs evidence (RESTORE)** | b | Pain/cartilage outcomes: intra-articular PRP vs saline placebo at 12 mo (no difference). "Sold as regeneration; matches placebo." | §6.1 | CHART | P2 |
| 31-5 | **Frontier honesty through-line** | d | Domain × {striking biology / mouse result / the gap / the predatory fill} — the §8 summary grid showing gene therapy as the lone gap-crossing column. | §8 table | MATRIX | P2 |
| 31-6 | **Predatory stem-cell-clinic red-flags** | g/c | Checklist infographic: cash-only + long unrelated condition menu + not on ClinicalTrials.gov + "regeneration" of tissue cells don't build = predatory tier. | §2.3 | INFOGRAPHIC | P3 |

---

## §30 — Complementary & Alternative Medicine

| # | Figure title | Type | What it shows | Source (content) | Buildability | Priority |
|---|---|---|---|---|---|---|
| 30-1 | **CAM modality verdict heatmap** | d | The §1 verdict table as a color grid: modality × best-evidence-indication × verdict (works / works-for-some / placebo-level / no-evidence / harmful). The chapter in one image. | §1 table | MATRIX | **P1** |
| 30-2 | **Alternative-instead-of vs alongside — cancer survival** | b | The killer number: 5-yr survival 55% (alternative-only) vs 78% (conventional); HR 2.50 overall, 5.68 breast; effect vanishes once treatment-refusal is accounted for. | §9.3 (Johnson) | CHART | **P1** |
| 30-3 | **Acupuncture effect sizes (Vickers IPD)** | b | Two bars: vs no-treatment ~0.5 SD vs vs-sham ~0.2 SD — "most of the benefit is ritual, a sliver is the needle." | §2 | CHART | P2 |
| 30-4 | **Placebo is real but bounded** | g | Split infographic: subjective/brain-mediated outcomes (pain, nausea, mood — placebo moves these) vs objective/pathology (tumors, infection, HbA1c, fractures — placebo does NOT). Hróbjartsson & Gøtzsche. | §9.1 | INFOGRAPHIC | P2 |
| 30-5 | **Heavy-metal contamination in Ayurvedic products** | b | Bar: ~1 in 5 products with detectable lead/mercury/arsenic; ~40% for rasa shastra. "Natural ≠ safe." | §4 (Saper) | CHART | P3 |

---

## §32 — Biohacking & Fringe Interventions

| # | Figure title | Type | What it shows | Source (content) | Buildability | Priority |
|---|---|---|---|---|---|---|
| 32-1 | **The biohacking verdict matrix** | d | The big §0 table as a heatmap: intervention × verdict band (REAL / PROMISING / PLACEBO-LEVEL / NO-EVIDENCE / POTENTIALLY-HARMFUL) across peptides, light, HBOT, cryo, IV drips, detox cluster, fringe biophysics, nootropics. | big verdict table | MATRIX | **P1** |
| 32-2 | **The laundering gap (concept diagram)** | g | The chapter's central idea: real mechanism / mouse-or-cell result → [LAUNDER] → sold as human outcome it never earned. Worked examples (BPC-157 rat tendon → "heals you"; HBOT telomere n=35 → "reverses aging"; NAD+ up → "recharge"). | §10 | INFOGRAPHIC | **P1** |
| 32-3 | **The anecdote engine** | g | Four-bias infographic: survivorship + lifestyle-bundling + regression-to-the-mean + placebo — why "it changed my life" testimonials mislead; n=1 can't see small effects or longevity. | §10 / honesty-rule 4 | INFOGRAPHIC | P2 |
| 32-4 | **Dose-sold ≠ dose-studied** | g/b | Template figure (reusable across cryo, red-light, NAD, cold): the protocol that produced any human signal vs the protocol being marketed. PBM biphasic dose-response curve as the concrete example. | honesty-rule 3; §2 | CHART/INFOGRAPHIC | P2 |
| 32-5 | **GH/IGF-1 longevity own-goal** | a/g | Lever diagram: longevity genetics says LOW GH/IGF-1 extends life (dwarf/GHR-KO, low-IGF1 long-lived) ← → GH-secretagogues push the lever the WRONG way. | §1.3 | QUICK-SVG | P3 |

---

## Summary statistics

- **Total figures specified:** 49 across 9 chapters (5–8 per chapter).
- **Priority breakdown:** P1 = 15 · P2 = 27 · P3 = 7.
- **Type/tooling breakdown (primary tag):**
  - (d) MATRIX/HEATMAP — 19 (dominant; this cluster is verdict-tables and comparison grids)
  - (b) DATA CHARTS — 16
  - (g) INFOGRAPHIC — 9 (laundering gap, four-beat, placebo-bounded, anecdote engine, etc.)
  - (a) PROCEDURAL SVG — 6 (2×2 table, Fagan nomogram, ADME, agonist spectrum, sedation continuum)
  - (c) FLOWCHART — 4 (often paired with d/g)
  - (e) TIMELINE — 2 (sepsis turnover, anesthesia-mortality decline)
  - (f) REAL MEDIA — 0 (none load-bearing; the cluster is conceptual/quantitative, not anatomical-photo)
- **Buildability:** most are CHART or MATRIX (fast). The flagship 41-1 (Bayes icon-array) is the one COMPLEX build.
