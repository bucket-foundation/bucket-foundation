# What To Actually Track & Do — the evidence-tiered capstone

> **Wave 1, 2026-06-27.** The actionable synthesis across all graded domains (A–L). Given everything the
> corpus has *graded*, what are the highest-signal things a person can **measure** and **do** — organized by
> confidence, and honest about the gap between strong and hyped.
>
> **This is a synthesis, not new evidence.** Every lever below cross-links to graded claims by `id`
> (`02-domains/*-claims.json`). Read those for effect sizes, populations, and caveats.
>
> **Three honesty rules that govern this page:**
> 1. **Predictor ≠ lever.** A biomarker that predicts death (grip, gait, HRV, hsCRP, biological-age clocks)
>    is not automatically something that, when improved, *causes* lower mortality. The genuinely causal,
>    modifiable levers are a short list.
> 2. **Cohort ≠ RCT.** Almost every longevity "fact" is observational (you can't randomize fitness, sleep,
>    or smoking over decades). Healthy-user and reverse-causation bias inflate the strong-looking numbers.
> 3. **"Doing something beats nothing" is the most robust signal in the whole corpus** — the steepest
>    dose-response gains are at the *low* end (sedentary → some). Optimization past that is real but smaller
>    and noisier than the marketing implies.

---

## PART 1 — WHAT TO DO (the levers, by confidence tier)

### TIER A — Well-established (large cohorts + converging RCT/mechanism; do these first)

| Lever | Why it's Tier A | Cross-links |
|---|---|---|
| **Don't smoke** | The single largest modifiable mortality factor; dominates lifespan GWAS (lifespan "longevity genes" are largely smoking + cardiometabolic genes). | `timmers-2019-parental-lifespan-gwas` (C) |
| **Build & keep cardiorespiratory fitness (VO2max)** | Strongest exercise-mortality association in preventive medicine (~5x low-vs-elite; ~13%/MET). No observed upper benefit limit. Treat CRF as a vital sign. | `crf-vo2max-strongest-mortality-predictor`, `crf-per-met-mortality-meta` (E); `vo2max-gold-standard-clinical-vital-sign` (L) |
| **Resistance-train for strength** | Strength (not muscle mass) independently predicts mortality; resistance activity ~10–17% lower mortality. Note the **J-shape: more is not better** (benefit peaks ~30–60 min/week). | `resistance-training-mortality-meta`, `sarcopenia-strength-defining-ewgsop2`, `grip-strength-mortality-pure` (E); `dexa-strength-not-mass-predicts-mortality` (L) |
| **Just move more (any intensity); break up sitting** | Steepest dose-response at the sedentary→active end; device-measured, least-confounded signal in the domain. | `physical-activity-dose-response-mortality` (E) |
| **Lower lifetime apoB / LDL** | One of the few **causal** levers — genetics + epi + RCT converge; cumulative exposure matters, so earlier is better. | `ldl-apob-causal-ascvd`, `apob-superior-to-ldlc` (L); `apoe-longevity-genetics` (B) |
| **Sleep ~7 hours, regularly** | U-shaped mortality with a ~7h nadir (both short and long sleep worse); regularity/timing matter. | `sleep-duration-mortality-ushape`, `kripke-7h-optimal-mortality`, `aasm-7h-consensus` (I) |
| **Keep a healthy metabolic profile** (glucose/insulin, visceral fat) | Diabetes ~2x vascular risk; HbA1c predicts even in non-diabetic range; visceral fat predicts beyond BMI. | `hba1c-predicts-cvd-nondiabetic`, `fasting-glucose-vascular-threshold`, `visceral-fat-independent-mortality-predictor` (L) |

### TIER B — Promising (real but smaller / surrogate-endpoint / dose-uncertain)

| Lever | Status / honest caveat | Cross-links |
|---|---|---|
| **Zone 2 + VO2max-targeted intervals (HIIT)** | Improves CRF/cardiometabolic surrogates efficiently. The "Zone 2 is *uniquely* optimal for mitochondria" claim is an over-extrapolation (open conflict). | `hiit-crf-cardiometabolic-meta`, `lactate-threshold-metabolic-flexibility-zone2` (E); `conflict-zone2-optimal-mito` |
| **Sauna (heat)** | One Finnish *men's* cohort, dose-response to mortality/dementia — but unexcluded healthy-user bias; no RCT. | `sauna-frequency-mortality-kihd`, `sauna-dementia-association` (H); `conflict-sauna-healthy-user` |
| **Protein adequacy + leucine-threshold dosing (esp. older adults)** | Supports muscle/strength; but a **mid-life vs late-life tradeoff** with IGF-1 (the protein/mTOR conflict). Not "more protein = always better". | `resistance-training-mortality-meta` (E); `conflict-protein-mtor-longevity`; `igf1-u-shaped-mortality` (L) |
| **Circadian-aligned eating / early time-restricted window** | The surviving TRE signal is *early-window circadian alignment*, small; **most TRE benefit is just calorie restriction.** | `tre-human-metabolic-syndrome` (I); `conflict-tre-efficacy-vs-cr` (D) |
| **Light hygiene (bright AM / dim screens PM)** | Solid mechanism (melatonin action spectrum, screen-light circadian delay). Outcome data thinner. Note blue-blocking glasses show no clear benefit. | `light-melatonin-action-spectrum`, `evening-screen-light-circadian-delay`, `blue-blocking-lenses-no-clear-benefit` (I) |
| **Caloric/dietary restriction (modest)** | CALERIE (only long-term human CR RCT): ~12% CR, surrogate endpoints, only one clock moved. Modest and honest. | `calerie-human-cr-rct` (B) |
| **Slow breathing / HRV-supportive practice** | RCT-rich but surrogate/subjective, short, small. Real acute autonomic effects; longevity outcome unproven. | Domain G claims; `hrv-autonomic-recovery-biomarker` (I) |

### TIER C — Speculative / hyped / unproven (interesting, not actionable as "do this for longevity")

| Lever | Why it's Tier C | Cross-links |
|---|---|---|
| **Senolytics (D+Q, fisetin)** | Striking in mice; human evidence = tiny pilots. Not established in healthy humans. | `senolytics-extend-function-mouse`, `dq-ipf-first-in-human-pilot` (B) |
| **NAD+ boosting (NR/NMN)** | NAD+ declines with age (mechanism), but human RCTs show surrogate changes only; no demonstrated longevity benefit. | `nad-precursor-nr-human-surrogate` (B) |
| **Metformin / rapamycin for healthy people** | Metformin = cohort signal + TAME *design* (not yet run); rapamycin = mouse lifespan + one immune RCT. Off-label for longevity is unproven. | `metformin-mortality-cohort`, `tame-trial-design`, `mtor-rapamycin-mouse-lifespan`, `everolimus-immune-elderly-rct` (B) |
| **Partial epigenetic reprogramming** | Mouse only; not a human intervention. | `partial-reprogramming-ocampo-2016`, `reprogramming-vision-lu-2020` (B) |
| **Cold plunge for metabolic/longevity benefit** | Rich mechanism (BAT/norepinephrine), but the only human metabolic *outcome* used **prolonged mild cold (hours)**, not the brief plunge that's sold. Dose↔evidence mismatch. | `cold-acclimation-insulin-sensitivity-t2d` (H); H dose-mismatch note |
| **CGM / "glucose spikes" for healthy people** | No outcome RCT in non-diabetics; variability has no proven outcome meaning. | `cgm-accurate-diabetes-unvalidated-healthy` (L); `conflict-cgm-healthy-utility` (D) |
| **Seed-oil avoidance** | Polarized & low-rigor; higher-tier evidence runs the other way; certainty exceeds evidence on both sides. | `conflict-seed-oils-linoleic-acid` (D) |

---

## PART 2 — WHAT TO MEASURE (highest-signal first)

### TIER A — Measure these (high signal; cheap or causal)

| Measure | What it actually tells you | Honest caveat | Claim |
|---|---|---|---|
| **VO2max** (CPET, or a hard field test) | Strongest single mortality predictor | Consumer *estimated* VO2max is a trend tool, not calibrated | `vo2max-gold-standard-clinical-vital-sign` |
| **Grip strength + gait speed + chair-rise + balance** | Integrated organ-system reserve; rival expensive panels | Biomarkers, not levers; reverse causation | `physical-capability-battery-mortality-meta`, `gait-speed-survival-studenski` |
| **apoB** (one draw) | The best lipid risk metric; **causal** | Subsumes LDL-C/non-HDL; act on it | `apob-superior-to-ldlc`, `ldl-apob-causal-ascvd` |
| **Lp(a)** (ONCE in a lifetime) | Causal, genetic, ~stable; flags high-risk ~20% | No approved Lp(a)-specific drug yet (2026) | `lpa-causal-genetic-cvd` |
| **HbA1c + fasting insulin/HOMA-IR** | Glycemic control + earliest metabolic warning | Insulin assays vary between labs; HbA1c distorted by RBC disorders | `hba1c-predicts-cvd-nondiabetic`, `homair-fasting-insulin-predicts-cvd` |
| **DEXA for BMD** (where indicated) | Reference test for bone/fracture risk | Misses most fractures by BMD alone → pair with FRAX | `dexa-bmd-predicts-fracture` |

### TIER B — Useful with caveats (track trends, don't over-read)

| Measure | Use it for | Don't use it for | Claim |
|---|---|---|---|
| **hsCRP** | Inflammation *marker*; risk stratification | A treatment target (it's not causal) | `hscrp-predicts-not-causal` |
| **DEXA body composition** | Fat distribution / visceral fat trend | Judging longevity via *lean mass* (function beats mass) | `dexa-strength-not-mass-predicts-mortality`, `visceral-fat-independent-mortality-predictor` |
| **Resting/overnight HRV** | Within-person recovery/autonomic trend | Cross-person or cross-device comparison; absolute risk | `hrv-reduced-predicts-mortality` |
| **Consumer sleep tracker** | Total sleep time + timing regularity | Sleep STAGING ("deep sleep %"), diagnosing disorders | `consumer-sleep-trackers-stage-poorly` |
| **IGF-1** | Context dial (anabolism/cancer tradeoff) | A "minimize for longevity" target (U-shaped) | `igf1-u-shaped-mortality` |

### TIER C — Don't over-invest (low validity or unproven personal value)

| Measure | Why caution | Claim |
|---|---|---|
| **Epigenetic / "biological age" tests** | Predict at population level; **not a validated surrogate**, first-gen clocks noisy → a single number can't tell if your protocol "works" | `biological-age-tests-not-validated-surrogate`; `conflict-which-clock-is-valid` (C) |
| **CGM for non-diabetics** | Validated for diabetes (time-in-range); no outcome evidence in the healthy; sensors disagree | `cgm-accurate-diabetes-unvalidated-healthy` |
| **Microbiome "age"/uniqueness tests** | Composition-age correlations aren't causal; commercial | `galkin-2020-microbiome-aging-clock`, `conflict-microbiome-cause-or-consequence` (C) |

---

## The capstone in one paragraph (read this if nothing else)

The evidence is lopsided toward a short list of **boring, powerful, mostly-functional levers**: don't smoke,
build and keep **cardiorespiratory fitness** and **strength**, **move more**, **sleep ~7h regularly**, keep
**apoB/LDL** low across life, and keep a **healthy metabolic profile**. The single causal, modifiable blood
lever is **apoB/LDL** (plus measure **Lp(a)** once). The highest-signal *measurements* are **functional**
(VO2max, grip, gait, chair-rise, balance) and a few **causal/early-warning blood markers** (apoB, Lp(a), HbA1c,
fasting insulin). Almost everything that gets *sold* — biological-age clocks, CGM for the healthy, consumer
HRV/sleep-stage numbers, senolytics/NAD+/rapamycin for healthy people, cold plunges, seed-oil panic — is
either a **correlate dressed up as a scorecard**, a **mouse result not yet in humans**, or a **dose that
doesn't match the studied dose**. Spend your attention on Tier A; treat Tier B as trends; enjoy Tier C as
experiments, not protocols.

---

*Synthesis maintained by Nucleus. Effect sizes/caveats live in the linked `*-claims.json`. Conflicts in
`06-evidence/CONFLICTS.md`. This file converges on re-runs (update links, don't duplicate).*
