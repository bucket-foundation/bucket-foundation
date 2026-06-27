# Domain D — Metabolic Health & Nutrition

> **Status:** v0.1 (Wave 1) — 2026-06-27. Graded claim set; companion data in `D-claims.json` (26 claims).
> **Discipline:** human metabolic physiology + nutrition science. The **outcome/application layer** — where a
> claim rests on a nutrient-sensing foundation (mTOR, IGF-1, AMPK, ketone signaling) it carries a
> `canon_link` UP to `bucket-canon/05-biophysics/`.
>
> **The governing rule:** a *mechanism* is never laundered into an *outcome*; a *cohort association* is never
> laundered into *causation*. This domain is where the gap is widest and the marketing is loudest. "Glucose
> spikes vary between people" (mechanism, real) is not "wearing a CGM makes a healthy person live longer"
> (outcome, unproven). "Protein activates mTOR" (mechanism) is not "eating protein shortens your life"
> (outcome — and, as the primary data show, age-dependent and often reversed). Tiers below make every gap explicit.

## How to read this domain
The honest structural fact: **almost nothing here has a hard-endpoint (mortality) RCT** — you cannot randomize
humans to decades of a diet. The strongest human evidence is either (a) RCTs on *surrogate* markers (CALERIE,
TRE trials, FMD, PREDIMED) or (b) *cohort* associations (protein/IGF-1, linoleic-acid biomarkers). Animal
lifespan data (Solon-Biet, ketogenic mice, FMD mice) is mechanistically rich but does not transfer to a human
outcome. Where a field is *polarized but low-rigor* (seed oils, Blue-Zone counting, consumer CGM), the file says
so and grades both sides down to the actual evidence.

---

## 1. Insulin sensitivity, glucose regulation & CGM — does CGM help non-diabetics? (graded honestly)

- **Personalized glycemic response — Zeevi, Korem, Segal et al., Cell 2015** (`10.1016/j.cell.2015.11.001`,
  n=800 + microbiome): postprandial glucose to the *same meal* varies widely between people; an ML model
  beats carb-counting at prediction; a 1-week personalized-diet arm lowered spikes. `cohort`/mechanism — the
  scientific seed under DayTwo/ZOE-style personalized nutrition.
- **Glucotypes — Hall & Snyder, PLoS Biology 2018** (`10.1371/journal.pbio.2005143`, n=57): CGM in
  *non-diabetics* shows many normoglycemic people spend time in pre-diabetic/diabetic ranges an HbA1c misses.
  `cross-sectional` — proves *variability exists*, nothing about outcomes.
- **The honest gap (`cgm-healthy-no-outcome-rct`, tier `theoretical`/absence-of-evidence):** **no RCT shows
  CGM in metabolically healthy people improves any hard health or longevity outcome.** CGM is genuinely useful
  in diabetes management; its wellness use in healthy people is biomarker-, engagement- and narrative-driven.
  Graded `refutes` against the marketed claim — not given a fabricated supportive citation. See
  `conflict-cgm-healthy-utility`.

## 2. Caloric restriction — the CALERIE human trial

- **Kraus et al., Lancet Diabetes & Endocrinol 2019** (`10.1016/S2213-8587(19)30151-2`): the only long-term
  randomized human CR trial. ~12% CR (target was 25%) for 2 years in healthy non-obese adults broadly improved
  cardiometabolic risk markers (LDL, BP, CRP, insulin sensitivity) without quality-of-life harm. `rct`,
  surrogate endpoints.
- **Waziry et al., Nature Aging 2023** (`10.1038/s43587-023-00432-y`): in CALERIE, CR slowed the **DunedinPACE**
  pace-of-aging biomarker by ~2-3%; first-gen methylation clocks (Horvath/PhenoAge/GrimAge) did **not** move.
  `rct`, surrogate (aging biomarker). First RCT evidence CR moves a human pace-of-aging metric — small, and
  clock-dependent. Bridges Domain C (epigenetic clocks).

**Watch the gap:** CALERIE is surrogate-only and the achieved CR was modest (~12%). It cannot tell us about
human lifespan — that RCT is infeasible. The primate CR survival debate (Wisconsin vs NIA) is logged separately
in `conflict-cr-primate-survival` (Domain B).

## 3. Intermittent fasting / time-restricted eating — be skeptical (many null/modest results)

- **Mechanism — de Cabo & Mattson, NEJM 2019** (`10.1056/NEJMra1905136`): the metabolic-switching/ketone +
  cellular-stress-response rationale. `mechanistic` review *by proponents* — frames, doesn't prove.
- **Early TRF works mechanistically — Sutton, Peterson et al., Cell Metab 2018** (`10.1016/j.cmet.2018.04.010`):
  6-h *early* window, isocaloric, **no weight loss**, yet improved insulin sensitivity, β-cell function, BP,
  oxidative stress. `rct` but n=8, men, prediabetic, 5 weeks. The best evidence that *timing* (circadian
  alignment) matters independent of calories. Bridges Domain I.
- **...but the popular late 16:8 is mostly null — Lowe (TREAT), JAMA Intern Med 2020**
  (`10.1001/jamainternmed.2020.4153`, n=116): prescriptive 16:8 with no calorie counting produced **no
  significant weight loss** vs controls and a possible **lean-mass loss**. `rct`. Skeptic anchor.
- **TRE adds nothing beyond calorie restriction — Liu, NEJM 2022** (`10.1056/NEJMoa2114833`, n=139, 12mo):
  CR+TRE = CR alone. `rct`. The cleanest timing-vs-calories isolation: matched calories erase the window's edge.
- **Alternate-day fasting not superior — Trepanowski (Varady lab), JAMA Intern Med 2017**
  (`10.1001/jamainternmed.2017.0936`, n=100, 1yr): ADF = daily CR on outcomes, **worse adherence**. `rct`.
- **Modest TRE effect — Cienfuegos, Cell Metab 2020** (`10.1016/j.cmet.2020.06.018`): 4h/6h windows gave
  modest weight loss + lower insulin. `rct`, small.

**Net read:** the durable, replicated signal is that *most real-world TRE benefit is calorie restriction by
another route* (Liu, Trepanowski, Lowe). The exception worth keeping is **meal timing / circadian alignment**
(Sutton eTRF) — a mechanism, weight-independent, but tiny and short. See `conflict-tre-efficacy-vs-cr`.

## 4. Fasting-mimicking diet (Longo / ProLon)

- **Human — Wei, Longo et al., Sci Transl Med 2017** (`10.1126/scitranslmed.aai8700`, n~100): 3 monthly 5-day
  FMD cycles lowered weight, trunk fat, BP, **IGF-1**, glucose, CRP — larger in higher-risk participants. `rct`,
  surrogate. **COI:** Longo co-founded L-Nutra (ProLon).
- **Animal — Brandhorst, Longo et al., Cell Metab 2015** (`10.1016/j.cmet.2015.05.012`): periodic FMD in mice →
  multi-system regeneration, less cancer, extended healthspan/median lifespan. `animal` + human pilot. Mouse
  lifespan ≠ human outcome. Mechanistically anchors FMD to IGF-1/mTOR downregulation — the bridge to the protein
  conflict below.

## 5. Ketosis & metabolic flexibility

- **Mouse longevity — Roberts, Newman, Verdin et al., Cell Metab 2017** (`10.1016/j.cmet.2017.08.005`): a
  *cyclic, isocaloric* ketogenic diet extended median lifespan and healthspan in mice — designed to separate
  ketosis from obesity. `animal`. No human keto-longevity outcome exists; ad-lib high-fat keto raises distinct
  ApoB/LDL questions (Domain L) not captured here.
- **BHB is a signaling molecule — Newman & Verdin, Annu Rev Nutr 2017** (`10.1146/annurev-nutr-071816-064916`):
  β-hydroxybutyrate inhibits class-I HDACs, blocks the NLRP3 inflammasome, binds GPCRs. `mechanistic` — explains
  *how* ketosis could act beyond fuel; does not prove a human clinical/longevity benefit. UP-link to biophysics
  canon (ketone-body metabolism, metabolite signaling).
- **Metabolic flexibility** (the capacity to switch fuels) is the shared thread linking CR, fasting, ketosis,
  and Zone-2 (Domain E, `lactate-threshold-metabolic-flexibility-zone2`).

## 6. The PROTEIN ↔ mTOR ↔ longevity conflict (primary papers, both sides, age-dependent)

This is the domain's headline open conflict (`conflict-protein-mtor-longevity` — deepened in CONFLICTS.md).
The two camps are *not* actually contradicting the data once you read age-stratification:

**Side A — protein/IGF-1/mTOR accelerates aging (Longo, Simpson/Le Couteur):**
- **Levine & Longo, Cell Metab 2014** (`10.1016/j.cmet.2014.02.006`): in NHANES, high protein at **ages 50-65**
  → ~75% ↑ all-cause and ~4x cancer mortality (tracking IGF-1); **but at 65+ the association REVERSED — protein
  was protective.** `cohort` + mouse tumor data. *The paper itself is age-dependent* — the "protein is bad"
  headline omits its own elderly reversal.
- **Solon-Biet et al., Cell Metab 2014** (`10.1016/j.cmet.2014.02.009`): in mice, a **low-protein/high-carb**
  ratio (not CR) maximized lifespan via mTOR/FGF21/BCAA sensing. `animal` — strongest controlled support for
  protein-restriction-extends-lifespan.
- **Guevara-Aguirre & Longo, Sci Transl Med 2011** (`10.1126/scitranslmed.3001845`): Laron-syndrome
  (low-IGF-1) humans show near-absence of cancer/diabetes. `cohort`. *Caveat:* they do **not** live longer on
  average — disease-specific protection, not lifespan extension.

**Side B — protein protects, especially older adults (Attia, Phillips, Galpin):**
- **Bauer et al. (PROT-AGE), JAMDA 2013** (`10.1016/j.jamda.2013.05.021`): older adults need **more** protein
  (~1.0-1.2 g/kg/d, up to 1.5 in illness) to overcome anabolic resistance and prevent sarcopenia. `meta`/consensus.
- **Morton & Phillips, BJSM 2018** (`10.1136/bjsports-2017-097608`, 49 RCTs): protein augments
  resistance-training muscle/strength gains, plateauing ~**1.6 g/kg/d**. `meta`. The functional-muscle optimum
  is far ABOVE the longevity-restriction prescription.

**Resolution direction (status `open`, age/context-dependent):** the conflict largely dissolves on the **age
axis** — Levine's own data flips at 65, PROT-AGE governs the elderly, Solon-Biet/Longo govern mid-life and the
mechanism. The real tradeoff is **cancer/IGF-1 risk in mid-life vs sarcopenia/frailty/all-cause risk in late
life**, modulated by *protein source* (animal vs plant), *leucine/BCAA load*, and *resistance training* (which
re-partitions protein toward muscle). Not one answer. Bridges Domain E (sarcopenia, resistance training) and
Domain B (nutrient-sensing hallmark). Canon link: `bucket-canon/05-biophysics/` (mTOR, IGF-1, FGF21).

## 7. Seed oils / linoleic acid (polarized, low rigor — graded as such)

The weight of *higher-tier* evidence runs **against** the popular "seed oils are uniquely toxic" claim, but no
camp has hard-endpoint proof. Logged as `conflict-seed-oils-linoleic-acid`.
- **Skeptic side (LA harmful):** **Ramsden et al., BMJ 2016** (`10.1136/bmj.i1246`) — recovered Minnesota
  Coronary Experiment: replacing saturated fat with LA-rich oil lowered cholesterol but gave **no CHD/mortality
  benefit** (possible harm in elderly). Labeled `rct` but it's a 1968-73 trans-fat-era trial with incomplete
  recovered data — **low rigor**. **DiNicolantonio & O'Keefe, Open Heart 2018** (`10.1136/openhrt-2018-000898`)
  — the OXLAM (oxidized-linoleic-acid) `hypothesis`; mechanistic narrative, no human outcome trial.
- **Mainstream side (LA neutral/beneficial):** **Mozaffarian, PLoS Med 2010** (`10.1371/journal.pmed.1000252`)
  — meta of RCTs: PUFA replacing saturated fat cut CHD ~19%. `meta`. **Marklund, Circulation 2019**
  (`10.1161/CIRCULATIONAHA.118.038908`) — pooled *biomarker* cohorts: higher linoleic acid → **lower** CVD and
  mortality. `cohort`, objective intake measure.
- **The honest middle:** **Hooper, Cochrane 2018** (`10.1002/14651858.CD011094.pub4`) — increasing omega-6
  makes **little or no difference** to CVD/mortality; evidence low-moderate quality. `meta`. Neither camp's
  strong claim survives. This is the "we don't actually know, and the certainty is the tell" anchor.

## 8. Mediterranean / Blue Zones (note the data-quality critiques)

- **PREDIMED — Estruch et al., NEJM 2018 (republished)** (`10.1056/NEJMoa1800389`): MedDiet + EVOO/nuts cut
  major CV events ~30% (HR ~0.69) in high-risk adults. `rct` — the strongest dietary-pattern RCT, **with an
  asterisk**: the 2013 original was retracted and republished after randomization irregularities (some sites
  enrolled non-randomly); the corrected analysis still showed benefit, framed cautiously.
- **Blue Zones data-quality critique — Saul Justin Newman, bioRxiv 2019** (`10.1101/704080`, Ig Nobel 2024):
  extreme-longevity clustering correlates with **poor birth registration, poverty, and pension-fraud
  incentives** — patterns of clerical error / age exaggeration, not genuine survival. `theoretical`/preprint,
  contested. It does **not** prove Blue-Zone diets are worthless — it undercuts the *centenarian-counting* data
  the marketing rests on. The dietary-pattern case (PREDIMED) stands on separate, stronger footing.

---

## Cross-links
- **UP to canon:** mTOR / IGF-1 / FGF21 nutrient sensing, ketone-body signaling, AMPK → `bucket-canon/05-biophysics/`.
- **SIDEWAYS:** protein×resistance-training ↔ Domain E (sarcopenia, hypertrophy); CR pace-of-aging ↔ Domain C
  (epigenetic clocks); meal timing ↔ Domain I (circadian/SCN); fasting/ketones/hormesis ↔ Domain H (hormesis
  frame), Domain B (nutrient-sensing hallmark, autophagy); CGM/ApoB/LDL ↔ Domain L (biomarkers).
- **PROTOCOLS:** to be separated into `04-protocols/D-nutrition-protocols.md` (protein-per-meal/leucine dosing,
  TRE windows, FMD/ProLon cycles, MedDiet pattern) — kept distinct from these efficacy claims.

## Gaps flagged for Wave 2
See `_D-SUMMARY.md`. Headline: ZOE/PREDICT large-scale CGM+microbiome RCT readouts; protein *source* (animal vs
plant) and BCAA/leucine-specific mortality data; continuous-glucose **outcome** trials in non-diabetics (the
missing study); ApoB/LDL response to ketogenic diets in lean-mass-hyper-responders; metformin×exercise and
fasting×exercise interactions (bridge E); fiber/short-chain-fatty-acid and microbiome mechanisms; the
animal-vs-plant-protein and IGF-1-mid-life-vs-late-life stratified human cohorts that would actually resolve the
protein conflict.
