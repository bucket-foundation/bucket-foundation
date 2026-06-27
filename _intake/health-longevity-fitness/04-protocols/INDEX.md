# Protocols — INDEX (Domain J + domain protocol sheets)

> **Status:** v0.2 — 2026-06-27. All protocol files in `04-protocols/`. A protocol is a **recipe**, not
> evidence. Every efficacy claim is graded in `02-domains/J-claims.json` (or cross-referenced to its home
> domain's `*-claims.json`). **Protocol ≠ evidence** is the load-bearing rule of this folder.

## Per-practitioner protocol files

| Practitioner | File | Role | Signature recipe | New J-claims | Cross-refs (home domain) |
|---|---|---|---|---|---|
| Bryan Johnson | `bryan-johnson-blueprint.md` | N=1 / quantified-self | Blueprint: ~1977 kcal, large stack, sleep keystone, dense measurement | `bj-pace-of-aging`, `bj-rapamycin-discontinued` | B |
| Peter Attia | `peter-attia-medicine3.md` | clinical translator | Medicine 3.0 / Centenarian Decathlon; VO2max + strength + ApoB + protein | `attia-vo2max-mortality`, `attia-strength-mortality`, `attia-protein-muscle` | E, D |
| Rhonda Patrick | `rhonda-patrick-stack.md` | communicator (PhD) | Micronutrient stack + sulforaphane + sauna/hormesis | `rp-omega3-mixed`, `rp-vitd-mixed`, `rp-sulforaphane-mechanism`, `rp-sauna-cohort` | D, H |
| Andrew Huberman | `huberman.md` | communicator | Morning light, caffeine-delay, NSDR, physiological sigh | `huberman-morning-light-circadian`, `huberman-caffeine-delay`, `huberman-nsdr-yoga-nidra` | I, G, E, H |
| Andy Galpin | `galpin.md` | scientist-communicator | 9 adaptations; Galpin Equation hydration; QQRT sleep; test-first | `galpin-hydration-heuristic` | E, D, I |
| Kelly Starrett | `starrett.md` | clinician (DPT) | Built-to-Move vital signs: sit-to-rise, floor-sit, walk, de-sit, mobility | `sit-to-rise-mortality`, `sedentary-time-mortality-mixed` | E, F |
| Stuart McGill | `mcgill.md` | scientist-clinician | The "Big 3" + spine-sparing stiffness; remove pain trigger first | `mcgill-big3-back-stability` | F |
| Wim Hof | `wim-hof.md` | method founder | Breath rounds + cold + commitment ⚠️ NEVER in water | — (cross-ref G+H) | G, H |
| Patrick McKeown | `mckeown.md` | communicator (Buteyko) | Oxygen Advantage: nasal breathing, BOLT, CO2-tolerance drills | `bolt-score-predictive-unvalidated` | G |
| Susanna Søberg | `soberg.md` | scientist (1st author) | Søberg Principle: ~11 min/week cold, end on cold; sauna companion | `soberg-winter-swimmer-thermogenesis`, `soberg-11min-end-on-cold` | H |
| David Sinclair | `sinclair.md` | scientist ⚠️ contested/COI | NMN+resveratrol+metformin+TRE self-experiment | `sinclair-resveratrol-sirt1-contested`, `sinclair-personal-regimen-self-experimental` | B, D |
| Valter Longo | `longo.md` | scientist | Longevity Diet (age-adjusted protein) + periodic 5-day FMD | `longo-longevity-diet-pattern` | D (conflict-protein-mtor) |

## Domain protocol sheets (recipes grouped by domain, not by person)

| Domain | File | Protocols catalogued |
|---|---|---|
| E — Exercise | `E-exercise-protocols.md` | Zone 2, Norwegian 4x4, 10-20-30 HIIT, RT minimum, Centenarian Decathlon, concurrent sequencing, exercise snacks |
| G — Breath | `G-breath-protocols.md` | Coherent/resonance, physiological sigh, box, 4-7-8, Wim Hof rounds, Buteyko, nasal/mouth-taping, pranayama |
| H — Thermal | `H-thermal-protocols.md` | Finnish sauna, Søberg cold, prolonged mild cold acclimation, cold shower, cold plunge, contrast, heat acclimation |

## ⚠️ Safety-flagged protocols (see file for full note)
- **Wim Hof breathing** (`wim-hof.md`, `G-breath-protocols.md`) — **NEVER in/near water or driving**:
  hypocapnic blackout → drowning. Land only.
- **Cold-water immersion** (`soberg.md`, `wim-hof.md`, `H-thermal-protocols.md`) — cardiac/vascular caution
  (cold-shock); never combine with breath-holds; never alone in open/cold water.
- **Sauna/heat** (`soberg.md`, `H-thermal-protocols.md`) — contraindicated in pregnancy, unstable CVD,
  hypotension, intoxication, dehydration.
- **Mouth-taping** (`mckeown.md`) — not with nasal obstruction/reflux/intoxication or in children unsupervised.
- **FMD** (`longo.md`) — not for frail/underweight, insulin-treated diabetes, pregnancy, eating disorders;
  physician-supervised for clinical groups.

## Reading rules (restated)
1. The protocol file gives the **recipe**; the claim id gives the **evidence tier**. Always read the claim.
2. A practitioner's name is **provenance, not evidence** (SCHEMA hard rule). Communicators inherit their
   sources' tiers.
3. A predictive **biomarker** associated with mortality (VO2max, grip, SRT, BOLT) is **not** proof that
   training that biomarker changes the outcome.
4. **Mechanism ≠ outcome.** Most hype (NAD+, sulforaphane, resveratrol, BOLT, cold) lives in this gap.
5. Open conflicts (protein↔mTOR) stay **open** — recorded, not resolved.
