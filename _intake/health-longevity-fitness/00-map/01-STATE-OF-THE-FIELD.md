# State of the Field — the honest bottom-line

> **Status:** v1 — 2026-06-27. The unbiased synthesis capstone for the Health · Longevity · Fitness
> corpus. **This is synthesis, not new evidence** — every claim id below resolves to a graded entry in
> `02-domains/*-claims.json`; conflicts to `06-evidence/CONFLICTS.md`. Companion (actionable form):
> `04-protocols/WHAT-TO-TRACK-SYNTHESIS.md`.
>
> Three honesty rules govern everything here: **(1) predictor ≠ lever** (a biomarker that predicts
> death isn't automatically something that, when changed, prevents death); **(2) cohort ≠ RCT** (you
> can't randomize fitness/sleep/smoking over decades, so healthy-user and reverse-causation bias
> inflate the strong-looking numbers); **(3) "something beats nothing" is the most robust signal in
> the corpus** — the steepest gains are at the *low* end, and optimization past that is real but
> smaller and noisier than the marketing claims.

The corpus is 197 graded claims, and its tier distribution *is* the headline: only **27 RCT-tier**
and **29 meta-tier** claims, against **53 observational** (cohort/cross-sectional/case-control) and
**42 mechanistic**. Longevity is a field where the strongest interventions are supported mostly by
observation and the loudest interventions are supported mostly by mechanism and mice. The job of this
page is to keep those straight.

---

## 1. What the evidence ACTUALLY supports strongly (the few high-confidence levers)

These outrank every exotic biohack in the corpus. The honest ranking is dull on purpose.

1. **Don't smoke.** The single largest modifiable mortality factor. Lifespan GWAS "longevity genes"
   are largely smoking + cardiometabolic genes — i.e. the genetics of long life is substantially the
   genetics of *not* doing the obviously harmful thing (`timmers-2019-parental-lifespan-gwas`, C).

2. **Build and keep cardiorespiratory fitness (VO2max).** The strongest exercise–mortality association
   in preventive medicine: ~5x lower all-cause mortality elite-vs-low fitness, ~13%/MET, **no observed
   upper limit of benefit** — magnitude comparable to or larger than smoking or diabetes
   (`crf-vo2max-strongest-mortality-predictor`, `crf-per-met-mortality-meta`, E;
   `vo2max-gold-standard-clinical-vital-sign`, L). Treat CRF as a vital sign. Caveat: it's cohort-tier
   (you can't randomize fitness), but the effect is so large and dose-graded it's as close to a
   sure thing as the field has.

3. **Resistance-train for strength.** Strength (and grip), *not muscle mass*, independently predicts
   mortality; resistance activity ~10–17% lower mortality — with a **J-shape: more is not better**
   (benefit peaks ~30–60 min/week) (`resistance-training-mortality-meta`, `grip-strength-mortality-pure`,
   `sarcopenia-strength-defining-ewgsop2`, E; `dexa-strength-not-mass-predicts-mortality`, L).

4. **Just move more; break up sitting.** The steepest dose-response is at the sedentary→active end,
   and it's the **least-confounded** signal in the domain (device-measured)
   (`physical-activity-dose-response-mortality`, E).

5. **Lower lifetime apoB / LDL.** One of the very few **causal** levers — Mendelian genetics, epidemiology,
   and RCTs converge, and *cumulative* exposure matters so earlier is better
   (`ldl-apob-causal-ascvd`, `apob-superior-to-ldlc`, L; `apoe-longevity-genetics`, B). This is the
   single causal, modifiable *blood* lever in the corpus.

6. **Sleep ~7 hours, regularly.** U-shaped mortality with a ~7h nadir (both short *and* long sleep
   worse); regularity and timing matter (`sleep-duration-mortality-ushape`, `kripke-7h-optimal-mortality`,
   `aasm-7h-consensus`, I). Note the causal direction is partly contested (`conflict-sleep-duration-causality`).

7. **Keep a healthy metabolic profile.** Diabetes ~2x vascular risk; HbA1c predicts in the
   non-diabetic range; visceral fat predicts beyond BMI (`hba1c-predicts-cvd-nondiabetic`,
   `fasting-glucose-vascular-threshold`, `visceral-fat-independent-mortality-predictor`, L).

8. **Social connection.** Consistently among the largest psychosocial mortality associations — it
   belongs on this list and is routinely omitted from biohacking stacks precisely because nothing is
   sold for it.

**The shape of the truth:** the high-confidence levers are *functional and behavioral* (fitness,
strength, movement, sleep) plus *two causal blood levers* (apoB, glucose). They are individually
larger than anything in the supplement/biohack column, and they are mutually reinforcing. If a
program does not start here, it is optimizing noise.

---

## 2. Promising but unproven (real signal, smaller / surrogate / dose-uncertain)

Worth doing or watching, but the honest tier is lower — usually because the endpoint is a surrogate,
the dose studied differs from the dose sold, or the only data is one cohort.

- **Zone 2 + VO2max intervals (HIIT).** Both efficiently raise CRF; the "Zone 2 is *uniquely* optimal
  for mitochondria" claim is an over-extrapolation (`conflict-zone2-optimal-mito`;
  `hiit-crf-cardiometabolic-meta`, E).
- **Sauna / heat.** Dose-response to mortality and dementia — but from **one Finnish men's cohort**
  with unexcluded healthy-user bias and no RCT (`sauna-frequency-mortality-kihd`,
  `sauna-dementia-association`, H; `conflict-sauna-healthy-user`). Infrared saunas do **not** inherit
  that evidence (`conflict-infrared-vs-traditional-sauna`).
- **Protein adequacy + leucine-threshold dosing (esp. older adults).** Supports muscle and survival in
  the elderly — but a genuine **mid-life vs late-life tradeoff** with IGF-1/mTOR
  (`conflict-protein-mtor-longevity`; `igf1-u-shaped-mortality`, L). Not "more is always better".
- **Circadian-aligned / early time-restricted eating.** The surviving signal is *early-window
  circadian alignment*; **most TRE benefit is just the calorie restriction it causes**
  (`conflict-tre-efficacy-vs-cr`, D).
- **Light hygiene** (bright AM, dim PM). Strong mechanism (melatonin action spectrum); thinner outcome
  data; blue-blocking glasses specifically show no clear benefit (`conflict-blue-blocking-glasses`, I).
- **Modest caloric/dietary restriction.** CALERIE — the only long-term human CR RCT — gave ~12% CR,
  surrogate endpoints, and moved only one epigenetic clock (`calerie-human-cr-rct`, B). Modest, honest.
- **Slow breathing / HRV practice.** RCT-rich but surrogate, short, small; real acute autonomic
  effects, longevity outcome unproven (`thread-autonomic-hrv`; `hrv-autonomic-recovery-biomarker`, I).
- **Microbiome interventions.** Young→old FMT extends lifespan and reverses inflammaging *in animals*;
  all human data is surrogate, and cause-vs-consequence is unresolved (`conflict-microbiome-causality`).

---

## 3. Hype / overclaimed (interesting, not actionable "for longevity")

Each of these is sold harder than its evidence. The corpus's recurring failure mode is a **laundering
gap**: a real *mechanism* or a *mouse* result gets marketed as a hard human *outcome* it hasn't earned.

- **NAD+ boosting (NR/NMN).** NAD+ declines with age (mechanism is real), but human RCTs move only
  surrogates — no demonstrated longevity or hard-endpoint benefit (`nad-precursor-nr-human-surrogate`,
  B; `conflict-nad-precursor-efficacy`). "Mechanism real, outcome unproven."
- **Resveratrol / sirtuin activation.** The in-vitro SIRT1 activation was substantially a **fluorophore
  assay artifact**; lifespan extension doesn't hold in lean animals (`conflict-resveratrol-sirtuin`).
- **Senolytics (D+Q, fisetin) in healthy people.** Striking in mice; human evidence = tiny pilots
  (`senolytics-extend-function-mouse`, `dq-ipf-first-in-human-pilot`, B).
- **Metformin / rapamycin for healthy people.** Metformin = confounded cohort signal + TAME (designed,
  not yet run); rapamycin = mouse lifespan + one immune RCT, optimal human dose unknown
  (`conflict-metformin-geroprotection`, `conflict-rapamycin-dosing`). Off-label for longevity is unproven.
- **Partial epigenetic reprogramming.** Mouse only; not a human intervention
  (`partial-reprogramming-ocampo-2016`, B).
- **Cold plunge for metabolic/longevity benefit.** Rich mechanism (BAT/norepinephrine), but the only
  human metabolic *outcome* used **prolonged mild cold (hours)**, not the brief plunge that's sold —
  a dose↔evidence mismatch (`cold-acclimation-insulin-sensitivity-t2d`, H).
- **Wim Hof method.** One RCT shows trainable immune suppression, but it's an acute-adrenaline,
  bundled, small/healthy/short-study effect (`conflict-wim-hof-mechanism`). ⚠️ And genuinely dangerous
  in/near water.
- **CGM / "glucose spikes" for healthy people.** No outcome RCT in non-diabetics; glucose variability
  has no proven outcome meaning; sensors disagree (`cgm-accurate-diabetes-unvalidated-healthy`, L;
  `conflict-cgm-healthy-utility`).
- **Seed-oil panic.** Polarized and low-rigor; higher-tier evidence runs the *other* way (PUFA
  replacing saturated fat lowers CHD); certainty exceeds evidence on both sides
  (`conflict-seed-oils-linoleic-acid`, D).
- **Epigenetic "biological age" tests as a personal scorecard.** Predict at the population level but
  are **not a validated surrogate**; first-gen clocks are noisy, clocks disagree, and a single number
  can't tell you if your protocol "worked" (`biological-age-tests-not-validated-surrogate`,
  `conflict-which-clock-is-valid`, C).
- **Blue Zones as proof of a lifestyle.** The extreme-age records partly track clerical error and
  pension fraud; the strong version of the claim is contested (`conflict-blue-zones-data-quality`).

---

## 4. The biggest open questions / conflicts

The corpus holds **29 conflict objects** (15 fully `open`); full register in
`06-evidence/CONFLICTS-REGISTER.md`. The ones that most change the picture if resolved:

1. **Protein ↔ mTOR ↔ longevity** (`conflict-protein-mtor-longevity`, open). The central nutrition
   tradeoff: anabolic protection (muscle, elderly survival) vs IGF-1/mTOR-driven aging/cancer risk.
   Likely **age-dependent**, but unresolved.
2. **Does raising NAD+ move any hard endpoint?** (`conflict-nad-precursor-efficacy`, open). The
   missing adequately-powered hard-endpoint RCT behind a large supplement market.
3. **Cause vs consequence on the two big hubs** — somatic **mtDNA mutations**
   (`conflict-mtdna-mutation-causality`) and **inflammaging/microbiome dysbiosis**
   (`conflict-microbiome-cause-or-consequence`). Both gate whether their targeted interventions matter.
4. **Which biological-age clock is valid, and do "age-reversal" results mean anything?**
   (`conflict-which-clock-is-valid`, open) — gates the entire commercial age-test category.
5. **Sleep duration: causal or reverse-causation?** (`conflict-sleep-duration-causality`, open) and the
   accuracy of popularized sleep claims (`conflict-walker-sleep-claims`, partially-resolved).
6. **CR/longevity-drug translation to humans** — CR primate survival is context-dependent
   (`conflict-cr-primate-survival`); metformin and rapamycin human dosing both open.
7. **The free-radical theory** is *mostly resolved against* its naive version — antioxidants don't
   extend lifespan; low ROS are beneficial signals (mitohormesis) (`conflict-free-radical-theory`).
   This is the cleanest example of a once-dominant idea the evidence overturned.
8. **Sauna healthy-user bias** and **infrared-≠-traditional** (`conflict-sauna-healthy-user`,
   `conflict-infrared-vs-traditional-sauna`) — both gate the most-hyped thermal claims.

A structural open question sits above all of these (see `CANON-BRIDGE-PROPOSAL.md`): the bioenergetics
lineage — **chemiosmosis / proton-motive force / redox** — is the *foundation* every actionable domain
reaches up to, while the inherited Kruse/structured-water/biophoton layer has a **validated circadian
spine but `speculative` extensions** (UV/IR/nnEMF/deuterium). Keeping foundation-tier laws separate
from outcome-tier applications is the corpus's core discipline.

---

## The capstone in one paragraph (read this if nothing else)

The evidence is lopsided toward a short list of **boring, powerful, mostly-functional levers**: don't
smoke; build and keep **cardiorespiratory fitness** and **strength**; **move more**; **sleep ~7h
regularly**; keep **apoB/LDL** low across life; keep a **healthy metabolic profile**; protect **social
connection**. These individually outrank every exotic biohack in the corpus. The one causal modifiable
blood lever is **apoB/LDL** (measure **Lp(a)** once). The highest-signal *measurements* are
**functional** (VO2max, grip, gait, chair-rise, balance) plus a few **causal/early blood markers**
(apoB, Lp(a), HbA1c, fasting insulin). Almost everything that gets *sold* — biological-age clocks, CGM
for the healthy, consumer HRV/sleep-stage numbers, senolytics/NAD+/rapamycin for healthy people, cold
plunges, seed-oil panic — is either a **correlate dressed up as a scorecard**, a **mouse result not yet
in humans**, or a **dose that doesn't match the studied dose**. Spend attention on the Tier-A levers;
treat the promising tier as trends; enjoy the rest as experiments, not protocols.

---
*Synthesis maintained by Nucleus. Effect sizes, populations, and caveats live in the linked
`02-domains/*-claims.json`. Conflicts in `06-evidence/CONFLICTS-REGISTER.md`. Converges on re-runs.*
