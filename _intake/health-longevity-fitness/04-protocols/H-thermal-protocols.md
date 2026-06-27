# Protocols — Domain H (Thermal Stress)

> **Status:** v0.1 — 2026-06-27. Protocols SEPARATED from efficacy claims (`02-domains/H-claims.json`) per
> the schema rule. Listing a protocol is not an endorsement. The single most important honest note in this
> whole domain: **the cold protocol that has the most data (prolonged mild cold, Hanssen) is NOT the cold
> protocol that is popularly sold (brief intense plunges).** Read the bears-on claim before assuming a dose works.

| Protocol | Prescription | Proponent / origin | Bears-on claim | Honest note |
|---|---|---|---|---|
| **Finnish sauna dosing** | 4-7 sessions/week, ~80-100 °C, ~15-20 min/session (löyly) | Laukkanen / KIHD-derived | `sauna-frequency-mortality-kihd`, `sauna-dementia-association`, `sauna-cardiovascular-physiology` | Dose comes from an *observational* cohort of Finnish men — **association, not RCT**; healthy-user bias unexcluded. |
| **Søberg "Soeberg Principle" cold** | ~11 min/week total cold exposure, split across sessions, water ~10-15 °C, **end on cold** | Susanna Søberg | `shivering-vs-nonshivering-thermogenesis`, `cold-norepinephrine-thermogenesis-mechanism` | The "11 min/week" figure is a *practitioner synthesis*, not a trial-derived dose. Drives thermogenesis/NE (mechanism); metabolic OUTCOME unproven for this dose. |
| **Prolonged mild cold acclimation** | ~6 h/day at ~14-15 °C, ~10 days | Hanssen / van Marken Lichtenbelt (research protocol) | `cold-acclimation-insulin-sensitivity-t2d` | This is the dose with an actual insulin-sensitivity OUTCOME — **hours/day, not a 3-min plunge.** Impractical for most; cited to keep the dose↔evidence link honest. |
| **Cold shower** | 30-90 s cold finish to a daily shower | Buijze RCT | `cold-showering-sick-leave-rct` | RCT-tested; reduced sickness-*absence* (not sick-days-per-illness); self-reported, unblinded. |
| **Cold plunge (popular)** | ~1-5 min, ~10-15 °C, several times/week | Huberman/biohacker discourse | `cold-norepinephrine-thermogenesis-mechanism` | Drives a large acute norepinephrine surge (**mechanism**). No hard human OUTCOME at this brief dose. **Cold-after-resistance-training blunts hypertrophy** — see `conflict-cold-after-resistance`. |
| **Contrast therapy** | Alternating hot/cold (e.g. sauna↔cold plunge), several cycles | spa/athletic-recovery tradition | (inherits H heat + cold claims) | Little *independent* hard-outcome data; not given its own outcome claim this wave. |
| **Heat acclimation (athletic)** | Repeated heat exposure (sauna/hot training) to induce plasma-volume expansion + HSPs | Périard / sports science | `heat-shock-proteins-mechanism` | Performance-acclimation evidence is solid; HSP→*longevity* is a mechanism, not an outcome. |

## Protocol JSON
```json
[
  {"id":"proto-sauna","name":"Finnish sauna dosing","dose":"4-7x/week, 80-100C, 15-20 min","origin":"Laukkanen/KIHD","efficacy_claims":["sauna-frequency-mortality-kihd","sauna-dementia-association"],"caveat":"observational cohort dose; healthy-user bias"},
  {"id":"proto-soberg-cold","name":"Soeberg 11 min/week cold","dose":"~11 min/week, 10-15C water, end on cold","origin":"Soberg","efficacy_claims":["shivering-vs-nonshivering-thermogenesis","cold-norepinephrine-thermogenesis-mechanism"],"caveat":"practitioner synthesis, not trial-derived; outcome unproven"},
  {"id":"proto-cold-acclim","name":"Prolonged mild cold acclimation","dose":"~6h/day @14-15C, 10 days","origin":"Hanssen research protocol","efficacy_claims":["cold-acclimation-insulin-sensitivity-t2d"],"caveat":"the dose with an actual outcome; hours/day not a plunge"},
  {"id":"proto-cold-shower","name":"Cold shower","dose":"30-90s cold finish daily","origin":"Buijze RCT","efficacy_claims":["cold-showering-sick-leave-rct"],"caveat":"reduced absence not illness-days; self-reported"},
  {"id":"proto-cold-plunge","name":"Cold plunge (popular)","dose":"1-5 min, 10-15C, several/week","origin":"Huberman/biohacker","efficacy_claims":["cold-norepinephrine-thermogenesis-mechanism"],"caveat":"mechanism only at brief dose; blunts post-RT hypertrophy (conflict-cold-after-resistance)"},
  {"id":"proto-heat-acclim","name":"Heat acclimation","dose":"repeated heat exposure for plasma-volume/HSP","origin":"Periard/sports-sci","efficacy_claims":["heat-shock-proteins-mechanism"],"caveat":"acclimation solid; HSP->longevity is mechanism not outcome"}
]
```
