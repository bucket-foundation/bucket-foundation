# Visual Design Spec — Clinical & Disease Cluster

> **Reviewer scope:** 13 chapters of the AGFarms / Bucket Foundation health manual — the
> disease + clinical + emergency cluster. This is a **buildable spec list**, not the graphics.
> Each row is a candidate figure with its build-tool tag, source anchor, buildability, and priority.
>
> **Build tooling legend**
> | Tag | Tool |
> |---|---|
> | **(a)** | PROCEDURAL SVG (cairosvg) |
> | **(b)** | DATA CHARTS (matplotlib) |
> | **(c)** | DECISION FLOWCHARTS / algorithms |
> | **(d)** | MATRIX / HEATMAP |
> | **(e)** | TIMELINES |
> | **(f)** | REAL MEDIA (Wikimedia open-license) |
> | **(g)** | INFOGRAPHIC |
>
> **Buildability:** QUICK-SVG · CHART · FLOWCHART · ANATOMICAL · REAL-MEDIA · COMPLEX
> **Priority:** P1 (build first — life-saving / spine-of-chapter / high-leverage) · P2 · P3
>
> Highest-leverage class in this cluster = **decision flowcharts / action algorithms** (esp.
> emergency first-aid) and **risk-stratification charts**. The emergency action cards (CPR,
> BE-FAST, anaphylaxis, choking, bleeding, naloxone, sepsis) are the literal life-saving figures
> and are all **P1**.

---

## 34 — Emergency, Acute Care & First Aid  *(the life-saving cluster — every recognition→action card is P1)*

| Section | Figure title | Type | What it shows | Source (anchor) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §2.1 Hands-only CPR | **Hands-Only CPR Action Card** | a / g | Center-of-chest, **rate 100–120/min**, **depth ~2 in / 5–6 cm**, full recoil, *Stayin' Alive* tempo, switch every ~2 min, don't stop except for AED | Hasselqvist-Ax NEJM 2015 `10.1056/NEJMoa1405796` (10.5% vs 4.0% survival) | QUICK-SVG | **P1** |
| §3.2 Stroke | **BE-FAST Stroke Recognition Card** | a / g | 6 panels: **B**alance, **E**yes, **F**ace droop, **A**rm drift, **S**peech, **T**ime (note onset; call 911) — ties to 4.5 h thrombolysis / 24 h thrombectomy windows | §3.2; cross-ref `24 §3` | QUICK-SVG | **P1** |
| §3.3 Anaphylaxis | **Anaphylaxis: Epinephrine-First Sequence** | a / c | Ordered steps: epinephrine to outer thigh FIRST → 911 → lie flat/legs up → repeat in 5–15 min → ER regardless (biphasic risk). Recognition signs strip (hives + lip/tongue/throat swelling, wheeze, collapse) | JTF 2020 `10.1016/j.jaci.2020.01.017` | QUICK-SVG | **P1** |
| §3.6 Choking | **Choking Response: 5 Back Blows + 5 Heimlich** | a / c | Alternate **5 back blows / 5 abdominal thrusts**; collapse → CPR, no blind sweeps; infant variant (5 back + 5 chest, never abdominal); pregnant/obese = chest thrusts | §3.6 | QUICK-SVG (ANATOMICAL body outline) | **P1** |
| §3.5 Severe bleeding | **Stop-the-Bleed: Pressure → Tourniquet** | a / c | Direct firm pressure first; life-threatening limb bleed → tourniquet **2–3 in above wound, high & tight, NOT over a joint**, tighten until stops, **note time** | Kragh Ann Surg 2009 `10.1097/SLA.0b013e31818842ba` | QUICK-SVG (ANATOMICAL limb) | **P1** |
| §3.7 Opioid overdose | **Opioid Overdose: Naloxone-First Protocol** | a / c | Recognize (unresponsive + slow/absent breathing + pinpoint pupils + blue lips) → naloxone nasal → 911 → support breathing → repeat q2–3 min → stay (naloxone wears off 30–90 min) | Walley BMJ 2013 `10.1136/bmj.f174` | QUICK-SVG | **P1** |
| §3.4 Sepsis | **Sepsis Red-Flag Checklist ("say SEPSIS")** | a / g | Infection PLUS: confusion/slurred speech, extreme shivering OR abnormally low temp, no urine all day, severe breathlessness, "I feel I might die," mottled/blue skin → ER, say the word | Surviving Sepsis 2021 `10.1097/CCM.0000000000005337`; Rudd Lancet 2020 (48.9M cases / 11M deaths) | QUICK-SVG | **P1** |
| §1.1 / §0.x | **Emergency "Recognize → Act" Master Wallet Card** | g / a | Single one-page grid: each emergency (cardiac arrest, stroke, anaphylaxis, choking, bleed, overdose, sepsis) × recognize / act / call. The chapter's "wallet card" §"Recognize → Act, one more time" | §1.1 master table + §"wallet card" | QUICK-SVG (multi-panel) | **P1** |
| §4.1 Burns | **Burn First Aid: 20-Minute Cool-Water Protocol** | a / c | DO: cool running water ~20 min (within 3 h), remove rings, cling-film cover. DON'T: butter/oil/ice/blister-bursting. ER triggers (face/hands/genitals, circumferential, airway) | §4.1 | QUICK-SVG | P2 |
| §4.6 Seizures | **Seizure Response: Don'ts + Recovery Position** | a / c | Cardinal DON'Ts (nothing in mouth, don't restrain) + DO (time it, clear objects, cushion head, recovery position after) + call-911 thresholds (>5 min, repeats, first-ever) | §4.6 | QUICK-SVG | P2 |
| §6.2 Heat stroke | **Heat Stroke: Cool-First, Transport-Second** | a / c | Core temp ≳40 °C + altered mental status → cold-water immersion gold standard / dowse+fan+ice to neck-armpit-groin; antipyretics don't work | §6.2 | QUICK-SVG | P3 |

---

## 22 — Disease Atlas I: Cardiometabolic, Endocrine & Renal

| Section | Figure title | Type | What it shows | Source (anchor) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §1.1 CAD/MI | **The apoB Atherosclerosis Cascade** | a / c | Retention→oxidation→foam-cell→plaque→rupture; one apoB per particle; non-obstructive plaque rupture causes most MIs; lowering apoB regresses plaque | `L-biomarkers` claim `apob-superior-to-ldlc`; FOURIER | QUICK-SVG (cross-section ANATOMICAL) | **P1** |
| §6.1 CKD | **KDIGO CKD Heat Map (GFR × Albuminuria)** | d | 6 GFR rows (G1 ≥90 → G5 <15) × 3 albuminuria cols (A1/A2/A3) green→red risk grid; albuminuria independent of GFR | KDIGO; lines 474–480 (albuminuria cutoffs from `17`) | MATRIX | **P1** |
| §2.2 T2D | **Type 2 Diabetes Management Ladder** | c / g | Tiered: lifestyle (DPP **58%** vs metformin **31%** progression cut) → metformin (UKPDS) → GLP-1/SGLT2 (EMPA-REG **38%** CV-death cut; semaglutide ~15% wt) → insulin | DPP 2002; UKPDS; EMPA-REG; SELECT | FLOWCHART | **P1** |
| §1.2 HFrEF | **Heart Failure: Four Pillars & Mortality Effect** | b / g | ARNI (PARADIGM-HF, ~20% CV cut, HR 0.84) · beta-blocker (~34%) · MRA (~30%) · SGLT2i (DAPA-HF HR 0.74) — bars of mortality reduction | PARADIGM-HF 2014; DAPA-HF 2019 | CHART | P2 |
| §2.3 T2D remission | **DiRECT: Remission by Weight Loss** | b | Dose-response bars: 46% remission (vs 4% control) at 1 yr; **86% of those losing ≥15 kg**; 36% at 2 yr | DiRECT Lancet 2018 / 2019 | CHART | P2 |
| §2.1 Metabolic syndrome | **Metabolic Syndrome: 5-Component Venn/Cluster** | g | 5 criteria (central adiposity, BP, glucose, triglycerides, low HDL); **≥3 of 5** = cluster; ~2× CV risk | ATP-III standard; lines 222–225 | QUICK-SVG | P2 |
| §1.2 HF phenotypes | **HFrEF vs HFpEF by Ejection Fraction** | g | EF axis: HFrEF ≤40% (weak squeeze) / HFmrEF 40–50% / HFpEF ≥50% (stiff fill); HFpEF ~half & rising | lines 113–117 | QUICK-SVG | P3 |
| §0 map | **Cardiometabolic-Renal "One Machine" Overview** | g | The interlinked failure of one vascular/metabolic system (CAD, HF, AF, T2D, CKD) — anchors the 4-horsemen framing for this cluster | §0 "map at a glance" table | INFOGRAPHIC | P2 |

---

## 23 — Disease Atlas II: Respiratory & GI

| Section | Figure title | Type | What it shows | Source (anchor) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §C1 MASLD/MASH | **MASLD Progression Spectrum + Reversal** | a / c | Steatosis→MASH→fibrosis→cirrhosis→HCC; ~30%+ adults; **≥7% wt resolves MASH, ≥10% regresses fibrosis**; resmetirom / semaglutide new; CV is #1 cause of death | MAESTRO-NASH `10.1056/NEJMoa2309000`; ESSENCE `10.1056/NEJMoa2413258` | QUICK-SVG | **P1** |
| §B7 CRC screening | **Adenoma→Carcinoma Window & Screening** | e / c | ~10–15 yr polyp-to-cancer window = the preventable gap; colonoscopy (NordICC) + FIT; screen from **age 45** | NordICC `10.1056/NEJMoa2208375` | TIMELINE | **P1** |
| §B3 IBS | **Low-FODMAP 3-Phase Protocol** | c | Restriction → systematic reintroduction → personalization (dietitian-guided, not lifelong); ~50–67% respond; soluble fiber helps / insoluble bran worsens | Halmos Gastroenterology 2014 `10.1053/j.gastro.2013.09.046` | FLOWCHART | P2 |
| §A3 OSA | **OSA: Mechanism + CPAP Honest Outcomes** | a / b | Airway collapse → intermittent hypoxia/sympathetic surge → HTN/AF/insulin resistance; SAVE trial: **no CV-event cut** but improved sleepiness/QoL (adherence-limited) | SAVE `10.1056/NEJMoa1606599` | QUICK-SVG + CHART | P2 |
| §A1 Asthma | **Asthma: Type-2 Eosinophilic Inflammation** | a | Th2 → IL-4/5/13 → eosinophils/IgE/mast cells → hyperreactive smooth muscle; obstruction reversible but problem is inflammatory (ICS, not just bronchodilator) | GINA; lines 68–74 | ANATOMICAL (airway) | P2 |
| §B2 PUD | **H. pylori: Chronic→Curable Ulcer** | e / a | 1984 Marshall self-experiment; urease buffering → gastritis/ulcer/cancer; quadruple/vonoprazan eradication cures the diathesis | Marshall MJA 1985; 2006 Nobel | TIMELINE | P3 |
| §C2 Hep C | **Hepatitis C: Interferon → DAA Cure** | e / b | Pre-2014 ~50% cure (1 yr, toxic) vs DAAs **>95% in 8–12 wk pills**; barrier now diagnosis/access | Afdhal NEJM 2014 `10.1056/NEJMoa1402454` | CHART | P2 |

---

## 24 — Disease Atlas III: Neuro & Rheumatology

| Section | Figure title | Type | What it shows | Source (anchor) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §3 Stroke | **Ischemic Stroke: Reperfusion Windows & NNT** | e / b | Thrombolysis 3 h→4.5 h→imaging-selected 24 h; thrombectomy **NNT ≈ 2.6**, doubles functional independence (HERMES); core vs penumbra | NINDS 1995; HERMES `10.1016/S0140-6736(16)00163-X`; HOPE 2025 | TIMELINE + CHART | **P1** |
| §6 Parkinson's | **Parkinson's: Prodrome → Motor Tetrad** | e / a | Non-motor first (constipation, RBD, anosmia, depression) precede motor dx by years–decades; **50–70% SNpc dopaminergic neurons lost** at diagnosis; Braak gut→brain ascent | Bloem Lancet 2021 `10.1016/S0140-6736(21)00218-X` | TIMELINE | **P1** |
| §5 MS | **MS Disease Courses & DMT Efficacy** | b / g | RRMS / SPMS / PPMS courses; >20 DMTs; high-efficacy anti-CD20 cut relapses **70–90%**; "hit hard early" | Reich NEJM 2018 `10.1056/NEJMra1401483` | CHART | P2 |
| §11 Osteoarthritis | **OA: Whole-Joint Disease + X-ray≠Pain** | a / g | 6-component joint (cartilage, subchondral bone, synovium, meniscus, ligament, shape); imaging-pain dissociation; exercise/wt-loss first, no DMOAD, arthroscopy = sham | Hunter Lancet 2019 `10.1016/S0140-6736(19)30417-9` | ANATOMICAL (joint) | P2 |
| §13 Gout | **Gout: Urate Saturation & Treat-to-Target** | a / b | Hyperuricemia (sat ~6.8 mg/dL) → MSU crystals → NLRP3/IL-1β; mostly genetic not dietary; ULT target **<6 mg/dL** dissolves crystals; under-treated | ACR 2020 `10.1002/art.41247`; Choi NEJM 2004 | QUICK-SVG | P2 |
| §8 Neuropathy | **Neuropathic Pain: Symptomatic NNT Ladder** | b | First-line duloxetine/pregabalin/gabapentin/amitriptyline **NNT ~4–8** for 50% relief; glycemic control = only disease-modifier; B6 can cause neuropathy | Finnerup Lancet Neurol 2015 `10.1016/S1474-4422(14)70251-0` | CHART | P3 |
| §7 Migraine | **Migraine Prevention: CGRP Breakthrough** | b | Acute (triptans/gepants/ditans) vs preventive CGRP mAbs (erenumab etc.) cutting **2–3 migraine days/mo over placebo** — advance, not cure | Edvinsson Nat Rev Neurol 2018 `10.1038/s41582-018-0003-1` | CHART | P3 |
| §12 RA | **RA: Treat-to-Target Escalation** | c | Autoantibodies (RF/anti-CCP) years pre-symptom → pannus (TNF/IL-6); methotrexate anchor → biologics/JAK; treat-to-target window-of-opportunity; remission realistic | Smolen Lancet 2016 `10.1016/S0140-6736(16)30173-8` | FLOWCHART | P3 |

---

## 25 — Oncology & Cancer

| Section | Figure title | Type | What it shows | Source (anchor) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §25.1.2 Hallmarks | **Hallmarks of Cancer Wheel (2000→2022)** | g | 14-spoke wheel: original 6 (proliferation, evade suppressors, resist death, replicative immortality [telomerase **85–90%**], angiogenesis, invasion) + 2011 four + 2022 four | Hanahan & Weinberg 2000/2011; Hanahan 2022 | INFOGRAPHIC (radial) | **P1** |
| §25.3 Major cancers | **Cancer Burden & 5-Year Survival** | b | Cases / deaths / 5-yr survival for lung (#1 killer ~125k deaths, 25%), breast (91%), prostate (97%), colorectal (65%), melanoma (94%), pancreatic (**13%**) | ACS 2024; SEER | CHART | **P1** |
| §25.2.2 CRC sequence | **Adenoma→Carcinoma Multi-Hit Sequence** | a / e | Normal→(APC)→adenoma→(KRAS)→(18q/SMAD4)→(TP53)→carcinoma; 2–8 drivers; clonal evolution | Fearon & Vogelstein 1990; Vogelstein Science 2013 | QUICK-SVG | P2 |
| §25.5.2 Immunotherapy | **CheckMate-067: Melanoma 5-yr Survival** | b | Pre-immunotherapy near-uniformly fatal → nivo+ipi **~52% OS at 5 yr**, durable off-treatment remissions | Larkin NEJM 2019; Hodi NEJM 2010 | CHART | P2 |
| §25.2.4 BRCA | **Lifetime Cancer Risk: BRCA1 vs BRCA2** | b | BRCA1 breast 55–72% / ovarian 39–44%; BRCA2 breast 45–69% / ovarian 11–17% | Kuchenbaecker 2017 | CHART | P3 |
| §25.2.1 drivers | **Oncogene/Suppressor Mutation Frequency** | b / d | TP53 ~50% of all tumors; RAS ~25–30% (pancreatic ~90%, CRC ~40%, lung ~30%); HER2/EGFR/BCR-ABL/BRAF examples | lines 131–147 | CHART | P3 |

---

## 07 — Clinical Prevention

| Section | Figure title | Type | What it shows | Source (anchor) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §3 Cancer screening | **Cancer Screening Decision Table (who/when/which/benefit)** | c / d | Colorectal 45–75 (NordICC RR 0.82), lung 50–80/≥20 pk-yr (NLST −20%), breast 40–74 (−20%), cervical 21–65 (Grade A), skin (Grade I, no benefit) | NordICC; NLST/NELSON; Marmot 2012; USPSTF | MATRIX / FLOWCHART | **P1** |
| §3.3 Breast | **Mammography: Benefit vs Overdiagnosis** | g / b | The trade-off: ~3 overdiagnosed per 1 death prevented; ~1 death/235 invited over 20 yr vs ~19% overdiagnosis — visualizes lead-time/overdiagnosis concept | Marmot 2012 (UK Independent Review) | INFOGRAPHIC | **P1** |
| §5 Prevention stack | **Clinical Prevention Roadmap by Decade** | g / d | 20s–70s+ × (cardiovascular / cancer screening / levers): Lp(a) once, CAC at intermediate risk, BP <130/80, screening starts, no primary-prevention aspirin 70+ | SPRINT, NordICC, NLST, ASPREE | INFOGRAPHIC | **P1** |
| §1.1 SPRINT | **SPRINT: Intensive vs Standard BP** | b | Achieved SBP 121.4 vs 136.2; primary composite **HR 0.75**, all-cause mortality **HR 0.73**; stopped early | SPRINT NEJM 2015/2021 | CHART | P2 |
| §1.3 Lifestyle BP | **Lifestyle BP-Lowering Magnitudes** | b | DASH ~5–6, DASH+low-Na up to ~11, Na alone ~2–5, weight ~1/kg, exercise ~5–8 mm Hg | Appel 1997; Sacks 2001 | CHART | P2 |
| §2.1 CAC | **CAC Score Risk Stratification** | b | "Power of zero"; CAC 101–300 ~7.7×, >300 ~9.7× event risk vs zero, independent of risk factors | MESA / Detrano NEJM 2008 | CHART | P3 |

---

## 26 — Infectious Disease & Microbiology

| Section | Figure title | Type | What it shows | Source (anchor) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §3.3 AMR | **Antimicrobial Resistance: Global Burden** | b / e | GRAM 2019: **1.27M deaths directly / 4.95M associated**; rivals HIV+malaria; named threats (MRSA, CRE, MDR/XDR-TB, C. diff, resistant gonorrhea) | Murray Lancet 2022 | CHART (+ timeline option) | **P1** |
| §4.2 Herd immunity | **Herd Immunity Threshold vs R₀** | b / g | Coverage needed rises with transmissibility; measles R₀ 12–18 needs **~95%** — falling coverage breaks first | lines 196–202 | CHART | **P1** |
| §1 Pathogens | **Five Pathogen Classes Comparison** | d / g | Bacteria / viruses / fungi / parasites / prions × biology, mechanism, therapy (antibiotics do nothing to viruses; prions untreatable) | §1 table | MATRIX | P2 |
| §4.3 Vaccines | **Vaccine-Preventable Disease Timeline** | e | Smallpox eradicated (1980), polio >99% (350k→double digits since 1988), measles resurging, HPV/HepB cancer prevention | lines 208–214 | TIMELINE | P2 |
| §5.4 Sepsis | **Sepsis: Burden + Recognition** | g / b | 48.9M cases / 11M deaths 2017 (~1 in 5 deaths); recognition signs; "every hour to antibiotics matters" | Rudd Lancet 2020 | INFOGRAPHIC | P2 *(P1 action card lives in §34)* |
| §5.2 Chronic viruses | **Chronic Viral Infections: Cure/Manage Status** | d | HIV (manage, U=U), HCV (cure >95%/8–12 wk), HepB (prevent/suppress), HPV (prevent cancer), herpesviruses (latency) | HPTN 052; Afdhal 2014 | MATRIX | P3 |

---

## 08 — Brain, Cognition & Dementia

| Section | Figure title | Type | What it shows | Source (anchor) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §1.1 Lancet 2024 | **14 Modifiable Dementia Risk Factors (PAF bar chart)** | b | Horizontal bars sorted by PAF, color-banded by life stage: hearing 7%, LDL 7%, education 5%, isolation 5%, depression 3%, TBI 3%, air pollution 3%, inactivity/diabetes/smoking/HTN 2%, vision 2%, obesity/alcohol 1% → **~45% total** | Livingston Lancet 2024 `10.1016/S0140-6736(24)01296-0` | CHART | **P1** |
| §3.3 FINGER | **FINGER: Multidomain Lifestyle Cognitive Gain** | b | Intervention composite cognition improved **~25%** more than control over 2 yr (diet+exercise+cognitive+vascular) | Ngandu Lancet 2015 `10.1016/S0140-6736(15)60461-5` | CHART | P2 |
| §6.2 Lecanemab | **Lecanemab: Marginal Benefit vs ARIA Risk** | b | CDR-SB −0.45 pts (**~27% slowing**) vs **ARIA-E 12.6% / ARIA-H 17.3%**; clinical-importance threshold line | van Dyck NEJM 2023 `10.1056/NEJMoa2212948` | CHART (waterfall) | P2 |
| §2 ACHIEVE | **ACHIEVE: Hearing Aids & Cognitive Decline** | b | Primary null; at-risk subgroup **~48% slowing** over 3 yr — hearing as a lever not just predictor | Lin Lancet 2023 `10.1016/S0140-6736(23)01406-X` | CHART | P3 |
| §6.1 Shingles | **Shingles Vaccine → Dementia (natural experiment)** | b | Regression-discontinuity at birth-date cutoff: ~3.5 pp absolute / ~20% relative dementia reduction; live vs recombinant | Eyting/Geldsetzer Nature 2025 `10.1038/s41586-025-08800-x` | CHART | P3 |

---

## 20 — Mental Health & Psychiatry

| Section | Figure title | Type | What it shows | Source (anchor) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §0 map | **Psychiatric Conditions: Prevalence & First-Line Tx** | d / g | 8 conditions × lifetime prevalence × first-line treatment (depression 15–20% CBT+AD; anxiety 20–30%; OCD 2–3% ERP; PTSD 6–8%; bipolar 1–2% lithium; schizophrenia ~1%; ADHD ~5%; eating 1–4%) | §0 table (DSM-5/GBD anchored) | MATRIX | **P1** |
| §1.3 Antidepressants | **Antidepressant Effect by Depression Severity** | b | All 21 beat placebo (Cipriani, SMD ~0.30); drug-placebo gap smallest in mild, largest in severe (Fournier); meaningful-difference line | Cipriani Lancet 2018; Fournier JAMA 2010 | CHART | **P1** |
| §3.2 Lithium | **Lithium's Unique Anti-Suicide Signal** | b | Forest/comparison: lithium reduces suicide + all-cause mortality, partly independent of mood effect; best relapse-prevention | Cipriani BMJ 2013 `10.1136/bmj.f3646`; BALANCE | CHART | P2 |
| §4.2 Antipsychotics | **Antipsychotics: Efficacy vs Metabolic Harm** | b / d | Scatter/benefit-risk: all 15 beat placebo, but weight/lipid/glucose burden → **15–20 yr reduced life expectancy** | Leucht Lancet 2013 `10.1016/S0140-6736(13)60733-3` | CHART | P2 |
| §7.1 Eating disorders | **Anorexia Nervosa Mortality (SMR 5–6)** | b | Standardized mortality ratio ~5–6× expected; among the most lethal psychiatric disorders (medical + suicide) | Arcelus Arch Gen Psych 2011 `10.1001/archgenpsychiatry.2011.74` | CHART | P3 |
| §6.4 MDMA | **MDMA-Assisted PTSD: Promise → 2024 FDA Rejection** | b / e | Large PTSD-severity reductions, many no longer meeting criteria; FDA rejected Aug 2024 (unblinding, data-integrity, abuse/CV) | Mitchell Nat Med 2021; FDA 2024 | CHART | P3 |

---

## 35 — Addiction & Substance Use

| Section | Figure title | Type | What it shows | Source (anchor) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §7.1 MAT/MOUD | **MAT/MOUD by Substance & Evidence Tier** | d / c | Opioids (methadone/bup **halve mortality**, detox-alone worse) · alcohol (naltrexone/acamprosate NNT ~12) · tobacco (varenicline 2–3×) · stimulants/cannabis (no drug → behavioral) | Sordo 2017; Jonas 2014; Cahill 2013 | MATRIX | **P1** |
| §3.4 MOUD mortality | **MOUD Halves Overdose & All-Cause Mortality** | b | In-treatment vs out-of-treatment survival; retention is the mechanism; highest-risk window post-discharge/prison | Sordo BMJ 2017 `10.1136/bmj.j1550` | CHART | **P1** |
| §0 map | **Drug Addictiveness vs Lethality Matrix** | d / b | Bubble scatter: transition-to-dependence % (tobacco 68%, opioids 23%, alcohol 22%, cocaine 21%, cannabis 9%, psychedelics very low) vs lethality, sized by prevalence | Lopez-Quintero 2011 `10.1016/j.drugalcdep.2010.11.004` | CHART | P2 |
| §2.2 Cessation | **Smoking Cessation Efficacy vs Placebo** | b | Varenicline 2–3×, combination NRT near-varenicline, cytisine non-inferior, bupropion modest; +behavioral multiplies | Cahill Cochrane 2013; Courtney JAMA 2021 | CHART | P2 |
| §4.2 Stimulants | **Stimulant UD: No Drug vs Contingency Management** | g / b | Pharmacotherapy column empty; CM = strongest evidence + 2025 mortality signal, yet under-deployed | Chan 2019; 2025 mortality cohort | INFOGRAPHIC | P3 |

---

## 21 — Pain, Injury & Rehabilitation

| Section | Figure title | Type | What it shows | Source (anchor) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §2.2 MRI overuse | **Spine MRI Findings in Pain-Free People** | b / d | Brinjikji table: disc degeneration 52%→88%, bulge 40%→69%, protrusion 31%→38%, fissure 20%→29% (age 30→60, asymptomatic) — "wrinkles on the inside" | Brinjikji AJNR 2015 `10.3174/ajnr.A4173` | CHART | **P1** |
| §1.4 Biopsychosocial | **Biopsychosocial Model of Pain** | g | 3 overlapping domains (biological / psychological / social) generating pain & disability; posture-link debunk | Gatchel Psych Bull 2007 `10.1037/0033-2909.133.4.581` | INFOGRAPHIC (Venn) | **P1** |
| §3.2 PEACE & LOVE | **Acute Soft-Tissue Injury: PEACE & LOVE (RICE retired)** | g / a | Two-phase acrostic matrix: PEACE (protect/elevate/avoid anti-inflammatory/compress/educate) → LOVE (load/optimism/vascularization/exercise) | Dubois & Esculier BJSM 2020 `10.1136/bjsports-2019-101253` | INFOGRAPHIC | **P1** |
| §1.1/1.3 | **Nociception ≠ Pain + Central Sensitization** | a / g | Decouples signal from experience (nociception w/o pain; pain w/o nociception); amplifier flipped up → hyperalgesia/allodynia | Woolf Pain 2011 `10.1016/j.pain.2010.09.030` | QUICK-SVG | P2 |
| §5.5 Multimodal | **Chronic Pain Multimodal Stack ("what helps vs what doesn't")** | g / d | Stack of modest levers (exercise, pain education, CBT/ACT, sleep, stress, non-opioid meds, social/work) vs low-value (passive tx, routine imaging, opioids) | Lin BJSM 2020 `10.1136/bjsports-2018-099878` | INFOGRAPHIC / MATRIX | P2 |
| §4.3 Return-to-activity | **Return-to-Sport: Capacity Criteria not Calendar** | g | ≥90% strength symmetry, full pain-free control, sport-specific load w/o flare, low re-injury fear; rushing at 70% drives re-injury | §4.3 | QUICK-SVG | P3 |

---

## 27 — Dermatology, Dental, ENT & Eye

| Section | Figure title | Type | What it shows | Source (anchor) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §A.5 Melanoma | **ABCDE Melanoma Detection (+ Ugly Duckling)** | a / g | Asymmetry, Border irregular, Color varied, Diameter >6 mm, **Evolving (most important)** + ugly-duckling sign; self/derm exam triggers | Abbasi JAMA 2004 `10.1001/jama.292.22.2771` | QUICK-SVG | **P1** |
| §A.5 Skin cancers | **Skin Cancer Lethality Gradient (BCC→SCC→Melanoma)** | d / g | Frequency vs behavior: BCC most common/almost never metastasizes; SCC 2nd/can metastasize; melanoma ~1% but most deaths | §A.5; Green sunscreen RCT | MATRIX | P2 |
| §D.4 Wet AMD | **Anti-VEGF Transforms Wet AMD** | b | MARINA: ~95% lost <15 letters (prevented loss), ~34% gained ≥15 letters vs sham; sudden central distortion = same-week ophthalmology | Rosenfeld NEJM 2006 `10.1056/NEJMoa054481` | CHART | P2 |
| §D.1 Myopia | **Childhood Myopia Prevention: Outdoor Time** | b / a | Guangzhou cluster-RCT: +40 min outdoor class/day over 3 yr cut new myopia; light→retinal dopamine→less axial elongation; ~2 h/day | He JAMA 2015 `10.1001/jama.2015.10803` | CHART | P3 |
| §C.3 BPPV | **BPPV: Epley Maneuver (60-second cure)** | a / c | Otoconia in semicircular canal; Dix-Hallpike dx → Epley repositioning sequence rolls them out; majority resolve single session; avoid meclizine | Hilton & Pinder Cochrane | QUICK-SVG (sequence) | P3 |
| §B.1 Fluoride | **Fluoride Toothpaste: Dose & Mechanism** | b / g | ~24% caries reduction; dose-dependent ≥1000 ppm (adult 1000–1500); spit-don't-rinse; reduce sugar frequency; fluorapatite | Marinho Cochrane 2003; Walsh 2019 | CHART | P3 |
| §D.3 Glaucoma | **Glaucoma: IOP-Lowering Preserves Sight** | b | EMGT progression 45% treated vs 62% control; IOP is both predictor AND proven lever | Heijl Arch Ophthalmol 2002 `10.1001/archopht.120.10.1268` | CHART | P3 |

---

## 43 — Developmental, Congenital & Pediatric

| Section | Figure title | Type | What it shows | Source (anchor) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §6 Milestones | **Developmental Red-Flags Timeline** | e / g | Trajectory > date; language (no babble 12 mo, no words 16 mo, no 2-word 24 mo), motor (no sit 9 mo, no walk 18 mo, early hand pref); **regression always evaluate**; early eval beats wait-and-see | §6; early-intervention literature | TIMELINE | **P1** |
| §3.7 SIDS | **SIDS Prevention: Back-to-Sleep + Safe-Sleep Bundle** | a / g | Prone = ~4× risk; "Back to Sleep" 1994 halved SIDS; bundle (firm flat surface, no soft bedding, room-share not bed-share, no overheat/smoke, breastfeed, pacifier) | Gilbert IJE 2005 `10.1093/ije/dyi088` | QUICK-SVG | **P1** |
| §1.2 Chromosomal | **Trisomies & Sex-Chromosome Disorders Table** | d / g | Down (T21, 1/700, life exp 25→60 yr via care), Turner (45,X), Klinefelter (47,XXY), Edwards/Patau (usually lethal infancy) × genetics/features/prognosis | Antonarakis Nat Rev Dis Primers 2020 | MATRIX | P2 |
| §3.2 ALL | **Childhood ALL: ~0% → ~90% Cure** | b / e | 1960 near-zero → today ~90% cured via decades of cooperative multi-agent trials; survivorship late-effects caveat | Inaba/Greaves/Mullighan Lancet 2013 | CHART | P2 |
| §4 PKU | **PKU: Heel-Prick Screening → Managed Diet** | a / c | PAH defect → Phe accumulates → irreversible ID if untreated; Guthrie blood-spot (1960s) → low-Phe diet prevents entirely; tandem MS now catches dozens of IEMs | §4; newborn-screening literature | QUICK-SVG | P3 |
| §3.1 Vaccines | **Vaccine-Preventable Childhood Disease List** | g | 11 once-killer diseases (measles "immune amnesia," pertussis, diphtheria/tetanus, polio, Hib, pneumococcus, rotavirus, rubella/CRS, varicella) returning where coverage drops | §3.1; cross-ref §26 | INFOGRAPHIC | P3 |

---

## Build-Order Notes

- **Emergency action cards (§34) are the single highest-value batch** — 8 P1 procedural-SVG cards
  (CPR, BE-FAST, anaphylaxis, choking, bleeding, naloxone, sepsis, master wallet card). These are
  literally life-saving and should be built first as a coherent visual set (shared card template).
- **Spine-of-chapter charts** to build alongside: dementia 14-factor PAF bars (§08), Hallmarks wheel
  (§25), cancer-screening decision table (§07), MAT/MOUD matrix (§35), KDIGO CKD heat map (§22),
  stroke reperfusion/NNT (§24).
- **Reusable templates worth standardizing:** (1) emergency recognize→act card; (2) "trial-result
  bar with effect size + harm" chart (recurs across HF pillars, lecanemab, antipsychotics, AMD,
  glaucoma, MS, smoking cessation); (3) staging/risk matrix grid (CKD, pathogen classes, psychiatric
  conditions, MAT, chromosomal, skin cancer).
- BE-FAST appears in both §34 and §24 — build once, cross-reference (§34 owns the action card).
- Sepsis: action card = P1 in §34; the burden/epidemiology infographic in §26 is P2 (don't duplicate).
