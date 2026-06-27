# Protocols — Domain G (Breath)

> **Status:** v0.1 — 2026-06-27. Protocols SEPARATED from efficacy claims (`02-domains/G-claims.json`) per
> the schema rule. Listing a protocol is not an endorsement. Safety note up front: **cyclic-hyperventilation
> protocols (Wim Hof, Tummo-style) must never be done in or near water or while driving** — they can cause
> hypocapnic blackout/drowning. That is a hazard, not an efficacy claim.

| Protocol | Prescription | Proponent / origin | Bears-on claim | Honest note |
|---|---|---|---|---|
| **Coherent / resonance breathing** | ~5-6 breaths/min (e.g. 5.5s in / 5.5s out), 5-20 min | HRV-biofeedback tradition; Lehrer | `slow-breathing-autonomic-hrv`, `exhalation-vagal-mechanism` | Best-supported autonomic mechanism (↑HRV, vagal). Acute; long-term clinical outcomes weaker. |
| **Physiological sigh / cyclic sighing** | Double inhale (top-up) + long slow exhale; ~5 min/day | Balban & Huberman; Feldman/Krasnow (sigh neuroscience) | `cyclic-sighing-mood-arousal-rct`, `exhalation-vagal-mechanism` | RCT-tested; beat equal-time meditation on mood/arousal (subjective, 28 days, healthy). |
| **Box breathing** | 4-4-4-4 (inhale-hold-exhale-hold) | Navy SEAL / tactical tradition | `slow-breathing-autonomic-hrv` | Slows breathing into the autonomic-benefit range; specific 4-4-4-4 superiority untested. |
| **4-7-8 breathing** | Inhale 4 / hold 7 / exhale 8 | Andrew Weil | `slow-breathing-autonomic-hrv`, `exhalation-vagal-mechanism` | Exhale-weighted → vagal; specific ratio not separately validated. |
| **Wim Hof rounds** | 30-40 deep cyclic breaths → exhale breath-hold → recovery breath; 3-4 rounds | Wim Hof / Kox protocol | `wim-hof-voluntary-sns-immune-attenuation`, `wim-hof-lactate-mediated-antiinflammatory` | RCT immune effect is real but BUNDLED with cold+meditation. **Never in water.** |
| **Buteyko control-pause / reduced breathing** | Nasal-only, reduce breathing volume, build CO2 tolerance (control-pause measure) | Konstantin Buteyko | `buteyko-asthma-symptoms-rct`, `bohr-effect-co2-tolerance` | Improved asthma *symptoms*/med-use, NOT lung function. CO2-tolerance rationale contested. |
| **Nasal breathing / mouth-taping** | Default to nasal breathing; some tape mouth at night | Nestor; McKeown ("Oxygen Advantage") | `nasal-breathing-nitric-oxide` | Nasal-NO mechanism is real; performance/sleep OUTCOME evidence is thin/anecdotal. Mouth-taping has safety caveats. |
| **Pranayama (e.g. Nadi Shodhana, Bhramari)** | Lineage-specific slow/alternate-nostril patterns | Yogic tradition; Jerath physiology | `slow-breathing-autonomic-hrv`, `buteyko-asthma-symptoms-rct` | Overlaps slow-breathing mechanism; lineage-specific outcome data is heterogeneous. |

## Protocol JSON
```json
[
  {"id":"proto-coherent","name":"Coherent/resonance breathing","dose":"5-6 breaths/min, 5-20 min","origin":"Lehrer/HRV-biofeedback","efficacy_claims":["slow-breathing-autonomic-hrv","exhalation-vagal-mechanism"],"caveat":"acute autonomic; long-term outcomes weaker"},
  {"id":"proto-physio-sigh","name":"Physiological sigh / cyclic sighing","dose":"double-inhale + long exhale, 5 min/day","origin":"Balban/Huberman","efficacy_claims":["cyclic-sighing-mood-arousal-rct","exhalation-vagal-mechanism"],"caveat":"subjective outcome, short trial, healthy"},
  {"id":"proto-box","name":"Box breathing","dose":"4-4-4-4","origin":"tactical","efficacy_claims":["slow-breathing-autonomic-hrv"],"caveat":"specific ratio untested"},
  {"id":"proto-478","name":"4-7-8 breathing","dose":"inhale4/hold7/exhale8","origin":"Weil","efficacy_claims":["slow-breathing-autonomic-hrv","exhalation-vagal-mechanism"],"caveat":"ratio not separately validated"},
  {"id":"proto-whm","name":"Wim Hof rounds","dose":"30-40 cyclic breaths -> exhale hold -> recovery, 3-4 rounds","origin":"Wim Hof/Kox","efficacy_claims":["wim-hof-voluntary-sns-immune-attenuation","wim-hof-lactate-mediated-antiinflammatory"],"caveat":"bundled w/ cold+meditation; NEVER in water"},
  {"id":"proto-buteyko","name":"Buteyko reduced breathing","dose":"nasal-only, reduce volume, control-pause","origin":"Buteyko","efficacy_claims":["buteyko-asthma-symptoms-rct","bohr-effect-co2-tolerance"],"caveat":"symptoms not lung function; CO2 rationale contested"},
  {"id":"proto-nasal","name":"Nasal breathing / mouth-taping","dose":"default nasal; optional night taping","origin":"Nestor/McKeown","efficacy_claims":["nasal-breathing-nitric-oxide"],"caveat":"mechanism real; performance/sleep outcome thin; taping safety caveat"}
]
```
