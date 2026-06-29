# Visual Design Spec — BODY cluster

> Reviewer pass for the AGFarms / Bucket Foundation health manual.
> Chapters reviewed: **18** (genetics + anatomy primer), **13** (endocrine), **14** (nervous),
> **15** (immune), **16** (telomeres/cellular aging), **11** (lived-in body systems),
> **17** (organ-systems atlas), **42** (reproductive/sexual health).
> This is a **buildable spec list**, not the graphics. Each row tagged by build tooling + priority.
>
> **Type legend:** (a) PROCEDURAL SVG · (b) DATA CHART (matplotlib) · (c) DECISION FLOWCHART/pathway ·
> (d) MATRIX/HEATMAP · (e) TIMELINE · (f) REAL MEDIA (open-license Wikimedia / demo frames) · (g) INFOGRAPHIC composite.
> **Buildability:** QUICK-SVG · CHART · FLOWCHART · ANATOMICAL · REAL-MEDIA · COMPLEX.
> **Priority:** P1 (build first / headline) · P2 (strong support) · P3 (nice-to-have).
>
> **Asset note:** the 29 on-hand Wikimedia images are musculoskeletal (ankle/hip/knee/shoulder/spine/muscle/brown-fat/
> diaphragm) — they serve the training sections, **not** this cluster. Body-cluster anatomicals (neuron, nephron,
> endocrine-gland map, reproductive anatomy) need **new** open-license Wikimedia pulls; tagged REAL-MEDIA where a clean
> CC/PD source is known to exist, else QUICK-SVG schematic.

---

## Chapter 18 — Genetics (Practical) & Anatomy/Physiology Primer

| Section | Figure title | Type | What it shows | Source (chapter / claim) | Buildability | Priority |
|---|---|---|---|---|---|---|
| B.3 | **The 12 organ systems — navigation map** | g | One-screen atlas: 11–12 classical organ systems, each with its core homeostatic variable + "where the manual covers it." The book's master index figure. | §B.3 navigation table | COMPLEX | **P1** |
| B.1 | Levels of organization — nested hierarchy | a | Atoms → molecules → organelles → cells → tissues → organs → organ systems → organism, as nested/stacked bands. | §B.1 levels table | QUICK-SVG | P1 |
| B.4.1 | The VO₂max oxygen chain | a/c | Lungs → blood (Hb) → heart (cardiac output) → capillaries → mitochondria, with the trainable link flagged at each step. | §B.4.1 | QUICK-SVG | P1 |
| B.4.2 | How food becomes ATP — the fuel chain | a/c | Digestive → cardiovascular → glycolysis/β-oxidation → Krebs → ETC → ATP synthase (chemiosmosis). | §B.4.2 | QUICK-SVG | P2 |
| A.1 | Common vs rare variants — effect-size vs frequency | b | Scatter: large-effect rare variants (BRCA/LDLR) vs tiny-effect common SNPs (ACTN3); shows why chips miss the actionable ones. | §A.1 common/rare distinction | CHART | P2 |
| A.2 | The few variants that actually matter | d | Matrix of the 7 actionable categories (APOE, Lp(a), pharmacogenes, BRCA, HFE, FOXO3, MTHFR) × what it is / why it matters / honest grade. | §A.2 table | MATRIX | P2 |
| A.2.1 | APOE gene-dose risk for Alzheimer's | b | Bar/step chart: ε3/ε3 baseline → 1×ε4 (~2–3×) → ε4/ε4 (~8–12×), with "risk ≠ destiny" caption. | §A.2.1 | CHART | P2 |
| B.1 | The four basic tissue types | f/a | Epithelial / connective / muscle / nervous panel — histology thumbnails (Wikimedia PD) + one-line function. | §B.1 | REAL-MEDIA | P3 |

---

## Chapter 13 — Endocrine System & Hormones

| Section | Figure title | Type | What it shows | Source (chapter / claim) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §3–§7 | **The endocrine axes — feedback diagram (HPA · HPG · HPT)** | a/g | Side-by-side three-tier loops: hypothalamus → pituitary → gland → effector hormone → negative feedback, the three canonical axes drawn identically to show the shared control primitive. | §3 (HPA), §4 (HPG), §5 (HPT) | COMPLEX | **P1** |
| §1 | The generic three-tier axis + negative feedback | a | Single annotated loop teaching the control law (releasing → stimulating → effector → inhibits-above); the schematic the master diagram is built from. | §1 "fundamental control law" | QUICK-SVG | P1 |
| §1/§2 | Hormone change with age | b | Multi-line: testosterone (~1%/yr slope), estrogen (menopause cliff), DHEA (steep), GH/IGF-1 (somatopause), melatonin (decline) vs insulin-resistance & evening-cortisol (rise). | §2 table "change with age"; §1 set-point drift | CHART | **P1** |
| §3 | Cortisol circadian rhythm | b | 24-h cortisol curve: pre-waking surge, cortisol-awakening-response peak (+30–45 min), daily decline to night trough; "healthy ≠ flat." | §3 "the rhythm is the point" | CHART | P1 |
| §7 | IGF-1 U-shaped mortality curve | b | Mortality (y) vs IGF-1 (x) U-shape; arrow showing "boost your GH" pushes the wrong way; Laron/daf-2 longevity-favorable region marked. | §7 growth–longevity tradeoff; `igf1-u-shaped-mortality` | CHART | P1 |
| §1 | Reading the axis by the lab-pair | d | 2×2 interpretation matrix: stimulating signal (high/low) × effector (high/low) → locates lesion (primary vs central), applied to TSH/T4, LH·FSH/steroid, ACTH/cortisol. | §1 "it explains the lab pairs" | MATRIX | P2 |
| §1/§2 | Endocrine gland body map | f/a | Anatomical body outline locating hypothalamus, pituitary, thyroid/parathyroid, adrenals, pancreas, gonads, pineal (+ fat/gut/heart as endocrine tissue). | §1 gland list | REAL-MEDIA | P2 |
| §2 | The axis-by-axis lever table | d | The §2 master table as a graphic: axis × effector × age-change × honest lever × evidence tier (color-coded by tier). | §2 master table | MATRIX | P2 |
| §6 | Insulin-resistance early-warning ordering | b/e | Timeline/staggered chart: fasting insulin / HOMA-IR rises first → HbA1c → fasting glucose; "breaks years before a glucose test flags it." | §6 early-warning ordering | CHART | P2 |

---

## Chapter 14 — The Nervous System

| Section | Figure title | Type | What it shows | Source (chapter / claim) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §1.2 | **Neuron + action potential schematic** | a | Labeled neuron (dendrites→soma→axon→terminals) joined to the AP mechanism: Na⁺/K⁺ pump, voltage-gated Na⁺/K⁺ channels, threshold/upstroke/downstroke. | §1.2 | QUICK-SVG | **P1** |
| §1.2 | Action-potential voltage trace | b | Membrane potential (mV) vs time: −70 rest → threshold → +40 spike → repolarize → hyperpolarize, phases annotated to channel states (Hodgkin–Huxley). | §1.2; HH 1952 | CHART | P1 |
| §2.1 | Autonomic nervous system — sympathetic vs parasympathetic | a/g | Body diagram, two columns: fight/flight vs rest/digest organ effects, transmitters (NE vs ACh), thoracolumbar vs craniosacral/vagus outflow. | §2.1 table | COMPLEX | **P1** |
| §3 | Neurotransmitters — function vs the pop error | d | Matrix: glutamate / GABA / dopamine / serotonin / ACh / NE × "what it actually does" vs "the pop error" (the §3 table as graphic). | §3 table | MATRIX | **P1** |
| §1.3 | The tripartite synapse + glia | a | Synapse (vesicles, Ca²⁺ influx, receptors) plus astrocyte, microglia (pruning), oligodendrocyte/myelin (saltatory conduction). | §1.3 | QUICK-SVG | P2 |
| §6.1 | Nociception ≠ pain | a/c | Peripheral nociceptor → spinal cord → brain *constructs* pain, with descending modulation (PAG→cord) amplify/suppress; placebo/naloxone callout. | §6.1 | QUICK-SVG | P2 |
| §1.1 | CNS vs PNS two-compartment map | a | Simple body map splitting CNS (brain+cord, no regrowth) vs PNS (regrows ~1 mm/day); the regenerative-asymmetry fact. | §1.1 | QUICK-SVG | P3 |
| §4.2 | Plasticity across the lifespan | b | Schematic curve: high childhood plasticity with critical-period windows (language, binocular vision) → smaller/slower adult plasticity. | §4.2 critical periods | CHART | P3 |

---

## Chapter 15 — Immune System & Inflammation

| Section | Figure title | Type | What it shows | Source (chapter / claim) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §1.1–1.2 | **Innate vs adaptive immunity — the map** | g/d | Two-arm diagram: innate (fast/fixed/no-memory: barriers, neutrophils, macrophages, NK, complement) vs adaptive (slow/specific/remembers: T cells, B cells/antibodies, memory), with the dendritic-cell bridge. | §1.1, §1.2 | COMPLEX | **P1** |
| §2 | Immunosenescence timeline | e/b | Lifespan timeline: thymic involution from puberty, TREC/naïve-T decline, naïve→memory/exhausted shift, CMV "memory inflation," rising baseline inflammation. | §2.1–2.4 | TIMELINE | **P1** |
| §1.3 | Acute-resolving vs chronic non-resolving inflammation | c/a | Two parallel process tracks: injury→recruit→clear→**active resolution** (SPMs) vs program-that-never-ends (sterile, smoldering = inflammaging). | §1.3 | QUICK-SVG | P1 |
| §4.1/§7 | Immune-modulator evidence ladder | d | Ranked matrix: vaccines/sleep/exercise/deficiency-correction (proven) → zinc/vitC (narrow) → echinacea/blends (null) → cleanses/IV drips (no evidence). "Regulate, don't boost." | §4 tables, §7 synthesis | MATRIX | **P1** |
| §3.1 | Inflammaging hub | c/g | Sources (SASP/senescent cells, gut leak, visceral fat, DAMPs, failed resolution) → inflammaging → downstream diseases; IL-6/hsCRP marked predictor-not-lever. | §3.1, §3.2 | FLOWCHART | P2 |
| §4.2 | The exercise immune J-curve (honestly corrected) | b | Infection risk vs exercise load: moderate dips below sedentary; the contested "open window" at extreme load drawn dashed (Campbell & Turner correction). | §4.2 | CHART | P2 |
| §1.1 | Innate components × "ages how" | d | The §1.1 table as graphic: barriers/neutrophils/macrophages/DC/NK/complement × function × age-change. | §1.1 table | MATRIX | P3 |
| Framing | "Boost vs regulate" concept | a/g | One-panel contrast: a "boosted" immune system = autoimmunity/allergy/cytokine-storm vs a regulated/resolving one = health. | §0 framing box | QUICK-SVG | P3 |

---

## Chapter 16 — Telomeres & Cellular Aging

| Section | Figure title | Type | What it shows | Source (chapter / claim) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §16.1.2 | **The end-replication problem** | a | Lagging-strand replication: Okazaki fragments + RNA primers, the terminal primer that can't be replaced → sliver lost each division. The "why telomeres shorten" schematic. | §16.1.2 | QUICK-SVG | **P1** |
| §16.1.4 | Telomere clock → Hayflick limit | a/b | Telomere shortening per division → uncapped end → DNA-damage response → p53/p21 → replicative senescence at ~40–60 doublings. | §16.1.4 | QUICK-SVG | P1 |
| §16.3 | **The cancer paradox** | d/c | Two-column: telomeres too short (senescence, stem-cell exhaustion, dyskeratosis/IPF) vs too long / telomerase on (**cancer**), with the arrow the market sells; MR evidence callout. | §16.3; Haycock 2017 MR | MATRIX | **P1** |
| §16.1.1/.3 | Telomere cap + telomerase | a | Chromosome end: TTAGGG repeats, shelterin, single-strand overhang t-loop; telomerase (TERT + TERC RNA template) re-extending the end. | §16.1.1, §16.1.3 | QUICK-SVG | P2 |
| §16.3 | Mendelian randomization: longer telomeres trade off | b | Forest-style chart: genetically longer telomeres → ↑ several cancers, ↓ coronary heart disease (the bidirectional, not-a-free-lunch result). | §16.3; Haycock 2017 | CHART | P2 |
| §16.4 | "Lengthening" evidence grading | d | Matrix of TA-65 / meditation / lifestyle studies × design × what it actually showed × tier — every row surrogate-only/conflicted, none an outcome. | §16.4.1, §16.4.2 | MATRIX | P3 |
| §16.6 | Consumer telomere test — 5 failure modes | g | Infographic: noise / wrong tissue / weak prediction / no action / conflict-of-interest — "a predictor mis-sold as a lever." | §16.6 | QUICK-SVG | P3 |
| §16.5 | Senescence triggers — telomere-dependent vs not | c | Pathway: telomere attrition is *one* entrance; oncogene/DNA-damage/oxidative/proteotoxic stress also → p16/p53 arrest → SASP. | §16.5.2 | FLOWCHART | P3 |

---

## Chapter 11 — Lived-In Body Systems (skin · teeth · bone · eyes · ears · feet · floor)

| Section | Figure title | Type | What it shows | Source (chapter / claim) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §1.5 | **The honest skincare hierarchy** | d | Tier matrix: sunscreen + retinoid (RCT, do-this) → moisturizer/collagen (helps a bit) → peptide/"stem-cell" serums (hype) → tanning beds (net-harm). | §1.5 table | MATRIX | **P1** |
| Verdict | Lived-in systems — best lever per system | g | Composite: 7 systems (skin/teeth/bone/eyes/ears/feet/floor) each with its single best-evidenced, most-skipped lever. | §0 one-line verdict + synthesis | COMPLEX | P1 |
| §3.2 | Bone responds to load, not cardio | b | Bar chart: BMD change from heavy resistance + impact (LIFTMOR) vs walking/swimming (~none). | §3.2; Watson 2018 LIFTMOR | CHART | P2 |
| §3.1 | Hip fracture is a mortality event | b | Excess-mortality chart: ~2–3× vs age-matched peers, highest in first 3–6 months, men worse. | §3.1; Haentjens 2010 | CHART | P2 |
| §2 | Oral–systemic disease links | c/d | Periodontitis → CVD (assoc, lever unproven) / diabetes (lever **proven**, HbA1c↓) / dementia (emerging), edges weighted by evidence strength. | §2.1–2.4 | FLOWCHART | P2 |
| §3.5 | Osteosarcopenia — bone + muscle fail together | a | Overlapping-loop diagram: shared drivers (inactivity, low protein, vit-D, inflammation, hormones) → compounded falls/fracture/mortality; one shared lever. | §3.5 | QUICK-SVG | P3 |
| §5 | Noise dose — every +3 dB halves safe time | b | Log chart of safe exposure time vs intensity from ~85 dB; concerts/tools/earbuds-at-max plotted; 60/60 rule callout. | §5 practical hearing protection | CHART | P3 |

---

## Chapter 17 — Organ Systems Atlas (respiratory · renal · hepatic · digestive · hematologic · reproductive · lymphatic)

| Section | Figure title | Type | What it shows | Source (chapter / claim) | Buildability | Priority |
|---|---|---|---|---|---|---|
| Map | **The 7-system atlas — ages how / lever / tier** | d/g | The system-by-system table as a graphic master map for the atlas (respiratory…lymphatic × ageing × best lever × evidence tier). | "System-by-system map" table | MATRIX | **P1** |
| §1.2 | **Lung-function (FEV₁) decline — Fletcher–Peto** | b | The classic diagram: FEV₁ vs age for never-smoker vs smoker (steeper) vs quitter (slope resets, loss not recovered). | §1.2; Fletcher & Peto 1977 | CHART | **P1** |
| §1.5 | VO₂max → mortality dose-response | b | Monotonic mortality fall with fitness, no upper limit; lowest quintile rivals smoking/diabetes (Mandsager 122k tests). | §1.5; Mandsager 2018 | CHART | P1 |
| §2.1 | Nephron / kidney schematic | f/a | Labeled nephron (glomerulus, tubule) + the "silent organ" framing — lose half before symptoms. | §2.1 | REAL-MEDIA | P2 |
| §2.2 | eGFR decline with age | b | eGFR ~0.8–1 mL/min/1.73m²/yr fall after ~40; CKD-stage threshold line; "predictor, lever is upstream." | §2.2 | CHART | P2 |
| §3.2 | MASLD progression spectrum + reversal | c/a | Steatosis → MASH → fibrosis → cirrhosis → HCC arrow, with the ≥7–10% weight-loss reversal point marked (Vilar-Gomez dose-response). | §3.2, §3.4 | QUICK-SVG | P2 |
| §5.2 | Iron — the two-sided element | a/d | Split diagram: deficiency (anemia → hunt occult bleed) vs overload (HFE → phlebotomy is the cure); dose-makes-the-poison. | §5.2 | QUICK-SVG | P3 |
| §8 | Detox/cleanse debunk | g | Infographic: liver + kidney detoxify continuously, lymph self-drains, movement is the pump — juices/MLD-on-healthy do nothing. | §3.5, §7.3, §8.4 | QUICK-SVG | P3 |
| §4.4 | Fiber — hard-endpoint dose-response | b | Higher fiber → 15–30% lower all-cause/CVD mortality (Reynolds 2019 Lancet). | §4.4 | CHART | P3 |

---

## Chapter 42 — Sexual & Reproductive Health

| Section | Figure title | Type | What it shows | Source (chapter / claim) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §2.1 | **Menstrual-cycle hormone curve** | b | The canonical 28-day figure: FSH/LH (with ovulatory LH surge), estrogen, progesterone; ovarian (follicular/ovulation/luteal) + uterine (menstrual/proliferative/secretory) phase bands. | §2.1 | CHART | **P1** |
| §3 | **Contraception effectiveness — typical vs perfect use** | b | Sorted bar chart of 1st-year failure: implant/IUD (~0.05–0.8%) … pill/patch/ring (~7%) … condom (~13%) … withdrawal (~20%); typical-vs-perfect gap shown. LARC 20–50× the pill. | §3 table; Trussell 2011, Winner 2012 | CHART | **P1** |
| §4.2 | IVF live-birth success by maternal age | b | Bar chart: <35 (~40–50%) → >42 (<5%) live birth per own-egg cycle; donor-egg line flat at donor's age. | §4.2 table | CHART | P2 |
| §1 | HPG axis — male steady set-point vs female oscillator | a | Two control diagrams: male GnRH→LH/FSH→T steady band vs female ~28-day oscillator with engineered positive-feedback LH surge. | §1 hormonal cycles | QUICK-SVG | P2 |
| §1 | Ovarian reserve over the lifespan | b | Egg count vs age: ~6–7M fetal → ~1–2M birth → ~400k puberty → ~0 menopause; quality falls steeply after mid-30s. | §1 female system | CHART | P2 |
| §6.1 | STIs at a glance | d | Matrix: chlamydia/gonorrhea/syphilis/HIV/HPV/HSV/trich × agent × symptomatic? × curable/manageable/vaccine-preventable; HPV-vaccine headline. | §6.1 table | MATRIX | P2 |
| §6.2 | ED as a cardiovascular warning light | c | Pathway: small penile arteries clog first → ED precedes coronary events by years → work-up trigger, not just a pill. (Canonical here; cross-ref §17 §6.3.) | §6.2; Inman 2009 | FLOWCHART | P2 |
| §1 | Shared embryonic origin — reproductive homology | a | Bipotential gonad + SRY switch → male/female; homology map (ovary↔testis, clitoris↔penis, labia↔scrotum). | §1 common embryonic plan | QUICK-SVG | P3 |
| §2.2 | Gynecologic disorders matrix | d | PCOS / endometriosis / fibroids / PMDD / AUB / adenomyosis × what it is × honest framing × first-line lever. | §2.2 table | MATRIX | P3 |

---

## Summary

- **Total figures proposed: 65** across 8 chapters (7–9 each).
- **By priority:** P1 = 18, P2 = 26, P3 = 21.

### Top 5 (highest leverage, build first)
1. **12-organ-systems navigation map** (Ch 18 §B.3) — the book's master index figure; COMPLEX infographic.
2. **Menstrual-cycle hormone curve** (Ch 42 §2.1) — canonical, expected, and currently missing; CHART.
3. **Endocrine axes feedback diagram — HPA/HPG/HPT** (Ch 13) — teaches the control law the whole chapter hangs on; COMPLEX SVG.
4. **Contraception effectiveness chart** (Ch 42 §3) — carries the single most counter-intuitive fact (LARC 20–50× the pill); CHART.
5. **Neuron + action-potential schematic** (Ch 14 §1.2) — a canon `05-biophysics` foundation; QUICK-SVG (+ paired voltage-trace CHART).

Runners-up that nearly made it: innate-vs-adaptive immunity map (15), immunosenescence timeline (15), telomere cancer-paradox (16), FEV₁ Fletcher–Peto decline (17), hormone-change-with-age chart (13).

### Type breakdown (primary tag)
- **(a) Procedural SVG:** ~17 (neuron, axes loops, end-replication, synapse, fuel/oxygen chains, etc.)
- **(b) Data chart (matplotlib):** ~21 (menstrual curve, contraception, FEV₁, IGF-1 U-shape, cortisol rhythm, IVF, eGFR, J-curve…) — the largest bucket.
- **(c) Flowchart / pathway:** ~7 (inflammaging hub, oral-systemic, ED→CVD, MASLD spectrum, nociception, senescence triggers).
- **(d) Matrix / heatmap:** ~12 (variant table, neurotransmitter table, evidence ladders, STI/gyn matrices, skincare hierarchy, cancer-paradox).
- **(e) Timeline:** ~1 primary (immunosenescence) + 1 hybrid (insulin early-warning).
- **(f) Real media (Wikimedia/PD):** ~3 primary (endocrine gland map, nephron, tissue-types) — all need **new** open-license pulls; on-hand 29 are musculoskeletal and don't cover this cluster.
- **(g) Infographic composite:** ~4 (organ-systems nav map, lived-in-systems verdict, detox debunk, immune boost-vs-regulate) — typically COMPLEX builds.

**Buildability skew:** mostly QUICK-SVG + CHART (fast, deterministic, cairosvg/matplotlib). 4 COMPLEX composites (the two nav/atlas maps + the two multi-axis diagrams) are the only heavy lifts. 3 REAL-MEDIA items are the only external-dependency rows (need Wikimedia sourcing pass).
