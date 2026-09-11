Pooled Calibration Fit, 2026-09-10
==================================

The constants `hte.belief.Constants` ships (`W=2.0`, `lam=0.5`, `mu=0.5`,
`alpha=1.0`, `tier_weight` from `main.tex`'s own table) were the paper's
original truth-score values, carried through the move to the opinion
model with no recalibration pass of their own. Every k-fold holdout this
package's own shipped fixtures ran under those constants read a real-corpus
Brier score in the 0.2 to 0.45 range while a synthetic `hte.synth` world
(planted truth, near-perfect candidate coverage) reads near 0.01 to 0.06:
the constants are tuned to nothing in particular, but they happen to fit
synth's own easy case far better than any real corpus's own harder one.

`hte.calibrate.fit_constants_pooled` (`hte/calibrate.py`) is the wider fit
this gap calls for: `W`, `lam`, `mu`, `alpha`, a single global `tier_scale`
standing in for the six-value `tier_weight` table, and a new `hte.belief.
Constants.detectability_floor`, fit jointly by coordinate descent against
a pooled objective over ten `hte.synth` worlds (seeds 0 to 9) plus the
`quantum-history`, `production`, `education-atlas`, and `literature`
corpora, all in fake mode (`HTE_LLM_MODE=fake`; nothing in this fit calls
`claude -p` or the network). This file reports what that fit found, and
why the shipped `hte/data/constants-fitted.json` still carries the bare
defaults rather than the fitted vector.

## Method

- **Objective** (`hte.calibrate.evaluate_pooled`): for a candidate
  `Constants` vector, run `hte.calibrate.run_calibration` (its own
  auto-picked k-fold or discovery-date holdout, `k=5`, `seed=0`) over
  every corpus in the pool, and compute `loss = mean_brier + penalty`.
  `mean_brier` is the plain, equally-weighted mean of every corpus's own
  `brier_score` that is not `None` (a corpus with zero covered events
  contributes nothing to the mean rather than a fabricated zero).
  `penalty` sums `coverage_penalty_weight * max(0, 0.9 - coverage_of_truth)`
  over the ten synth worlds only (`docs`'s own "a penalty on synth
  coverage dropping below 0.9"); none of the four real corpora carries a
  coverage target, since none of them is expected to clear 0.9 in the
  first place (see "Why coverage never moves," below).
- **Search** (`hte.calibrate.fit_constants_pooled`): coordinate descent,
  starting from `Constants()`'s own bare values (`W=2.0, lam=0.5, mu=0.5,
  alpha=1.0, tier_scale=1.0, detectability_floor=0.0`). Each of the six
  parameters, in a fixed order, tries a small set of additive step
  offsets around the current running-best value (`hte.calibrate.
  _FIT_PARAM_STEPS`), keeping the first improving step found; a second
  full sweep repeats the same pass from wherever the first left off,
  and the search stops early the moment a whole sweep finds no
  improving step at all (it did, after its second pass: 42 evaluations
  total, both passes run to completion).
- **`education-atlas`'s own subsample.** `hte.link.link_evidence`'s
  own per-fold cost scales with candidate-population size; the full
  25-country sample (~4,700 evidence items) measured past two minutes
  for ONE `run_calibration` call alone, a cost this fit would otherwise
  pay 42 times. `hte.calibrate.build_pooled_fit_corpora` restricts it to
  a fixed 8-country subset (`USA, GBR, KEN, BRA, IND, NGA, FIN, JPN`,
  chosen by hand for income- and region-spread) over its own full
  2010-2024 span, ~1,500 evidence items, ~20s a call: the one real
  compute-budget concession this fit makes, disclosed here rather than
  silently. `literature` reads its own shipped 6-card fixture set
  (`DEFAULT_FIXTURES_DIR`, no network); `production` reads `status_min=
  "draft"` (every one of the 14 shipped fixtures contributes).
- **Bar.** Per this bead's own brief: the fit ships only if it beats the
  bare defaults on the four REAL corpora's own mean Brier (synth
  excluded) by at least 0.05. Below that bar, the defaults stay, with
  the reason recorded here and in `hte/data/constants-fitted.json`
  itself (its own `_fit_note` field).

## Before

Every corpus's own k-fold Brier and coverage of truth, at `Constants()`'s
bare defaults:

| Corpus | Mode | Brier score | Coverage of truth |
|---|---|---|---|
| synth-0 | kfold | 0.0616 | 1.000 |
| synth-1 | kfold | 0.0405 | 0.875 |
| synth-2 | kfold | 0.0470 | 1.000 |
| synth-3 | kfold | 0.0123 | 1.000 |
| synth-4 | kfold | 0.0146 | 1.000 |
| synth-5 | kfold | 0.0120 | 0.875 |
| synth-6 | kfold | 0.0368 | 1.000 |
| synth-7 | kfold | 0.0353 | 1.000 |
| synth-8 | kfold | 0.0077 | 1.000 |
| synth-9 | kfold | 0.0078 | 1.000 |
| **synth mean** | | **0.0276** | **0.975** |
| quantum-history | kfold | 0.4245 | 0.1524 |
| production | kfold | 0.0358 | 0.2222 |
| education-atlas (8-country subsample) | kfold | 0.2241 | 0.1429 |
| literature | kfold | 0.0619 | 1.000 |
| **real mean** | | **0.1865** | **0.3794** |

Pooled loss at the defaults: `0.1730` (`mean_brier=0.0730` over all
fourteen corpora equally weighted, `penalty=0.1000`, one synth world
each below the 0.9 coverage target by 0.05: synth-1 and synth-5, both at
0.875).

## After

The coordinate descent's own best vector, `{"W": 0.5, "lam": 0.05,
"mu": 0.5, "alpha": 1.0, "tier_scale": 1.0, "detectability_floor": 0.0}`
(`mu` and `alpha` never moved off their own starting value; see "Why
`mu` and `alpha` never move," below):

| Corpus | Mode | Brier score | Coverage of truth |
|---|---|---|---|
| synth-0 | kfold | 0.1106 | 1.000 |
| synth-1 | kfold | 0.0396 | 0.875 |
| synth-2 | kfold | 0.0494 | 1.000 |
| synth-3 | kfold | 0.0190 | 1.000 |
| synth-4 | kfold | 0.0180 | 1.000 |
| synth-5 | kfold | 0.0062 | 0.875 |
| synth-6 | kfold | 0.0431 | 1.000 |
| synth-7 | kfold | 0.0253 | 1.000 |
| synth-8 | kfold | 0.0107 | 1.000 |
| synth-9 | kfold | 0.0095 | 1.000 |
| **synth mean** | | **0.0331** | **0.975** |
| quantum-history | kfold | 0.3995 | 0.1524 |
| production | kfold | 0.0077 | 0.2222 |
| education-atlas (8-country subsample) | kfold | 0.1912 | 0.1429 |
| literature | kfold | 0.0148 | 1.000 |
| **real mean** | | **0.1533** | **0.3794** |

Pooled loss at the fitted vector: `0.1675` (`mean_brier=0.0675`,
`penalty=0.1000`, unchanged: the same two synth worlds, at the same
0.875 coverage, since coverage never moves at all, see below).

**Real-corpus mean Brier improvement: 0.0333** (`0.1865` to `0.1533`).
Every one of the four real corpora improved individually (quantum-history
0.0250, production 0.0281, education-atlas 0.0329, literature 0.0470),
and the pooled loss improved too (0.1730 to 0.1675), but the mean stayed
under this bead's own 0.05 bar.

## Decision: defaults kept

`hte/data/constants-fitted.json` ships `Constants()`'s own bare values,
not the fitted vector above, with `_fit_note` stating the improvement and
the bar it did not clear. `hte.belief.load_constants("fitted")` therefore
reads identically to `load_constants("default")` today; `hte.runner.
run_campaign`'s own default (`DEFAULT_CONFIG["constants"] = "fitted"`)
changes no campaign's own numbers until a future, wider fit clears the
bar and this file gets a real override to ship.

## Why coverage never moves

`coverage_of_truth` reads identically before and after, for every one of
the fourteen corpora, to the sixteenth decimal place. This is structural,
not a search failure: `hte.calibrate.holdout_kfold`'s own coverage
question, "does a matching candidate exist at all for this held-out
event's own slots," is answered by `_matches_event`'s slot comparison
(`hte.link.slot_match_score`) and `_placement_from_item`'s candidate
build, neither of which reads `Constants` at all. Every one of the six
fitted parameters (`W`, `lam`, `mu`, `alpha`, `tier_scale`,
`detectability_floor`) enters only `hte.belief.score`'s own projected
PROBABILITY for an already-matched candidate, never whether a candidate
is found. A fit over these six parameters alone can move Brier; only a
richer vocabulary, a looser `match_threshold`, or a real generation pass
(this fit deliberately runs neither, matching `holdout_kfold`'s own
documented cost tradeoff) could move coverage.

## Why the improvement fell short of the bar

The task brief's own suggested example, "fake-mode critic behavior," does
NOT apply here: `run_calibration`'s k-fold path calls no critic, no
`claude -p`, and no `hte.fakellm` stand-in at all, it is pure candidate
construction and belief scoring. The real reason, read off the numbers
above: every real corpus's own coverage sits far below synth's near-1.0
(quantum-history 0.152, production 0.222, education-atlas 0.143,
literature 1.000 on its own single ground-truth event), so most of each
real corpus's own Brier signal comes from a small number of covered
events, sometimes as few as the two "confirm"/"wrong-interval" pairs a
handful of matched candidates produce. Six global scalar constants
rescale every opinion's own confidence together; they cannot
independently fix "this particular matched candidate reads too
confident" without moving every other matched candidate's own confidence
by a related amount, so a corpus whose Brier is dominated by a handful of
covered events has little room for a few shared constants to close a
0.05-Brier gap. This is a reasoned inference from the fit's own recorded
history (`per_corpus` in `hte.calibrate.evaluate_pooled`'s own return
shape), read as one plausible explanation the fit's own numbers support;
a follow-on fit over a richer per-tier or per-period parameter set, or a
wider step grid over more passes, might still clear the bar.

## Reproducing this fit

```python
from hte.calibrate import build_pooled_fit_corpora, evaluate_pooled, fit_constants_pooled, _default_fit_vector

corpora, coverage_targets = build_pooled_fit_corpora(synth_seeds=range(10))
baseline = evaluate_pooled(corpora, _default_fit_vector(), coverage_targets=coverage_targets)
result = fit_constants_pooled(corpora, coverage_targets=coverage_targets, passes=2)
```

`build_pooled_fit_corpora` takes 30 to 60 seconds (mostly `education-
atlas`'s own subsample build); the fit itself measured 2,120 seconds
(35.3 minutes) for the 42 evaluations both passes ran, dominated by
`education-atlas`'s own ~20-second-per-call `run_calibration` cost paid
once per evaluation.
