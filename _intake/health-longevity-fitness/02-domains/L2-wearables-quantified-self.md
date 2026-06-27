# Domain L2 — Wearables, CGM & the Quantified Self (the measurement layer, deepened)

> **Wave 5, 2026-06-27.** Deep dive on the consumer measurement layer that `L-biomarkers.md §L.6` opened.
> Companion machine file: `L2-claims.json` (11 graded, DOI-sourced claims). Practitioner anchor:
> `04-protocols/bryan-johnson-blueprint.md`. Cross-links: Domain I (sleep), G (breath), D (metabolic), E (exercise).
>
> **The two discipline rules from Domain L apply here twice over:**
> 1. **Predictor ≠ lever.** RHR, HRV, steps, glucose variability all *predict* or *track* outcomes; that does
>    not make "move the wearable number" a validated intervention.
> 2. **Measurement validity is its own tier.** *"Device accurately measures X"* and *"tracking X improves
>    outcomes"* are **two separate questions**, each graded separately below. Most consumer-device marketing
>    collapses them; this file keeps them apart.

A clean 2×2 governs the whole domain:

| | **Device measures it ACCURATELY** | **Device measures it POORLY** |
|---|---|---|
| **Underlying marker PREDICTS outcomes** | Resting HR (best case); measured steps | Sleep *stages*; estimated VO2max; HRV absolute value |
| **Underlying marker's outcome value UNPROVEN** | CGM glucose variability in the healthy (accurate sensor, no outcome) | "Recovery scores", composite indices |

---

## L2.1 Consumer HRV (Oura / Whoop / Apple Watch) — trend, not instrument

**The biomarker is real; the consumer reading is a trend.** Reduced HRV predicts mortality as an autonomic/vagal-tone
readout (`hrv-reduced-predicts-mortality`, Tsuji 1994 Framingham, Domain L). HRV is also notoriously
method-dependent (`Shaffer 2017` norms: metric, recording length, posture, breathing rate, time of day, age all
move it).

- **What the gadgets get right:** nocturnal **resting heart rate** is measured with small error vs ECG (often
  ~1-3 bpm). RHR is the single best-validated consumer-wearable number.
- **What they get loosely:** overnight **HRV (rMSSD)** has wide Bland-Altman limits of agreement vs ECG, and each
  brand samples it differently (Whoop continuous, Oura/Apple sleep-gated). (`consumer-hrv-overnight-trend-not-absolute`,
  Dial 2025 + consumer-HRV agreement literature.)
- **What overnight HRV actually tracks:** a noisy index of autonomic state — acute stressors (alcohol, late meals,
  illness, hard training, poor sleep) reliably depress it. That is the legitimate use: a **within-person, night-to-night
  recovery/stress trend relative to your own baseline.**
- **Signal vs noise for training/recovery:** the night-to-night variation in consumer HRV is large relative to the
  true underlying change, so single-night readings are mostly noise; a 7-day rolling baseline carries what little
  signal exists. Absolute values are **not comparable between people or between devices** — your Oura HRV of 45 ms and
  a friend's 70 ms say almost nothing about relative health.

**Verdict:** RHR = accurate predictor (rare double win, see L2.5). Overnight HRV = within-person trend tool only;
"raising my HRV score" is **not** a validated longevity target.

---

## L2.2 Sleep-stage tracking — devices flatter your night

Consumer sleep wearables are decent at **total sleep time** and **sleep/wake on regular nights**, and useful for
**timing regularity** — which is the part Domain I says actually matters. They are weak exactly where the marketing
is loudest: **stages**.

- **Direction of error (the new detail over Wave 1):** devices have high sleep-detection *sensitivity* but low *wake
  specificity* — they **miss wakefulness and overestimate sleep**, and tend to overestimate light/deep proportions vs
  polysomnography. (`consumer-sleep-trackers-overestimate-and-stage-poorly`: Chinoy 2022 Nat Sci Sleep; Stucky 2021
  Fitbit-vs-PSG; Kanady 2020 multisensor.) Staging epoch-by-epoch agreement is moderate (kappa ~0.4-0.6) and worst on
  disrupted nights — the nights you'd most want to trust it.
- **Practical reading:** trust **duration + timing regularity**; treat **"deep sleep %"** as approximate, not a
  diagnostic. The device tends to make your night look better and more "staged" than it was.
- **Documented harm:** *orthosomnia* — anxiety and worse sleep driven by chasing a sleep score. Over-trusting the
  number is itself a failure mode.

**Verdict:** behavior-change/awareness tool for duration and regularity; **not** a stage-accurate or diagnostic
instrument. Extends `consumer-sleep-trackers-stage-poorly` (Domain L) with the overestimation direction.

---

## L2.3 CGM in non-diabetics — accurate sensor, real variability, unproven utility

The Wave-1 grade stands, restated and extended:

- **The sensor is good.** Modern CGM MARD ~9-10%, validated for diabetes; **time-in-range** is consensus
  (`cgm-accurate-diabetes-unvalidated-healthy`, Domain L). Sensor-to-sensor / sensor-vs-blood disagreement is still
  non-trivial.
- **The variability is real and personal** — the Snyder "glucotype" work. CGM in 57 non-diabetics found
  individually-patterned glycemic signatures (low/moderate/severe **glucotypes**), and many people normoglycemic by
  HbA1c **spike into prediabetic/diabetic ranges** to standardized meals (`glucotypes-cgm-nondiabetic-variability`,
  Hall/Perelman/Snyder, PLoS Biology 2018). This is the strongest pro-CGM-in-healthy result and it is genuinely
  interesting *mechanistically*.
- **But the utility is still unproven.** There is **no outcome RCT** showing that CGM use, or flattening spikes,
  improves any clinical outcome in healthy people (`cgm-healthy-no-outcome-rct-restated`). Newer (2025) digital-health
  programs reporting glycemic/weight gains (e.g., Veluvali, NPJ Digit Med 2025) **bundle CGM with coaching and diet
  change**, so the sensor's independent contribution can't be isolated — they don't change the verdict.

**The clean split:** glucotype work proves *the signal exists*; it does **not** prove *acting on the signal helps*.
Accurate measurement of a variable whose outcome meaning in the healthy is undemonstrated.

**Verdict:** real tool in diabetes; **oversold gadget for the worried-well.** (Open conflict:
`conflict-cgm-healthy-utility`, Domain D.)

---

## L2.4 Steps ↔ mortality — the most honest wearable signal (with the right plateau)

Device-measured daily steps are one of the **least-confounded** activity signals in the corpus, and the dose-response
is consistent across three independent lines:

- **`steps-mortality-meta-paluch`** (Lancet Public Health 2022, `meta`): 15 cohorts, ~47k adults. Curvilinear
  dose-response; benefit **plateaus ~6,000-8,000 steps/day in older adults, ~8,000-10,000 in younger**. **Intensity
  (cadence) adds little once volume is counted.**
- **`steps-mortality-saint-maurice-us`** (JAMA 2020, `cohort`): ~4,840 US adults; vs 4,000 steps, 8,000 steps HR
  ~0.49, 12,000 steps HR ~0.35; **intensity null after volume adjustment.**
- **`steps-mortality-lee-older-women`** (JAMA Intern Med 2019, `cohort`): ~16,741 older women; ~4,400 vs ~2,700 steps
  much lower mortality; **plateau ~7,500.**

**Two honest notes.** (1) The famous **"10,000 steps" is a 1960s pedometer marketing figure**, not the data — the
curve flattens well below it and the steepest gains are sedentary→modest. (2) **Reverse causation:** subclinical
illness lowers step count, inflating the low-step risk; and **wrist-tracker step counts undercount at slow gait**
(`wearable-step-count-validity`) — exactly where the highest-risk slow walkers live. So a consumer step number is a
good "more vs less / did I move today" trend, not the exact quantity the survival curves were built on.

**Verdict:** steps are a **predictor you measure decently** and a **plausible lever** (they index activity, Domain E's
Tier-A "just move more"), but no RCT shows "increasing your tracked steps lowers mortality." Cross-link:
`physical-activity-dose-response-mortality` (E).

---

## L2.5 Resting heart rate & HRV as mortality predictors — the population view

- **Resting heart rate** is the **best-case wearable metric**: accurate measurement **and** a real predictor.
  `resting-heart-rate-mortality-meta` (Zhang 2016 CMAJ, `meta`): each **+10 bpm resting HR ≈ +9% all-cause / +8% CV
  mortality**, rising ~continuously above ~60-70 bpm.
- **HRV** is the population predictor on the other side (`hrv-reduced-predicts-mortality`, Tsuji 1994, Domain L):
  low HRV predicts mortality — but with the measurement caveats of L2.1.

**The predictor-≠-lever trap, sharply.** RHR is *mostly a readout* of fitness, autonomic tone, and subclinical
disease. Lowering it by **training** travels with lower mortality; lowering it by **beta-blockade** does not generically
extend life in healthy people. Same logic as hsCRP (`hscrp-predicts-not-causal`): you can measure it perfectly and
still be wrong to "treat the number." Wearables make RHR/HRV cheap and continuous; that is monitoring value, not a
mandate to drug or hack the digit.

**VO2max estimation (the measurement weak link).** `wearable-vo2max-estimation-error` (Lambe 2026, Apple-Watch-vs-CPET):
estimated VO2max tracks measured CRF at the **group** level but has **wide individual limits of agreement** and bias.
The *biomarker* is the strongest exercise-mortality predictor (Domain E); the *gadget's estimate* is the weak link.
Use the wearable VO2max for your own trend (rising with training?), not to place yourself on a population nomogram —
for that you need measured CRF (CPET or a hard field test). Companion to `vo2max-gold-standard-clinical-vital-sign`.

---

## L2.6 The quantified-self / N=1 method itself — what's valid vs noise-chasing

`n-of-1-self-tracking-epistemics` (anchored to Bryan Johnson's **Blueprint**,
`04-protocols/bryan-johnson-blueprint.md`):

**Epistemically valid in self-tracking:**
- Detecting **large within-person effects** (a food that reliably spikes *your* glucose; alcohol crushing *your* HRV).
- **Personalization** — finding your own responses where population averages hide them (the glucotype insight at N=1).
- **Hypothesis generation** and surfacing **self-reported negatives** — e.g., Johnson *discontinuing rapamycin* after
  reporting no net benefit + side effects (`bj-rapamycin-discontinued`) is a clean N=1 contribution.

**Structurally invalid / noise-chasing:**
- Any **survival/longevity** claim from N=1 — no control, no randomization, no power.
- **Small effects** swamped by regression-to-the-mean, placebo, seasonality, and **multiple comparisons** (track 50
  metrics, something always "improves").
- **Optimizing a noisy nightly score** (HRV, deep-sleep %) whose night-to-night variation **exceeds** any real signal —
  the canonical wearable failure mode.

**The honest frame (`protocol-not-evidence-axiom`, Domain J):** Blueprint's contribution is **measurement
transparency** — an open, densely-instrumented dataset — **not** proof that the protocol extends life. A device that
accurately measures X plus a rigorous N=1 can validly *personalize* and *detect big effects*; it can never upgrade a
predictor into a proven lever, nor a self-experiment into a population outcome.

---

## The honest one-paragraph summary of Domain L2

The consumer measurement stack has exactly one clean win — **resting heart rate** (accurately measured *and* a real
predictor) — and one near-win, **device-measured steps** (least-confounded activity signal, real dose-response, but
the plateau is ~7-8k not 10k and reverse causation looms). Everything else splits the 2×2 the wrong way: **overnight
HRV** and **estimated VO2max** are real/predictive biomarkers the gadgets measure only as within-person trends;
**sleep stages** are measured poorly and in a flattering direction; **CGM in the healthy** is the inverse — an accurate
sensor reading a variable (glucose variability/glucotype) whose outcome meaning is unproven. The unifying error to
refuse is collapsing *"the device measures X"* into *"tracking X improves my outcomes."* And N=1 self-tracking, at its
honest best (Blueprint), buys **personalization and transparency**, never **longevity proof**.

---

### Cross-domain links
- **To L (biomarkers):** `hrv-reduced-predicts-mortality`, `consumer-sleep-trackers-stage-poorly`,
  `cgm-accurate-diabetes-unvalidated-healthy`, `vo2max-gold-standard-clinical-vital-sign`, `hscrp-predicts-not-causal`.
- **To E (exercise):** `physical-activity-dose-response-mortality`, `crf-vo2max-strongest-mortality-predictor`.
- **To D (metabolic):** `conflict-cgm-healthy-utility`, HbA1c / fasting-glucose ordering.
- **To I (sleep) & G (breath):** sleep duration/regularity levers; HRV-autonomic-recovery.
- **To J (practitioners):** `protocol-not-evidence-axiom`, `bj-rapamycin-discontinued`, `bj-pace-of-aging`.

*See `_L2-SUMMARY.md` for the wave summary and open gaps.*
