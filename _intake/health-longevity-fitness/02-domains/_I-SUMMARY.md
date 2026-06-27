# Domain I — Sleep, Circadian & Recovery — Summary (Wave 1, 2026-06-27)

Built as the OUTCOME-layer counterpart to the existing FOUNDATION-layer Kruse circadian-light material
(`_intake/concept-circadian-light-environment`, `kruse-blog-corpus`). Bound to the rest of the corpus by the
**circadian/light** cross-cutting thread (the master-clock input that also gates metabolism, hormones, and
the autonomic/HRV axis shared with Domains G and H). The domain's load-bearing job is policing three specific
mechanism→outcome laundering moves: *glymphatic clearance* → "sleep prevents Alzheimer's"; *blue light
suppresses melatonin* → "screens cause disease"; *short sleep associates with mortality* → "sleep less and
you die sooner" (the association is U-shaped and confounded).

## Deliverables written
- `02-domains/I-sleep-circadian.md` — graded narrative, 7 sections incl. the **Kruse bridge** (§7)
- `02-domains/I-claims.json` — **16 graded claims**, every one DOI-sourced & OpenAlex-verified
- `06-evidence/CONFLICTS.md` — **+3 conflicts appended** (Walker claims; sleep-duration causality; blue-blocking glasses)
- `00-map/discovered-people.md` — **+12 figures** (Nedergaard, Iliff, Panda, Roenneberg, Walker, Van Cauter, Brainard, Czeisler, McEwen, Shaffer, Gooley, Guzey)
- `00-map/discovered-concepts.md` — **+6 concepts** (glymphatic system, melanopsin/ipRGC, social jetlag, allostatic load, sleep-duration U-shape, U-shape-vs-Walker)
- `_intake-raw/openalex/` — 16 raw OpenAlex JSON records archived

## Claims by evidence tier
| meta | rct | cohort | cross-sectional | mechanistic | animal | theoretical | total |
|---|---|---|---|---|---|---|---|
| 3 | 3 | 1 | 2 | 3 | 3 | 1 | **16** |

## Claims by type
- **mechanism 8 · outcome 8.** Every "sleep clears Abeta" / "blue light suppresses melatonin" / "low HRV
  signals stress" is tagged `mechanism`; the U-shape mortality and TRE/social-jetlag findings are `outcome`
  but flagged `mixed`/observational where they are.

## The structural honesty notes
- **Glymphatics is foundational but `animal`.** Iliff 2012 + Xie 2013 are MOUSE; the human result
  (Shokri-Kojori 2018) is one night / surrogate PET / n=20. Human glymphatic existence/magnitude is actively
  disputed. The mechanism is real; "sleep prevents dementia" is not earned.
- **The sleep-mortality curve is U-shaped, not monotonic.** Cappuccio (`meta`, >1.3M) and Kripke (`cohort`,
  ~1.1M) both show LONG sleep associates with mortality at least as strongly as short sleep — most plausibly
  reverse causation (illness causes long sleep). The defensible message is a **~7h floor**, NOT "more is better."
- **The circadian-LIGHT mechanism is settled `mechanistic` human science** (Brainard action spectrum, Gooley
  room-light, Chang e-reader) — but the hard health OUTCOMES of light hygiene are thin, and the popular product
  (blue-blocking glasses) is unsupported by Cochrane even though the underlying mechanism is real.
- **HRV is a biomarker, not an intervention** — noisy, method-dependent, only valid within-person over time.
- **Allostatic load is a `theoretical` framework** — explanatory, inconsistently operationalized, predicts less
  well than it post-hoc explains.

## The Kruse bridge (§7) — the valuable cross-link
Mainstream chronobiology **validates the spine** of Kruse's circadian-light thesis and **grades the extensions**:
- **AGREE:** light is the dominant SCN zeitgeber; blue/short-wavelength light at night suppresses melatonin &
  disrupts the clock; circadian misalignment harms metabolism. (Brainard/Gooley/Chang/Roenneberg/Panda back this.)
- **DIVERGE (`speculative`/`theoretical`):** sunlight's causal PRIMACY over food; UV/IR/red-light as broad
  systemic therapy (only Jeffery 670 nm is `mechanistic`); "non-native EMF"; deuterium/EZ-water circadian
  coupling. These outrun the evidence tier and are parked, not promoted.
The agreement-on-the-spine is itself a citeable canon result; the divergence list is the promotion-decision queue.

## Conflicts logged (3 new, in CONFLICTS.md)
1. **conflict-walker-sleep-claims** — Walker's specific claims overstated/mis-sourced (U-shape vs monotonic; IARC = shift work not short sleep). *Partially-resolved: message right, specifics wrong.*
2. **conflict-sleep-duration-causality** — short sleep causal vs reverse causation? *Open; long-sleep arm mostly reverse-causal; needs MR/actigraphy.*
3. **conflict-blue-blocking-glasses** — the mechanism (avoid evening blue light) is real but the PRODUCT (amber lenses, Cochrane = no benefit) is not. *Partially-resolved/definitional.*

## Canon cross-links made (UP to bucket-canon/05-biophysics)
Non-visual photoreception / melanopsin / ipRGC (Brainard); cell-water & interstitial-fluid physics (glymphatic
clearance); HPA-axis / redox stress signaling (allostatic load). Circadian/light is the named thread tying this
OUTCOME domain to the Kruse-tier biophysics FOUNDATION layer.

## Wave 2 gaps (priority order)
1. **Human glymphatic measurement at scale** — does the mouse mechanism replicate quantitatively in humans? (biggest open question under §1).
2. **Morning-bright-light RCTs for OUTCOMES** (circadian/mood/metabolic), not just the melatonin surrogate.
3. **TRE vs calorie-matched human controls** — does meal timing beat calories in humans? (the Panda program's open question; the human Wilkinson pilot is uncontrolled).
4. **Isolate evening-light AVOIDANCE from blue-blocker PRODUCTS** — the §3/conflict definitional gap.
5. **HRV-guided training as a real intervention** vs a vanity metric — RCTs with hard endpoints.
6. **Primary-derivation chain under Kruse UV/IR/melanin claims** — to decide canon-promotion vs `speculative` parking (§7 divergence list).
7. **Chronotype-aligned scheduling trials** (shift work, school start times) — bridges Domain C genetics.
8. **People carding:** 12 figures added to `discovered-people.md` not yet in `01-people/` (Nedergaard, Panda, Roenneberg, Van Cauter, Brainard, Czeisler, McEwen…).

## Provenance method
All 16 DOIs verified via OpenAlex direct-DOI lookup with `mailto=gianyrox@gmail.com` (title/year/venue/author
confirmed). Hook-safe throughout: `curl -sf … -o /tmp|_intake-raw/openalex/*.json` then parsed in a separate
python3 step, never `curl | python3`. Raw records archived in `_intake-raw/openalex/`. One critique source
(Guzey, "Why We Sleep" analysis) is a web essay with **no DOI** — tagged `anecdotal`/critique-tier and labeled
as such rather than given a fabricated citation, per the no-laundering rule. Kruse material **cross-referenced,
not re-pulled** (existing corpus).
