# Domains M · N · O — Summary (Wave 5, 2026-06-27)

**Mandate:** fill GENUINE GAPS the biohacker-centric map systematically under-weights. These three domains
are *unbiased-completeness* additions — not because they are fringe, but because they are **unmonetizable,
inconvenient, or adjacent**, which is exactly how a market-shaped attention bias hides large effects. Each
is graded honestly against `06-evidence/SCHEMA.md`.

## The three gaps, and why they are gaps
- **M — Psychosocial determinants:** the field optimizes supplements (`mechanistic`/`surrogate`) while the
  **largest, highest-tier all-cause-mortality effects in the corpus are social/psychological** (`meta`/
  `cohort`). Social connection ≈ smoking-cessation effect size; the SES gradient ≈ 3×; purpose HR ≈ 2.4.
  Under-sold because there is **no SKU for friendship, autonomy, or meaning.**
- **N — Women's longevity:** the field's anchors are **male cohorts** (sauna n=2,315 men; Whitehall I male).
  Women live longer but with more disability; the one big women's-RCT body (HRT/WHI) was **right about its
  old cohort and catastrophically over-generalized.** Much of the deliverable is an **absence map.**
- **O — Hypoxia/altitude:** the adjacent hormetic stressor (flagged by Domain G breath). **Nobel-grade
  foundation (HIF, EPAS1), near-empty human longevity outcome.** Dose is everything — the same intermittent
  hypoxia is therapeutic at low dose and the engine of sleep-apnea harm at high dose.

## Deliverables written
- `02-domains/M-psychosocial-determinants.md` + `M-claims.json` — **11 claims**
- `02-domains/N-womens-longevity.md` + `N-claims.json` — **9 claims**
- `02-domains/O-hypoxia-altitude.md` + `O-claims.json` — **9 claims** (29 total)
- `00-map/discovered-people.md` — **+21 figures** (Holt-Lunstad, Steptoe, Marmot, Boyle, Alimujiang, McEwen,
  VanderWeele, Li; Oksuzyan, Rossouw, Manson, Hodis, Harman; Semenza, Kaelin, Ratcliffe, Beall, Yi, Simonson,
  Mitchell/Navarrete-Opazo, Baković)
- `00-map/discovered-concepts.md` — **+16 concepts** (social-connection mortality, loneliness-vs-isolation,
  ikigai/purpose, Marmot gradient, allostatic load, religious-attendance; health-survival paradox, estrogen-
  timing hypothesis, WHI over-generalization, male-default-cohort problem, menopause inflection; HIF oxygen-
  sensing, EPAS1 adaptation, IH 'matter of dose', breath-hold/splenic, altitude-longevity confounding)
- `06-evidence/CONFLICTS.md` — **+3 conflicts** (loneliness-vs-isolation; HRT-timing; altitude-longevity-confounding)
- `_intake-raw/openalex/` — **~22 raw OpenAlex JSON records archived** this wave

## Claims by evidence tier (29 total)
| meta | rct | cohort | cross-sectional | mechanistic | theoretical | total |
|---|---|---|---|---|---|---|
| 3 | 8 | 5 | 6 | 6 | 1 | **29** |

## Claims by type
- **outcome 14 · mechanism 8 · protocol 1 · (absence-flag outcomes) 6** — the three `unfalsifiable`-direction
  claims in N (male-default cohort, under-enrolled supplement trials, male-derived exercise dose) are the
  **absence ledger**: recorded as explicit gaps, never as nulls or as "applies equally."

## The structural honesty notes (the point of the wave)
- **Effect-size honesty (M):** by the corpus's OWN grading rules, social connection / purpose / SES sit at
  `meta`/`cohort` with large effects, **above** most supplement claims (`mechanistic`/`surrogate`). The
  brief asked to grade them honestly and say so — done, explicitly, in `claim psychosocial-vs-biohack-effect-size`.
  Caveat held firmly: all observational, causally tangled (you cannot randomize loneliness or status).
- **Absence honesty (N):** three claims are pure ABSENCE flags. The honest grade for "does intervention X
  extend healthspan in women?" is, for much of the corpus, **no adequate data** — and the women's deliverable
  is partly a ledger of where confident field advice rests on male cohorts.
- **Mechanism-vs-outcome firewall (O):** HIF (Nobel 2019) and EPAS1 are foundation-grade `mechanistic`/
  `genetic` — and license **nothing** downstream. The IH 'matter of dose' claim is the purest hormesis
  case in the entire corpus. Altitude-longevity epi is real-but-maximally-confounded.

## Canon cross-links proposed (UP to bucket-canon/05-biophysics)
- **O is the strongest promotion candidate:** HIF oxygen-sensing molecular biology (Semenza 1992 / Nobel 2019)
  is axiom-level — flagged as a canon-promotion candidate, kept indexed at outcome-layer until the promotion
  decision (Wave 6).
- M: HPA-axis / allostatic-load / chronic-inflammation mechanism layer.
- N: estrogen-receptor signaling + RANKL/OPG bone remodeling.

## Conflicts logged (3 new)
1. **conflict-loneliness-vs-isolation** — subjective vs objective; *open*, "both, differently."
2. **conflict-hrt-timing** — WHI harm vs early-initiation benefit; *partially-resolved on surrogate endpoints; hard-outcome RCT missing.*
3. **conflict-altitude-longevity-confounding** — altitude protective vs confounded; *open; mechanism solid, outcome not.*

## Provenance method
~22 DOIs verified via OpenAlex direct-DOI (`works/doi:...`) with `mailto=gianyrox@gmail.com`; title/year/first-
author confirmed before citing; raw JSON archived in `_intake-raw/openalex/`. **Hook-safe throughout:** every
fetch was `curl -sf … -o <file>` then parsed in a SEPARATE `python3` step — never `curl | python3` (the hook
blocks the pipe). OpenAlex rate-limited intermittently; failures were retried with 3–5s backoff.
**One honest non-verification:** Faeh 2009 (Swiss altitude-mortality, `10.1161/CIRCULATIONAHA.108.840579`)
kept rate-limiting on auto-lookup — the DOI is from established citation and is **labeled as not machine-verified**
in `O-claims.json` rather than presented as confirmed (per the no-laundering rule). A handful of O claims
(IHHT trials, LHTL performance) cite literature bodies whose individual DOIs are not yet pinned — graded
conservatively and flagged for Wave 6 pinning.

## Wave 6 gaps (priority order)
1. **The three missing RCTs** the field most needs: early-initiation HRT with hard endpoints (N); low-dose
   intermittent hypoxia in aging with hard endpoints (O); social-prescribing/befriending interventions that
   move mortality (M).
2. **Sex-stratified reanalysis** of the sauna/VO2max/strength-mortality cohorts (N's absence map → data).
3. **Pin the unpinned O DOIs** (specific IHHT and LHTL trials) and machine-verify Faeh 2009.
4. **Canon-promotion decision for HIF oxygen-sensing** (O §1) — axiom or outcome-layer mechanism?
5. **Disentangle purpose from baseline health/personality** and **isolation from loneliness** with designs
   that vary one factor (M's two open conflicts).
6. **People carding:** 21 new figures added to `discovered-people.md` not yet in `01-people/`.
