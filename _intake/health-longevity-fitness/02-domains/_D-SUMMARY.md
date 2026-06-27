# Domain D — Metabolic Health & Nutrition — Summary (Wave 1, 2026-06-27)

The domain where the **mechanism→outcome** and **cohort→causation** gaps are widest and the marketing is
loudest. Built around the brief's mandate: grade CGM-for-healthy honestly, be skeptical of TRE/IF, deepen the
protein/mTOR conflict with primary papers on both sides (age-dependence is the key), and grade the polarized
low-rigor debates (seed oils, Blue Zones) as such.

## Deliverables written
- `02-domains/D-metabolic-nutrition.md` + `D-claims.json` — **26 graded claims**, all DOI-sourced
- `06-evidence/CONFLICTS.md` — **+4 conflicts appended** (protein/mTOR deepened from a SCHEMA example into its
  first full both-sides entry; + seed-oils, TRE-efficacy, CGM-for-healthy)
- `00-map/discovered-people.md` — **+16 figures** (Snyder, Kraus, Varady, Simpson, Le Couteur, Solon-Biet,
  Guevara-Aguirre, Bauer, Mozaffarian, Ramsden, DiNicolantonio, O'Keefe, Estruch, Saul Newman, John Newman)
- `00-map/discovered-concepts.md` — **+11 concepts** (glucotype, PPGR, DunedinPACE, metabolic switching,
  Geometric Framework/protein:carb, FGF21, anabolic resistance, OXLAM, FMD, LA biomarker, age-record reliability)
- `_intake-raw/openalex/D-*.json` — **27 raw OpenAlex records** archived (hook-safe: curl→file, parse separately)

## Claims by evidence tier
| tier | count |
|---|---|
| `rct` | 9 |
| `cohort` | 4 |
| `meta` | 4 |
| `mechanistic` | 3 |
| `animal` | 3 |
| `theoretical` (incl. absence-of-evidence) | 2 |
| `cross-sectional` | 1 |
| **total** | **26** |

By type: outcome 19 · mechanism 4 · hypothesis 2 · protocol 1.

## The honest grading calls (the brief's actual asks)
- **CGM in non-diabetics:** graded `refutes` on the wellness claim. Variability is real (Zeevi `cohort`, Hall
  `cross-sectional`) but **no outcome RCT exists in healthy people** — captured as an explicit absence-of-evidence
  claim rather than laundered into a benefit. Real tool in diabetes; unproven gadget for the worried-well.
- **CALERIE:** the only long-term human CR RCT — but ~12% CR achieved (not 25%), surrogate endpoints, and only
  the DunedinPACE clock moved (Waziry). Modest and honest.
- **IF/TRE skepticism (delivered):** Lowe/TREAT null, Liu/NEJM (TRE adds nothing to CR), Trepanowski (ADF = CR,
  worse adherence) all logged. The surviving signal is narrow — *early-window circadian alignment* (Sutton
  eTRF, n=8), not the popular late 16:8. Net: most TRE benefit IS calorie restriction.
- **Protein/mTOR (deepened, both sides, primary papers):** Side A — Levine/Longo 2014, Solon-Biet 2014,
  Guevara-Aguirre 2011. Side B — Bauer/PROT-AGE 2013, Morton/Phillips 2018. **The resolver is the age axis:**
  Levine's own NHANES data REVERSES at 65 (protein protective in elderly), exactly where PROT-AGE governs.
  Mid-life IGF-1/cancer cost vs late-life sarcopenia/all-cause cost; modified by source, leucine/BCAA, and
  resistance training. Not a contradiction — a tradeoff. Status `open` (no mortality RCT feasible).
- **Seed oils (graded as polarized/low-rigor):** skeptic side rests on Ramsden/BMJ 2016 (old trans-fat-era
  recovered trial) + DiNicolantonio OXLAM *hypothesis*; the higher-tier evidence (Mozaffarian meta, Marklund
  biomarker cohorts) runs the OTHER way, and Hooper/Cochrane says little-or-no-effect either way. Certainty
  exceeds evidence on both sides.
- **Mediterranean/Blue Zones:** PREDIMED is the strongest dietary RCT *with an asterisk* (retracted &
  republished after randomization irregularities). Blue-Zone longevity *counting* is undercut by Saul Newman's
  data-quality critique (`theoretical`/preprint) — but the dietary-pattern evidence stands separately.

## Conflicts logged (4, in CONFLICTS.md)
1. **conflict-protein-mtor-longevity** — deepened; age-dependent tradeoff, `open`. Primary papers both sides.
2. **conflict-tre-efficacy-vs-cr** — `mostly-resolved` (most TRE benefit is CR; early-window effect small).
3. **conflict-seed-oils-linoleic-acid** — `open`, weight against the toxicity claim; both sides over-certain.
4. **conflict-cgm-healthy-utility** — `open`; diagnostic in diabetes, unproven wellness use in healthy people.

## Canon cross-links (UP to bucket-canon/05-biophysics)
mTOR / IGF-1 / FGF21 nutrient sensing (protein conflict, CR, FMD); ketone-body (BHB) signaling + HDAC/NLRP3
(ketosis, Newman & Verdin); metabolic flexibility / fuel-switching. These are the load-bearing bridges from the
metabolic-outcome layer down to the biophysics foundations.

## Provenance method
All 27 DOIs verified via OpenAlex direct-DOI lookup (`mailto=gianyrox@gmail.com`), and the Blue Zones critique
via OpenAlex title search. Hook-safe throughout: `curl -sf … -o /tmp|_intake-raw` then parsed in a separate
python3 step — never `curl | python3`. Two claims (CGM-no-outcome-RCT, Blue-Zones-critique) are graded
`theoretical`/absence-of-evidence and flagged as such rather than given a fabricated supportive citation, per
the no-laundering rule.

## Wave 2 gaps (priority order)
1. **ZOE/PREDICT** large-scale CGM+microbiome RCT outcome read-outs — the missing CGM-in-healthy evidence.
2. **Protein SOURCE** (animal vs plant) and **leucine/BCAA-specific** stratified human mortality cohorts — what
   would actually resolve the protein/mTOR conflict beyond total grams.
3. **ApoB/LDL response to ketogenic diets** in lean-mass hyper-responders (bridge Domain L).
4. **Fasting × exercise** and **protein × resistance training** interactions (bridge Domain E).
5. **Fiber / SCFA / microbiome** mechanisms — under-covered in this wave.
6. **People carding:** the 16 figures in `discovered-people.md` (Snyder, Kraus, Simpson, Le Couteur, Bauer,
   Mozaffarian, Ramsden, both Newmans…) are not yet in `01-people/cards/`.
7. **04-protocols/D-nutrition-protocols.md** — separate the protocols (leucine/protein-per-meal dosing, TRE
   windows, FMD/ProLon cycles, MedDiet pattern) from these efficacy claims.
