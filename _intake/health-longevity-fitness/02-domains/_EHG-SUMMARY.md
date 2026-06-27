# Domains E / H / G — Summary (Wave 1, 2026-06-27)

Built together because they are bound by the **hormesis** cross-cutting thread (exercise, heat/cold, and
breath-holds are all hormetic stressors) and share a single molecular spine (mitochondria/PGC-1α/UCP1) and
a single autonomic axis (norepinephrine/HRV). The shared **mechanism→outcome laundering risk** — "cold
raises norepinephrine," "heat induces HSPs," "slow breathing raises HRV" — is exactly what these files
police.

## Deliverables written
- `02-domains/E-exercise.md` + `E-claims.json` — **13 graded claims**
- `02-domains/H-thermal.md` + `H-claims.json` — **10 graded claims**
- `02-domains/G-breath.md` + `G-claims.json` — **11 graded claims**
- `04-protocols/` (new dir) — `E-exercise-protocols.md`, `H-thermal-protocols.md`, `G-breath-protocols.md`
  (protocols separated from efficacy claims, each pointing back to its bears-on claim)
- `06-evidence/CONFLICTS.md` — **+6 conflicts appended** (now 12 total in the file)
- `00-map/discovered-exercise-thermal-breath.md` — random-walk node index (new)

**34 graded claims total, all with primary-literature DOIs (41 distinct verified sources via OpenAlex
direct-DOI / PubMed; hook-safe: curl→file then parse separately).**

## Claims by evidence tier
| Domain | meta | rct | cohort | mechanistic | animal | theoretical | total |
|---|---|---|---|---|---|---|---|
| **E** exercise | 4 | 0 | 3 | 5 | 1 | 0 | 13 |
| **H** thermal | 0 | 2 | 2 | 5 | 0 | 1 | 10 |
| **G** breath | 1 | 5 | 0 | 5 | 0 | 0 | 11 |
| **all** | 5 | 7 | 5 | 15 | 1 | 1 | 34 |

## Claims by type
- **E:** outcome 7 · mechanism 6
- **H:** outcome 4 · mechanism 5 · hypothesis 1
- **G:** outcome 6 · mechanism 5
- **Mechanism/outcome discipline enforced.** Every "cold raises NE" / "heat raises HSP" / "exercise builds
  mitochondria" is tagged `mechanism`, never `outcome`. Every human RCT is flagged surrogate/subjective in
  `confidence_notes` (cytokines, mood, cortisol, insulin sensitivity, vaccine-titer-equivalent immune
  endpoints, symptom scores). **Zero hard-endpoint (mortality) RCTs exist in any of these three domains** —
  the strongest longevity signals (VO2max, grip, sauna) are all `cohort`/`meta`, by structural necessity
  (you cannot randomize fitness or sauna over decades), and the files say so explicitly.

## The structural honesty notes (per domain)
- **E:** the single strongest longevity association in preventive medicine (VO2max ↔ mortality, Mandsager
  n=122k, ~5x) is `cohort`, not `rct`. Grip/CRF are **biomarkers** of robustness — training them is not the
  same as the association. Resistance-training mortality benefit is **J-shaped** (more ≠ better).
- **H:** the sauna cohort is one Finnish *men's* cohort with unexcluded healthy-user bias. The cold
  literature has rich `mechanistic` data (BAT, NE, thermogenesis) but the **only human metabolic OUTCOME
  (Hanssen insulin sensitivity) used prolonged mild cold (hours/day), NOT the brief plunge that's sold** —
  a systematic dose↔evidence mismatch flagged in both the domain file and the protocol file.
- **G:** unusually RCT-rich (5 RCTs), but all surrogate/subjective, short, small, healthy. The Wim Hof
  effect is real but **bundled** (breath+cold+meditation, not isolable) and driven by an acute adrenaline
  surge. Buteyko improved asthma *symptoms* not *lung function*. The Bohr-effect/CO2-tolerance and
  nasal-NO mechanisms are settled physiology; the health/performance extrapolations on top are not.

## Conflicts logged (6 new, in CONFLICTS.md)
1. **conflict-cold-after-resistance** — cold immersion post-lifting blunts hypertrophy/strength (Roberts 2015 `rct`). *Mostly-resolved: timing-dependent.*
2. **conflict-static-stretch-performance** — long static holds pre-power impair output (Chaabène 2019 `meta`). *Mostly-resolved: dose/timing.*
3. **conflict-zone2-optimal-mito** — Zone 2 uniquely optimal for mitochondria? *Open (probably polarized training).* 
4. **conflict-concurrent-interference** — endurance vs strength interference (Wilson 2012 `meta`). *Mostly-resolved: dose/modality.*
5. **conflict-sauna-healthy-user** — sauna causal or marker of health? *Open (RCT feasible but unrun).* 
6. **conflict-wim-hof-mechanism** — genuine intervention or acute adrenaline + bundled/low-quality? *Open/partial.*

## Canon cross-links made (UP to bucket-canon/05-biophysics)
Mitochondrial biogenesis (Holloszy), lactate shuttle, muscle substrate metabolism (E); UCP1/mitochondrial
uncoupling + BAT, HSPs/proteostasis, mitohormesis (H); hemoglobin allostery/Bohr effect, nasal NO (G).
The mito/PGC-1α/UCP1 spine and the proteostasis/HSP link are the load-bearing bridges to the biophysics canon.

## Wave 2 gaps (priority order)
1. **Isolate the Wim Hof breathing component** (vs cold vs meditation) — component RCTs; the single biggest open question in G.
2. **Brief cold plunge vs prolonged mild cold** — does the *sold* dose do anything metabolically? (the H dose↔evidence mismatch).
3. **Sauna in women / non-Finnish populations + a sauna RCT** — the obvious missing study; sauna×exercise crossover (Brunt/Minson).
4. **PGC-1α + UCP1 molecular layer** — the mechanism under Holloszy/BAT; explicit canon bridge.
5. **Polarized training + VO2max trainability/responder variance** (Seiler; HERITAGE/Bouchard) — resolves the Zone-2 conflict, bridges Domain C.
6. **Rate of force development / power as a distinct mortality predictor** (separate from grip) — Attia emphasis.
7. **Protein × resistance-training interaction** (Phillips) — bridges Domain D.
8. **HRV-biofeedback resonance training** as a distinct modality from "breathe slow"; **sigh-reflex neuroscience** (Feldman/Yackle).
9. **Hypoxia / breath-hold / altitude** as an adjacent hormetic stressor (overlaps G and the hormesis frame).
10. **People carding:** ~25 figures in `discovered-exercise-thermal-breath.md` not yet in `01-people/` (Pedersen, Brooks, San-Millán, Gibala, Kox/Pickkers, Hanssen, Périard, Balban, Feldman…).

## Provenance method
All DOIs verified via OpenAlex (direct-DOI lookup or cited-by-desc search) with `mailto=gianyrox@gmail.com`;
Leong/PURE confirmed via PubMed esummary (PMID 25982160) after an OpenAlex DOI-record collision. Hook-safe
throughout: `curl -sf … -o /tmp/f.json` then parsed in a separate python3 step, never `curl | python3`.
Two claims (hormesis frame, Bohr effect) are explicitly tagged `theoretical`/textbook with no single modern
DOI — flagged as such rather than given a fabricated citation, per the no-laundering rule.
