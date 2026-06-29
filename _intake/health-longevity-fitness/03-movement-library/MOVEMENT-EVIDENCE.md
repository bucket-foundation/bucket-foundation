# Movement ↔ Evidence Pairing

> Built 2026-06-27 (Wave 3). Pairs each demonstration movement in the library to the **primary,
> already-graded evidence** in the corpus (`02-domains/*-claims.json`). Demonstration videos are
> graded `anecdotal`/demonstration tier — they show *how* to perform a movement. The evidence below
> is the *outcome/mechanism* claim that justifies why the movement matters. **The demonstration is not
> the evidence.** DOIs are pulled from the corpus claims files; claims not yet in the corpus are flagged.

## Reading the table
- **Movement** → library slug (`03-movement-library/<cat>/<slug>`).
- **Evidence claim** → `id` in the relevant `02-domains/<D>-claims.json`.
- **Tier** → evidence tier as graded in the corpus (`cohort` > `meta`/`rct` > `mechanistic`/`animal` > `anecdotal`).
- A movement may map to a mechanism claim (why it could work) *and* an outcome claim (it tracks mortality/health).

---

## Strength (Domain E / L)

| Movement | Evidence claim (corpus id) | Tier | Primary | DOI |
|----------|---------------------------|------|---------|-----|
| back-squat, deadlift, split-squat, push-up, pull-up | `resistance-training-mortality-meta` | meta | Momma/Kawakami/Sawada — muscle-strengthening activity & mortality, Br J Sports Med 2022 | 10.1136/bjsports-2021-105061 |
| farmers-carry (grip) | `grip-strength-mortality-pure` | cohort | Leong et al. — grip strength prognostic value, PURE, Lancet 2015 | 10.1016/S0140-6736(14)62000-6 |
| farmers-carry (grip) | `grip-strength-biomarker-aging` | mechanistic | Bohannon — grip strength biomarker, Clin Interv Aging 2019 | 10.2147/cia.s194543 |
| all strength patterns (anti-sarcopenia) | `sarcopenia-strength-defining-ewgsop2` | cohort | Cruz-Jentoft et al. — EWGSOP2 sarcopenia consensus, Age Ageing 2018 | 10.1093/ageing/afy169 |
| all strength patterns (strength > mass) | `dexa-strength-not-mass-predicts-mortality` | cohort | Newman et al. — Health ABC, J Gerontol 2006 | 10.1093/gerona/61.1.72 |
| plank-pallof, (deadlift bracing) | `mcgill-big3-back-stability` | rct (small) | McGill spine-stabilization body of work | — (no single DOI; PMC5908986) |
| any aerobic conditioning (KB swing, carries as MetCon) | `crf-vo2max-strongest-mortality-predictor` | cohort | Mandsager et al. — CRF & mortality, JAMA Netw Open 2018 | 10.1001/jamanetworkopen.2018.3605 |

## Balance & Locomotion (Domain F / L)

| Movement | Evidence claim (corpus id) | Tier | Primary | DOI |
|----------|---------------------------|------|---------|-----|
| sit-to-rise | `sit-to-rise-mortality` | cohort | Brito et al. — sitting-rising test & mortality, Eur J Prev Cardiol 2014 | 10.1177/2047487312471759 |
| single-leg-balance | `one-leg-stance-10s-mortality` *(L; added Wave 4)* | cohort | Araujo et al. — 10-s one-legged stance predicts survival, Br J Sports Med 2022 | 10.1136/bjsports-2021-105360 |
| gait-walking | `gait-speed-survival-studenski` | cohort | Studenski et al. — gait speed & survival, JAMA 2011 | 10.1001/jama.2010.1923 |
| sit-to-rise, single-leg-balance, gait-walking (composite) | `physical-capability-battery-mortality-meta` | meta | Cooper/Kuh/Hardy — physical capability & mortality, BMJ 2010 | 10.1136/bmj.c4467 |
| turkish-get-up, baby-crawl, bear-crawl | *(ground-to-stand / fall prevention — demonstration tier; no direct primary; supported by capability-battery above)* | anecdotal | — | — |

## Breath (Domain G)

| Movement | Evidence claim (corpus id) | Tier | Primary | DOI |
|----------|---------------------------|------|---------|-----|
| physiological-sigh | `cyclic-sighing-mood-arousal-rct` | rct | Balban/Huberman et al. — cyclic sighing, Cell Rep Med 2023 | 10.1016/j.xcrm.2022.100895 |
| box-breathing, coherent-breathing, diaphragmatic (slow exhale) | `exhalation-vagal-mechanism` | mechanistic | Gerritsen & Band — respiratory vagal stimulation, Front Hum Neurosci 2018 | 10.3389/fnhum.2018.00397 |
| wim-hof-rounds | `wim-hof-voluntary-sns-immune-attenuation` | rct | Kox et al. — voluntary SNS activation & innate immunity, PNAS 2014 | 10.1073/pnas.1322174111 |
| wim-hof-rounds (mechanism) | `wim-hof-lactate-mediated-antiinflammatory` | mechanistic | Zwaag/Kox/Pickkers — lactate/pyruvate anti-inflammatory, Metabolites 2020 | 10.3390/metabo10040148 |
| wim-hof-rounds (caution) | `wim-hof-systematic-review-caution` | meta | Almahayni & Hammond — WHM systematic review, PLoS ONE 2024 | 10.1371/journal.pone.0286933 |
| buteyko-nasal, nasal-breathing | *(CO2-tolerance / Bohr — demonstration + mechanism; no graded outcome RCT in corpus yet)* | mechanistic | — | — |

## Heat / Sauna (Domain H / J)

| Movement | Evidence claim (corpus id) | Tier | Primary | DOI |
|----------|---------------------------|------|---------|-----|
| finnish-sauna, laukkanen-frequency | `sauna-frequency-mortality-kihd` | cohort | Laukkanen et al. — sauna & CV/all-cause mortality, JAMA Intern Med 2015 | 10.1001/jamainternmed.2014.8187 |
| finnish-sauna (dementia) | `sauna-dementia-association` | cohort | Laukkanen et al. — sauna & dementia, Age Ageing 2016 | 10.1093/ageing/afw212 |
| finnish-sauna (mechanism) | `sauna-cardiovascular-physiology` | mechanistic | Laukkanen & Kunutsor — sauna review, Mayo Clin Proc 2018 | 10.1016/j.mayocp.2018.04.008 |
| finnish-sauna, hydration-protocol (HSP) | `heat-shock-proteins-mechanism` | mechanistic | Periard/Racinais/Sawka — heat acclimation, Scand J Med Sci Sports 2015 | 10.1111/sms.12408 |

> **Confound (record on every sauna claim):** the Laukkanen cohort signal is observational —
> healthy-user / reverse-causation is the standard critique. Cohort tier, not causal.

## Cold Thermogenesis (Domain H / J)

| Movement | Evidence claim (corpus id) | Tier | Primary | DOI |
|----------|---------------------------|------|---------|-----|
| cold-shower-entry | `cold-showering-sick-leave-rct` | rct | Buijze et al. — cold showering, health & work RCT, PLoS ONE 2016 | 10.1371/journal.pone.0161749 |
| cold-plunge-entry, soberg-principle | `shivering-vs-nonshivering-thermogenesis` | mechanistic | Soberg et al. — winter-swimmer brown-fat thermogenesis, Cell Rep Med 2021 | 10.1016/j.xcrm.2021.100408 |
| cold-plunge-entry (BAT) | `cold-activated-bat-adult-humans` | mechanistic | van Marken Lichtenbelt et al. — cold-activated BAT, NEJM 2009 | 10.1056/NEJMoa0808718 |
| cold-plunge-entry (metabolic) | `cold-acclimation-insulin-sensitivity-t2d` | rct | Hanssen et al. — cold acclimation & insulin sensitivity, Nat Med 2015 | 10.1038/nm.3891 |
| soberg-principle (end-on-cold dose) | `soberg-11min-end-on-cold` | anecdotal | Soberg — Winter Swimming / Soeberg Institute synthesis | — |
| breath-control-cold, contrast-therapy | *(demonstration + mechanism; contrast-therapy recovery benefit is contested — see SAFETY-FLAGS / conflicts)* | mechanistic | — | — |

## Mobility, Flexibility, Yoga (Domain F)

| Movement | Evidence status | Notes |
|----------|----------------|-------|
| All mobility (CARs, 90/90, dislocates, deep-squat, ankle, t-spine, wrist) | `anecdotal` / demonstration | No primary in corpus shows CARs change passive ROM. FRC claims are teacher-attributed, not graded. Gap flagged in `_SUMMARY.md`. |
| All flexibility (couch, pancake, PNF, splits, Jefferson curl, doorway) | `anecdotal` / `mechanistic` | PNF autogenic-inhibition mechanism is textbook; flexibility→performance/longevity links are weak-tier. Static-stretch-before-lifting is a recorded **conflict**. |
| All yoga (sun-sal, down-dog, warrior, triangle, tree, child, cobra) | demonstration + Domain I evidence *(graded Wave 4)* | Yoga→HRV/parasympathetic + BP + stress now graded in Domain I: `yoga-hrv-vagal-increase`, `yoga-blood-pressure-meta`, `yoga-stress-mood-rct-review`, `mindfulness-meditation-physiological-stress-meta`. All surrogate-tier, mostly low quality — supportive direction, not hard-outcome proof. |

---

## Cross-domain "movement biomarkers" (the strongest longevity links)

These five movements double as **validated aging/mortality biomarkers** — the highest-value pairings:

1. **VO2max test / aerobic capacity** → Mandsager 2018 (`cohort`, no upper benefit limit) — `10.1001/jamanetworkopen.2018.3605`
2. **Grip strength (farmers-carry)** → Leong/PURE 2015 (`cohort`) — `10.1016/S0140-6736(14)62000-6`
3. **Sit-to-rise** → Brito 2014 (`cohort`) — `10.1177/2047487312471759`
4. **Gait speed (walking)** → Studenski 2011 (`cohort`) — `10.1001/jama.2010.1923`
5. **10-s single-leg balance** → Araujo 2022 (`cohort`; graded `one-leg-stance-10s-mortality` in L, Wave 4) — `10.1136/bjsports-2021-105360`

> These are *measurements* that happen to also be *trainable movements* — the rare case where the
> demonstration and the evidence collapse into the same object. Prioritize them in any Bucket canon
> export of the movement library.

## TODO for next wave
- ~~Add Araujo 2022 (10-s balance) to `02-domains/L-claims.json`~~ **DONE Wave 4** (`one-leg-stance-10s-mortality`).
- ~~Grade yoga→HRV RCTs into Domain I and back-link the yoga rows above.~~ **DONE Wave 4** (4 claims; see yoga row).
- ~~Resolve recorded conflicts as first-class objects: static-stretch-before-lifting; cold-after-resistance; infrared vs traditional sauna; contrast-therapy recovery.~~ **DONE** — all four (static-stretch + cold-after-resistance were already in `06-evidence/CONFLICTS.md`; infrared-sauna + contrast-therapy + foam-rolling formalized Wave 4). See `_WAVE4-CLEANUP.md`.
