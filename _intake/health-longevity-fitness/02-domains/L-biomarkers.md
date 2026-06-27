# Domain L — Measurement & Biomarkers

> **Wave 1, 2026-06-27.** The measurement layer: *what each test actually predicts, and how good the
> measurement is.* Companion machine file: `L-claims.json` (19 graded, DOI-sourced claims).
> Practical capstone: `04-protocols/WHAT-TO-TRACK-SYNTHESIS.md`.
>
> **Discipline for this domain (two extra hazards on top of the usual mechanism≠outcome rule):**
> 1. **A biomarker is a READOUT, not a lever.** Most things here PREDICT mortality without being CAUSAL
>    (grip, gait, HRV, hsCRP, biological-age clocks). Training the marker is not the same as moving the
>    outcome. The exceptions that *are* causal (apoB/LDL, Lp(a)) are flagged explicitly.
> 2. **Measurement validity is itself a tier.** A consumer "VO2max", "deep-sleep %", "biological age" or
>    "glucose spike" can be wrong by a lot. Where the *device/assay* is the weak link, that is graded
>    separately from whether the underlying biomarker predicts anything.

---

## L.1 Cardiorespiratory fitness — VO2max (the strongest single predictor)

VO2max is the single strongest exercise-related predictor of all-cause mortality. The *magnitude* lives in
Domain E (`crf-vo2max-strongest-mortality-predictor` — Mandsager 2018, ~5x low-vs-elite; `crf-per-met-mortality-meta`
— Kodama 2009, ~13% per MET). This file covers the **measurement side**:

- **`vo2max-gold-standard-clinical-vital-sign`** (Ross 2016 AHA, `cohort`/scientific statement). CRF should be
  treated as a clinical vital sign; it reclassifies risk beyond standard factors.
- **Gold standard = CPET** (cardiopulmonary exercise test, measured gas exchange). Treadmill/cycle time and
  validated submaximal tests are good proxies that carry most of the mortality data.
- **Honest caveat:** consumer-wearable and non-exercise *estimated* VO2max carry large individual error — they
  are **trend tools, not calibrated risk instruments**. The cohort risk figures come from measured CRF.

**Verdict:** highest-signal functional biomarker in the whole corpus. Worth measuring directly if you can;
worth tracking by proxy (pace at fixed HR, a hard 1-mile/Cooper test) if you can't.

---

## L.2 DEXA — bone, body composition, and the mass-vs-strength trap

DEXA does three jobs of very different evidentiary strength:

- **Bone (its best use).** `dexa-bmd-predicts-fracture` (Marshall 1996 BMJ, `meta`): each 1-SD lower BMD ≈
  1.5–3x fracture risk; DXA is the reference test for osteoporosis. **But** because most people sit in the
  non-osteoporotic range, the *majority of fragility fractures happen in people without osteoporotic BMD*
  (low sensitivity) — hence FRAX combines BMD with clinical risk factors.
- **Body composition — the mass-vs-strength trap.** `dexa-strength-not-mass-predicts-mortality` (Newman 2006
  Health ABC, `cohort`): DXA-measured **lean mass does NOT independently predict mortality once strength is
  accounted for**; *strength* does. This is the empirical root of the EWGSOP2 mass→strength reframe (Domain E).
  Practical upshot: for longevity the **cheap function tests out-predict the expensive lean-mass scan**.
- **Fat distribution.** `visceral-fat-independent-mortality-predictor` (Kuk 2006, `cohort`): visceral adipose
  tissue predicts mortality beyond BMI/waist. CT/MRI are the imaging reference; **DXA VAT is an estimate**
  (good correlation, not interchangeable).

**Verdict:** excellent for **bone**; useful for **fat distribution / tracking trends**; over-rated as a
longevity scorecard via **lean mass** (function beats mass).

---

## L.3 Grip strength & gait speed — the stopwatch biomarkers

The cheapest high-signal tests in geriatrics. (Grip's flagship cohort, PURE/Leong 2015, is in Domain E:
`grip-strength-mortality-pure`, `grip-strength-biomarker-aging`.)

- **`gait-speed-survival-studenski`** (Studenski 2011 JAMA, pooled 9 cohorts ~34k, `cohort`): usual gait speed
  predicts survival across its whole range, rivaling a multi-variable clinical model; ~12% lower mortality per
  0.1 m/s faster.
- **`gait-speed-mortality-meta`** (Veronese 2018 JAMDA, `meta`): confirms generalizability.
- **`physical-capability-battery-mortality-meta`** (Cooper 2010 BMJ, `meta`): grip, gait, chair-rise AND
  standing balance each independently predict mortality (grip HR ~1.67, gait ~2.87, chair-rise ~1.96, balance
  ~2.14, weakest vs strongest).

**Verdict:** four stopwatch/dynamometer tests rival expensive panels for prognosis. They are **biomarkers of
integrated organ-system reserve** (cardiopulmonary + neuromuscular + cognitive), and partly reflect
**reverse causation** (subclinical disease slows you down) — so improving them on command is not proven to
lower mortality, but they are superb *monitors*.

---

## L.4 The blood panel — graded by what each marker actually does

### The two CAUSAL ones (rare in this corpus — pull these levers)
- **`ldl-apob-causal-ascvd`** (Ference 2017 EAS consensus + Richardson 2020 MR, `meta`): LDL/apoB-containing
  lipoproteins **cause** atherosclerosis — genetics + epidemiology + RCTs converge — and it's **cumulative
  lifetime exposure** that matters. One of the very few genuinely causal outcome claims here.
- **`apob-superior-to-ldlc`** (Sniderman 2019/2011 + Marston 2022, `meta`): **apoB (particle number) is the
  better metric than LDL-C (cholesterol mass)**; when they disagree (high-triglyceride / diabetic / metabolic-
  syndrome states), risk tracks apoB. One apoB measure subsumes the LDL-C/non-HDL/particle debates.
- **`lpa-causal-genetic-cvd`** (Kamstrup 2009 + Clarke 2009, `meta`/genetic): **Lp(a) is causal** (Mendelian),
  ~70–90% heritable, stable for life → **measure once**. Flags a high-risk ~20% of people; no approved
  Lp(a)-specific drug yet (RNA agents in trials) → high *measurement* value, limited *intervention* value (2026).

### The predictor-but-NOT-causal one (don't chase it directly)
- **`hscrp-predicts-not-causal`** (ERFC/Kaptoge 2010 predicts; CCGC 2011 BMJ Mendelian **null**): hsCRP predicts
  CHD/stroke/mortality as an inflammation readout, but **CRP itself isn't causal**. JUPITER (Ridker 2008) used
  hsCRP to *select* patients — benefit came via LDL/apoB lowering, not CRP reduction. Track it as a *marker*,
  don't treat the number.

### The glucose/insulin axis (early-warning ordering: insulin → HbA1c → glucose)
- **`homair-fasting-insulin-predicts-cvd`** (Hanley 2002 IRAS, `cohort`): HOMA-IR / fasting insulin rises
  **years before** glucose — the earliest-warning metabolic marker. Caveat: insulin **assays are poorly
  standardized** between labs → track within-person trend on one assay.
- **`hba1c-predicts-cvd-nondiabetic`** (Selvin 2010 ARIC, `cohort`): HbA1c predicts CVD/death **even in the
  non-diabetic range**, integrates ~3 months of glycemia, needs no fasting. Caveat: distorted by anything
  affecting red-cell lifespan (anemia, hemoglobinopathy, recent blood loss).
- **`fasting-glucose-vascular-threshold`** (ERFC 2010, 102 studies, `meta`): J/threshold shape — flat in the
  normal range, rises above ~5.6 mmol/L; a single normal fasting glucose is reassuring but **low-resolution**.

### The U-shaped one (don't naively minimize)
- **`igf1-u-shaped-mortality`** (Burgers 2011 JCEM, `meta`): **both low AND high IGF-1** carry excess mortality.
  Directly tempers "suppress IGF-1/mTOR for longevity" biohacking; links to the protein/mTOR conflict (Domain D)
  and GH/IGF-1 longevity genetics (Bartke/Laron, Domain C). IGF-1 is a **context-dependent dial**, not a
  minimize-target.

---

## L.5 Epigenetic / biological-age tests — predictive, but NOT a validated surrogate

- **`biological-age-tests-not-validated-surrogate`** (cross-ref Domain C: Moqri 2023 consensus, Higgins-Chen
  2022 PC-clocks, Marioni 2015 / Chen 2016 DNAm-mortality). Horvath / PhenoAge / GrimAge / DunedinPACE predict
  mortality **at the population level**, but **no clock is a validated surrogate endpoint** (none is proven to
  move with an intervention and thereby forecast that intervention's benefit), and **first-gen clocks have
  reliability problems** (PC-clock fix needed) that make individual "age reversal" readings untrustworthy.

**Verdict:** a real research/population biomarker; **premature and noisy as a personal scorecard.** Consumers
buy these to judge whether a protocol is "working" — that inference is not yet supported. Use trend across many
measures, never a single number. (This is Domain C's central finding, restated in L because that's where the
purchasing decision happens.)

---

## L.6 Wearables — HRV, sleep tracking, CGM (validity-first grading)

- **HRV — `hrv-reduced-predicts-mortality`** (Tsuji 1994 Framingham, `cohort`): reduced HRV predicts mortality
  (autonomic/vagal tone readout). **Big measurement caveat** (Shaffer 2017 norms): HRV is method/context
  dependent (metric, recording length, posture, breathing, time of day, age). **Consumer overnight HRV is a
  within-person trend/recovery tool, not a cross-person or cross-device calibrated instrument** — absolute
  values aren't comparable between people. Bridges Domains G (breath) and I (sleep/recovery).
- **Sleep trackers — `consumer-sleep-trackers-stage-poorly`** (Chinoy 2021 vs PSG, `mechanistic`/validity):
  decent at total sleep time / sleep-wake; **poor at staging** (deep/REM). Trust **duration + timing regularity**;
  treat "deep sleep %" as approximate. Behavior-change tool, not a diagnostic. Bridges Domain I.
- **CGM — `cgm-accurate-diabetes-unvalidated-healthy`** (Kovatchev 2008 accuracy + Danne 2017 consensus,
  `mechanistic`; cross-ref Domain D `conflict-cgm-healthy-utility`): modern MARD ~9–10% and validated for
  **diabetes** (time-in-range is consensus), but **sensor-to-sensor / sensor-vs-blood disagreement is
  non-trivial** and there is **no outcome RCT in healthy people** — the worried-well "glucose spike" use case
  has no demonstrated outcome benefit. **Real tool in diabetes, oversold gadget for the healthy.**

---

## The honest one-paragraph summary of Domain L

The highest-signal measurements are **functional and a few causal blood markers**: VO2max (measured), grip,
gait, chair-rise, balance — and **apoB, Lp(a) (once), HbA1c/HOMA-IR**. These either out-predict expensive
tests (function) or are actually causal (apoB/LDL, Lp(a)). Most of the rest — biological-age clocks, hsCRP,
consumer HRV/sleep stages, CGM-in-the-healthy — are **correlates or trend tools, frequently oversold as
calibrated personal scorecards.** The cheap stuff beats the gadgets; the causal stuff is short and known.

---

### Cross-domain links
- **UP to E (exercise):** VO2max magnitude, grip cohort (PURE/Leong), sarcopenia mass→strength.
- **Across to C (omics/clocks):** biological-age validation gap, PC-clock reliability, DNAm-mortality.
- **Across to D (metabolic):** HbA1c, fasting glucose/insulin, CGM-in-healthy conflict, IGF-1/protein-mTOR.
- **Across to I (sleep) & G (breath):** HRV, consumer sleep validity.
- **UP to bucket-canon/05-biophysics:** IGF-1/insulin nutrient-sensing, CRF↔mitochondrial capacity.

*See `_L-SUMMARY.md` for the wave summary and Wave 2 gaps.*
