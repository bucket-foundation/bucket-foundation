# Domain K — Aging / Longevity Clinical Trials

> **Wave:** Labs/Trials build, 2026-06-27. Companion machine file: `trials.json` (15 trials + TAME design).
> **Source:** ClinicalTrials.gov API v2 (`query.term` searches + per-NCT detail pulls).
> **The single most important fact on this page →** with the (still-unfunded) exception of **TAME's
> proposed composite morbidity/mortality endpoint, every active human aging/longevity trial below uses
> a SURROGATE endpoint** — body composition, VO2max, gait speed, an inflammatory/epigenetic clock, a
> biomarker. **Zero are powered on a hard human longevity/mortality outcome.** This is the central
> honest finding of the field's trial landscape, and it mirrors `02-domains/_B-SUMMARY.md` ("zero
> hard-endpoint human longevity claims exist in the literature").

## Endpoint legend
- **SURROGATE** — biomarker / functional proxy (VO2max, DXA fat, gait speed, FMD, epigenetic clock,
  oxidative-stress markers, CSF amyloid). Correlated with aging/mortality, but a change in the
  surrogate is **not** a demonstrated change in lifespan or disease incidence.
- **HARD** — clinical event: death, incident major disease, or a validated morbidity composite.
  In this corpus only **TAME** (proposed) targets one — and it is not yet funded/enrolling.

---

## By intervention class

### Rapamycin / mTOR inhibition
| NCT | Trial | Status | Phase | n | Endpoint | Type |
|---|---|---|---|---|---|---|
| NCT04488601 | **PEARL** (AgelessRx) | Completed | 2 | 129 | Visceral fat (DXA), QoL | SURROGATE |
| NCT07475546 | Combination gerotherapeutics (AgelessRx) | Active, not recruiting | "3" (n=30) | 30 | VO2max, cognition, iAge | SURROGATE |
| NCT06727305 | mTOR inhibitors in older adults (UTSW) | Recruiting | 1/2 | 60 | PK/dose-finding | SURROGATE |

PEARL is the largest published off-label rapamycin longevity RCT (safety + lean-mass/QoL signal in
women, body-comp surrogate). Note also the UW **Dog Aging Project / TRIAD** rapamycin companion-dog
trial (veterinary, not on the human registry — see `labs.json` UW node).

### Metformin (the flagship hard-endpoint bid)
| NCT | Trial | Status | n | Endpoint | Type |
|---|---|---|---|---|---|
| TAME-unregistered | **TAME** — Targeting Aging with Metformin (AFAR / Barzilai) | Planned, **unfunded** | ~3000 | Composite: incident CVD/cancer/dementia or death | **HARD (proposed)** |
| NCT05651620 | CALERIE Legacy (Tufts) | Active, not recruiting | 216 | Biological age, healthspan | SURROGATE |

**TAME is the field's one serious attempt at a hard composite endpoint** and an FDA precedent for
treating aging as an indication. As of 2026 it remains unfunded and not actively enrolling under a
public NCT — the ClinicalTrials.gov "metformin aging" search returns CALERIE-Legacy, not TAME. Logged
as a tracked **design**, not an active study.

### NAD+ precursors (NMN / NR)
| NCT | Trial | Status | Phase | n | Endpoint | Type |
|---|---|---|---|---|---|---|
| NCT05878119 | MIB-626 (NMN) ± exercise (Metro Intl Biotech) | Completed | 2 | 124 | VO2max @ wk 11 | SURROGATE |

Feeds the **open NAD+-precursor-efficacy conflict** (`06-evidence/CONFLICTS.md`): surrogate NAD+
repletion is real, downstream outcome is unproven. (Many more NR/NMN trials exist for disease
indications — hypertension, kidney disease, CABG — all surrogate; indexed via the search dump.)

### Senolytics (dasatinib+quercetin, fisetin)
| NCT | Trial | Status | Phase | n | Endpoint | Type |
|---|---|---|---|---|---|---|
| NCT04063124 | **SToMP-AD** D+Q in Alzheimer's (UT San Antonio) | Completed | 1/2 | 5 | CNS penetrance, safety | SURROGATE |
| NCT04733534 | D+Q & fisetin, childhood-cancer survivors (St. Jude) | Active | 2 | 110 | Gait speed | SURROGATE |
| NCT03675724 | **AFFIRM-LITE** fisetin, frailty (Mayo) | Enrolling-by-invite | 2 | 40 | Inflammation markers | SURROGATE |
| NCT06133634 | Fisetin, vascular function (CU Boulder) | Active | 1/2 | 70 | Endothelial function | SURROGATE |

The Mayo lineage (Kirkland/LeBrasseur) coined "senolytics." Reminder negative datapoint from the
labs map: **Unity's UBX0101** senolytic **failed** its knee-OA Phase 2 (2020) — strong mouse
senescence-clearance biology did not translate.

### Taurine
| NCT | Trial | Status | n | Endpoint | Type |
|---|---|---|---|---|---|
| NCT05149716 | Taurine anti-aging (Univ. São Paulo) | Completed | 24 | Oxidative-stress markers (SOD/GR/MDA) | SURROGATE |

Human surrogate follow-up to Singh et al. 2023 *Science* (taurine deficiency drives aging in
mice/monkeys — **animal-tier origin**).

### GLP-1 / longevity overlap
The "semaglutide aging" search returns mostly weight-loss, NASH, Alzheimer's (e.g. NCT04777396
semaglutide early-AD Phase 3), and cardiometabolic trials, plus **NCT07444073** "Assessing Biological
Aging in a Real-World Medical Weight Loss Program" (biological-age surrogate). No GLP-1 trial uses a
longevity hard endpoint; the longevity interest is downstream of cardiometabolic/weight outcomes.
Indexed in the raw dump; not individually carded (all SURROGATE for aging purposes).

### Young plasma / plasma exchange / dilution
| NCT | Trial | Status | Phase | n | Endpoint | Type |
|---|---|---|---|---|---|---|
| NCT06534450 | TPE on age biomarkers & epigenetics (Kiprov) | Active | "3" (n=40) | 40 | Epigenetic clock, safety | SURROGATE |
| NCT00742417 | Plasma exchange, CSF amyloid in AD (Grifols) | Completed | 2 | 42 | CSF Aβ1-42 | SURROGATE |

Tests the Conboy "blood dilution" reframing of parabiosis (Berkeley node). Disease analogue =
Grifols AMBAR plasma-exchange Alzheimer's program.

### Urolithin A / mitophagy (muscle)
| NCT | Trial | Status | n | Endpoint | Type |
|---|---|---|---|---|---|
| NCT04783207 | **ENDURO** Mitopure, endurance (Amazentis) | Completed | 42 | CK, 3000 m race time | SURROGATE |
| NCT03258346 | Exercise + pomegranate, muscle loss (UT Austin) | Completed | 40 | Muscle volume, aerobic capacity | SURROGATE |

Amazentis (Mitopure seller) sponsorship = **COI flag**. Mitophagy has human muscle-RCT support; no
longevity outcome.

---

## What the trial landscape proves (and doesn't)

1. **No hard-endpoint human longevity trial is currently running.** TAME would be the first; it isn't
   funded. Everything else moves a surrogate.
2. **Surrogates cluster into four buckets:** body composition (PEARL, urolithin), function (VO2max,
   gait speed, endothelial), inflammatory/biological-age clocks (combination, CALERIE, TPE), and
   pathway biomarkers (NAD+, oxidative stress, CSF amyloid).
3. **Mouse→human translation gaps are explicit:** taurine, senolytics, and reprogramming all have
   strong animal-tier origins; the human trials are smaller, shorter, surrogate-only — and at least
   one (Unity UBX0101) already failed. Per SCHEMA: an `animal` result may never be laundered into a
   human `outcome`.
4. **Sponsorship COIs are common** (AgelessRx, Amazentis, Metro Intl Biotech sell the intervention) —
   recorded per-trial in `trials.json`.

*Raw API dumps: `_intake-raw/clinicaltrials/` (search results) + per-NCT detail. Companion:
`LABS.md`, `labs.json`. Graded claims → `02-domains/B-claims.json`. Conflicts → `06-evidence/CONFLICTS.md`.*
