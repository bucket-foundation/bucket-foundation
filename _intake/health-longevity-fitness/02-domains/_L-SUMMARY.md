# Domain L — Measurement & Biomarkers — Summary (Wave 1, 2026-06-27)

The measurement layer + the actionable capstone. The domain where two extra hazards stack on top of the usual
mechanism≠outcome rule: **(1) predictor ≠ lever** (most biomarkers predict death without being causal) and
**(2) measurement validity is itself a tier** (a consumer "VO2max", "deep-sleep %", "biological age" or
"glucose spike" can be very wrong).

## Deliverables written
- `02-domains/L-biomarkers.md` — human-readable, organized by measurement class (VO2max, DEXA, grip/gait,
  blood panel, biological-age tests, wearables), grading **what each test actually predicts**.
- `02-domains/L-claims.json` — **19 graded claims**, all DOI-sourced + tiered.
- `04-protocols/WHAT-TO-TRACK-SYNTHESIS.md` — the cross-domain actionable capstone: **what to DO** and **what
  to MEASURE**, each organized into Tier A (well-established) / B (promising) / C (speculative/hyped), with
  every lever cross-linked to graded claim `id`s across domains B, C, D, E, G, H, I, L.
- `00-map/discovered-people.md` — **+18 figures** (Sniderman, Ference, Kamstrup, Nordestgaard, Clarke, Ridker,
  Danesh/ERFC, Selvin, Studenski, Cooper/Kuh, Newman, Kuk/Katzmarzyk, Ross, Tsuji, Shaffer, Chinoy, Kovatchev,
  Hanley).
- `00-map/discovered-concepts.md` — **+12 concepts** (apoB/particle number, discordance analysis, cumulative
  apoB exposure, Lp(a), Mendelian-randomization-as-causality-test, predictor-vs-cause razor, time-in-range,
  MARD, IGF-1 U-shape, biological-age validity gap, functional biomarkers, strength-not-mass principle).
- `_intake-raw/openalex/` — **26 raw OpenAlex records** archived + `MANIFEST-L-domain.txt` (hook-safe:
  curl→file then parse separately; never `curl | python3`).

## Claims by evidence tier (19 total)
| Tier | Count | Note |
|---|---|---|
| `meta` | 9 | BMD-fracture (Marshall), gait meta (Veronese), physical-capability meta (Cooper), apoB-superior (Sniderman), LDL/apoB-causal (Ference+MR), Lp(a)-causal (Kamstrup/Clarke), hsCRP (ERFC+CCGC), fasting-glucose (ERFC), IGF-1 U-shape (Burgers) |
| `cohort` | 7 | CRF-vital-sign (Ross), DXA-strength-not-mass (Newman), visceral-fat (Kuk), gait-survival (Studenski), HbA1c (Selvin), HOMA-IR (Hanley), HRV-mortality (Tsuji) |
| `mechanistic` (incl. validity) | 3 | biological-age-not-surrogate (cross-ref C), sleep-tracker-staging (Chinoy), CGM-accuracy/healthy (Kovatchev/Danne) |

By type: **outcome 16 · mechanism 3.** Note the meta-heavy profile is real but **almost all metas are of
OBSERVATIONAL data** — the genuine exceptions where causality is established (apoB/LDL, Lp(a)) triangulate
genetics+epi+RCT, and are flagged as the corpus's few causal blood levers.

## The honest grading calls (the brief's actual asks)
- **VO2max:** strongest single predictor — magnitude cross-referenced to E (Mandsager/Kodama); here the
  measurement caveat that *estimated* VO2max (wearables/non-exercise) is a trend tool, not calibrated.
- **DEXA:** best for **bone** (but most fractures occur outside the osteoporotic BMD range — low sensitivity);
  the **lean MASS it measures does NOT independently predict mortality — STRENGTH does** (Newman/Health ABC),
  the root of the EWGSOP2 mass→strength reframe. Visceral fat predicts beyond BMI (DXA VAT is an estimate).
- **Grip & gait:** four stopwatch tests (grip/gait/chair-rise/balance) rival expensive panels (Cooper meta) —
  but they are **biomarkers of reserve, not levers**, with reverse-causation built in.
- **Blood panel, graded by what each marker DOES:** apoB > LDL-C and **causal** (the high-confidence
  modifiable lever); **Lp(a) causal + genetic → measure once**; **hsCRP predicts but Mendelian-null → readout
  not lever** (and JUPITER's benefit was via LDL, not CRP); HbA1c predicts in the non-diabetic range;
  HOMA-IR/fasting insulin = earliest metabolic warning (assay-standardization caveat); **IGF-1 is U-shaped** —
  refutes "minimize IGF-1/mTOR for longevity."
- **Epigenetic/biological-age tests:** predictive at population level but **none is a validated surrogate**
  (Moqri 2023, cross-ref C) and first-gen clocks are noisy (PC-clock fix) → a single number cannot tell a
  person whether their protocol "works." Placed in L because that's where the *purchase decision* happens.
- **Wearables:** HRV predicts mortality but is method/device-dependent → within-person trend tool, not a
  cross-person instrument; consumer sleep trackers stage sleep poorly vs PSG (trust duration/timing); CGM is
  validated for **diabetes** (time-in-range) but **unvalidated and oversold for healthy users** (cross-ref D).

## The capstone's headline (WHAT-TO-TRACK-SYNTHESIS.md)
Evidence is lopsided toward a short list of **boring, powerful, mostly-functional levers** (don't smoke; build
CRF + strength; move more; sleep ~7h; low lifetime apoB; healthy metabolic profile). Highest-signal
**measurements** = **functional** (VO2max, grip, gait, chair-rise, balance) + a few **causal/early-warning
blood markers** (apoB, Lp(a) once, HbA1c, fasting insulin). Almost everything *sold* — biological-age clocks,
CGM for the healthy, consumer HRV/sleep-stage numbers, senolytics/NAD+/rapamycin for healthy people, cold
plunges, seed-oil panic — is a correlate-as-scorecard, a mouse result, or a dose that doesn't match the
studied dose.

## Conflicts (no new ones; cross-linked to existing)
L claims attach to existing conflicts rather than duplicate them: `conflict-which-clock-is-valid` (C, biological
age), `conflict-cgm-healthy-utility` (D, CGM), `conflict-protein-mtor-longevity` (D, IGF-1 U-shape). The
apoB-vs-LDL-C question is graded as **resolved-enough** (apoB superior) and recorded as a claim, not a conflict.

## Canon cross-links (UP to bucket-canon/05-biophysics)
IGF-1/insulin nutrient-sensing (IGF-1 U-shape); CRF ↔ mitochondrial oxidative capacity (ties to E's
Holloszy/lactate-shuttle bridges). The measurement layer mostly consumes foundations rather than adding new
ones.

## Wave 2 gaps (priority order)
1. **ApoB intervention/treatment thresholds** + the lean-mass-hyper-responder ketogenic-diet apoB question
   (bridge D) — the actionable "what to do about a high apoB" layer.
2. **Rate of force development / power** as a mortality predictor distinct from grip (Attia emphasis; flagged
   in the E Wave-2 gaps too).
3. **VO2max trainability / responder variance** (HERITAGE/Bouchard) — bridges C; how much of CRF is trainable
   vs genetic, which reframes the "lever vs marker" status of VO2max.
4. **Omega-3 Index** as a measurable biomarker (already a discovered-concept via Harris/Rhonda) — grade the
   omega-3 ↔ biological-age / mortality evidence.
5. **Standardized assays** — the insulin and Lp(a) assay-standardization problems (mass vs nmol/L for Lp(a))
   deserve their own validity claim.
6. **VAT by DXA vs CT/MRI** head-to-head validity; and a hard-endpoint sit-to-rise/floor-mobility claim
   (Brito/Araujo 2014 is already carded under people — pull it into a claim).
7. **People carding:** push the 18 Domain-L figures into `01-people/cards/` in the canon-figures schema.

## Provenance method
All DOIs verified via OpenAlex direct-DOI lookup (`mailto=gianyrox@gmail.com`); 3 initial DOIs collided and
were corrected against title+author+venue before use (Kuk visceral-fat .34→.43; Sniderman 2011 meta
.111.964866→.110.959247; verified Tsuji HRV record). Title searches resolved the uncertain ones (HOMA-IR/IRAS,
gait meta, physical-capability meta, CGM accuracy, VAT). Hook-safe throughout: `curl -sf … -o file` then parsed
in a separate python3 step — never `curl | python3`. Biological-age-test claim deliberately cross-references
Domain C's DOIs rather than fabricating new ones, per the no-laundering rule. Random walk: VO2max/CRF (measure
side) → DEXA bone→body-comp→VAT → grip/gait/physical-capability battery → lipid panel (apoB→LDL-causal→Lp(a)) →
hsCRP predictor-vs-cause → glucose/insulin axis → IGF-1 U-shape → biological-age validity gap → wearables
(HRV→sleep→CGM) → the WHAT-TO-TRACK capstone.
