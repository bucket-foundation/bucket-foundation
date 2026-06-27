# Domain L2 — Wearables, CGM & Quantified Self — Summary (Wave 5, 2026-06-27)

Deepens the consumer measurement layer opened in `L-biomarkers.md §L.6`. The governing discipline: keep
**"device measures X accurately"** strictly apart from **"tracking X improves outcomes"** — they are
orthogonal, and consumer-device marketing routinely collapses them.

## The 2×2 that organizes the domain
| | Device measures accurately | Device measures poorly |
|---|---|---|
| Marker PREDICTS outcomes | **Resting HR** (clean win); measured steps | Sleep *stages*; estimated VO2max; HRV *absolute* |
| Marker outcome-value UNPROVEN | CGM glucose variability in healthy | "recovery"/composite scores |

## Deliverables written
- `02-domains/L2-wearables-quantified-self.md` — human-readable, six sections (HRV, sleep staging, CGM-in-healthy,
  steps↔mortality, RHR/HRV/VO2max predictors, N=1 epistemics) + the 2×2.
- `02-domains/L2-claims.json` — **11 graded claims**, DOI-sourced where one exists, validity-tier separated.
- `00-map/discovered-people.md` — **+7 figures** (Paluch, Saint-Maurice, I-Min Lee, Snyder, Hall/Perelman, Zhang, Bryan Johnson).
- `00-map/discovered-concepts.md` — **+8 concepts** (validity-vs-utility 2×2, glucotype, step-count plateau,
  volume-over-intensity, overnight-HRV-as-trend, orthosomnia, N=1 epistemics, wearable VO2max error).

## Claims by tier (11 total)
| Tier | Count | Claims |
|---|---|---|
| `meta` | 2 | steps-mortality (Paluch, Lancet PH 2022); resting-HR-mortality (Zhang, CMAJ 2016) |
| `cohort` | 2 | steps-mortality (Saint-Maurice JAMA 2020); steps-mortality older women (Lee, JAMA IM 2019) |
| `mechanistic` (incl. validity) | 6 | wearable-step-validity; consumer-HRV-trend; glucotypes (Snyder PLoS Biol 2018); CGM-no-outcome-RCT-restated; sleep-staging-overestimate (Chinoy/Stucky/Kanady); wearable-VO2max-error (Lambe 2026) |
| `nequals1` | 1 | N=1 self-tracking epistemics (Blueprint anchor) |

## Honest verdicts (the load-bearing conclusions)
1. **Resting heart rate is the only clean consumer win** — accurate AND a real predictor (+10 bpm ≈ +9% mortality).
   But it's a readout: lower it by training (good), not by drugging the digit.
2. **Steps are the most honest activity signal** — real dose-response, but the plateau is **~7-8k, not 10,000**
   (a 1960s marketing number), intensity adds nothing over volume, and reverse causation + slow-gait undercounting
   loom. Predictor + plausible lever; no "increase tracked steps → live longer" RCT.
3. **Overnight HRV** = within-person night-to-night trend only; absolute values aren't person- or device-comparable.
4. **Sleep stages** are measured poorly and in a **flattering** direction (devices overestimate sleep, miss wake).
   Trust duration + regularity; "deep sleep %" is soft. Watch for *orthosomnia*.
5. **CGM in the healthy** = accurate sensor, real personal variability (Snyder glucotypes), **no outcome RCT**;
   2025 digital-health gains are confounded by coaching. Wave-1 grade unchanged.
6. **Estimated VO2max** tracks measured CRF at group level only — wide individual error; trend tool, not nomogram.
7. **N=1 / quantified-self** validly personalizes and detects large within-person effects (and surfaces negatives,
   e.g. Johnson's rapamycin discontinuation), but **cannot prove longevity** — Blueprint's value is transparency,
   not life extension. The failure mode is optimizing a noisy nightly score whose variation exceeds its signal.

## Open gaps / Wave-6 candidates
- A dedicated **conflict object** for "consumer wearable optimization (HRV/recovery scores) → better outcomes?"
  (currently spread across confidence notes; could be promoted like `conflict-cgm-healthy-utility`).
- **Wearable arrhythmia / AFib detection** (Apple Heart Study, false-positive/overdiagnosis tradeoff) — a different
  validity story (screening, not optimization) not yet carded.
- **Photoplethysmography (PPG) skin-tone bias** — equity-relevant accuracy gap in wrist optical HR, untouched.
- Quantitative **MARD-by-sensor** table and **device-by-device HRV LoA** table if a Wave-6 wants numbers in-file.

## Method note (hook-safe)
All evidence pulled via Europe PMC REST with `curl → file`, parsed separately (never `curl | python3`, per the
environment hook). DOIs verified against Europe PMC result records; Zhang 2016 CMAJ and Lee 2019 confirmed by
title/author match. Raw query JSON left in the session scratchpad (not committed).
