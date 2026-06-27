# Protocols — Domain E (Exercise)

> **Status:** v0.1 — 2026-06-27. Protocols are SEPARATED from their efficacy claims (in `02-domains/E-claims.json`)
> per the schema rule: *a protocol is a prescription, not evidence it works.* Each protocol points to the
> claim(s) that bear on whether — and how well — it does what its proponents say.

## What a "protocol" is here
A reproducible prescription (dose, intensity, frequency, duration). Listing it does **not** endorse it.
The `efficacy_claim` column points to the graded claim; read that for the actual evidence tier.

| Protocol | Prescription | Proponent / origin | Bears-on claim | Honest note |
|---|---|---|---|---|
| **Zone 2 base** | Steady aerobic at the first lactate turn-point (~2 mmol/L; "nose-breathing / can-hold-conversation" pace), ~150-180+ min/week | San-Millán; Attia; endurance-coaching tradition | `lactate-threshold-metabolic-flexibility-zone2`, `exercise-mitochondrial-biogenesis-holloszy` | Builds mitochondrial/fat-oxidation capacity. The claim it is *uniquely optimal* for mitochondria is contested (`conflict-zone2-optimal-mito`). |
| **Norwegian 4x4 HIIT** | 4 × 4 min at ~85-95% HRmax, 3 min active recovery, 2-3x/week | Wisløff / NTNU | `hiit-crf-cardiometabolic-meta` | Strong VO2max driver per unit time; higher RPE/adherence cost. Surrogate endpoints. |
| **10-20-30 / low-volume HIIT** | Repeated 30s easy / 20s moderate / 10s near-max | Gibala/Gillen lineage | `hiit-crf-cardiometabolic-meta` | Time-efficient; equal-or-better cardiometabolic markers vs longer continuous. |
| **Resistance-training minimum** | ≥2 sessions/week, major movement patterns; ~30-60 min/week of strengthening is where mortality benefit peaks | ACSM; Momma meta | `resistance-training-mortality-meta`, `sarcopenia-strength-defining-ewgsop2` | J-shaped — **more is not better** for the mortality endpoint. Primary sarcopenia countermeasure. |
| **"Centenarian Decathlon" / train-for-the-end** | Reverse-engineer the physical tasks you want at 90 (carry, stairs, get off floor), train the margin now; emphasize strength, stability, VO2max, rucking | Peter Attia (Medicine 3.0) | `crf-vo2max-strongest-mortality-predictor`, `grip-strength-mortality-pure` | Framing/communication device, not a trial. Built on the CRF/grip biomarker associations. |
| **Concurrent-training sequencing** | Separate strength and endurance sessions (≥6h, or different days); favor cycling over running for the aerobic dose if hypertrophy is the priority | Strength-coaching practice; Wilson meta | `concurrent-training-interference` | Programs around the interference effect; aerobic gains preserved either way. |
| **Exercise snacks** | Brief (≤1-2 min) vigorous bouts (stair sprints) scattered through the day | Gibala; Stamatakis (VILPA) | `physical-activity-dose-response-mortality` | Leverages the steep low-end of the dose-response; minimal-effective-dose strategy. |

## Protocol JSON (machine-ingestible)
```json
[
  {"id":"proto-zone2","name":"Zone 2 base","dose":"first lactate turn-point (~2 mmol/L), 150-180+ min/week","origin":"San-Millan/Attia","efficacy_claims":["lactate-threshold-metabolic-flexibility-zone2","exercise-mitochondrial-biogenesis-holloszy"],"caveat":"'optimal-intensity' claim contested (conflict-zone2-optimal-mito)"},
  {"id":"proto-4x4","name":"Norwegian 4x4 HIIT","dose":"4x4min @85-95% HRmax, 3min recovery, 2-3x/week","origin":"Wisloff/NTNU","efficacy_claims":["hiit-crf-cardiometabolic-meta"],"caveat":"surrogate endpoints; high RPE"},
  {"id":"proto-rt-min","name":"Resistance-training minimum","dose":">=2x/week, ~30-60 min/week strengthening","origin":"ACSM/Momma","efficacy_claims":["resistance-training-mortality-meta","sarcopenia-strength-defining-ewgsop2"],"caveat":"J-shaped: more is not better for mortality endpoint"},
  {"id":"proto-decathlon","name":"Centenarian Decathlon","dose":"reverse-engineer late-life tasks; strength+VO2max+stability","origin":"Attia","efficacy_claims":["crf-vo2max-strongest-mortality-predictor","grip-strength-mortality-pure"],"caveat":"framing device, not a trial"},
  {"id":"proto-concurrent-seq","name":"Concurrent sequencing","dose":"separate strength/endurance sessions; cycle>run for hypertrophy goals","origin":"strength-coaching/Wilson","efficacy_claims":["concurrent-training-interference"],"caveat":"interference is modality/dose-dependent"},
  {"id":"proto-exercise-snacks","name":"Exercise snacks (VILPA)","dose":"<=1-2 min vigorous bouts through the day","origin":"Gibala/Stamatakis","efficacy_claims":["physical-activity-dose-response-mortality"],"caveat":"leverages low-end dose-response"}
]
```
