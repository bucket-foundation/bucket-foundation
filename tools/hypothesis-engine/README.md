# History Hypothesis Engine core

The address space, subjective-logic belief model, and the timeline, concept,
and evidence records that feed them, for `papers/history-hypothesis-engine/
main.tex` and its Lean counterparts under `Bucket.*`.

This package builds the core layer only: intervals and Allen relations,
concept vocabulary, the Gödel address scheme, placement and sequence
hypotheses, evidence items, and the belief scorer. It does not build the
generator, the ranking tournament, the evolver, any LLM extractor role, or a
CLI. Those consume the interfaces below; none of them lives here yet.

## Module map

| Module | Mirrors | Holds |
|---|---|---|
| `hte/timeline.py` | `Bucket.Timeline` | `Interval`, `Uncertainty`, `AllenRelation`, `relate`/`converse`, the resolution ladder, calendar conversion (BCE/CE, BP, ka), century time bins, `Period`/`NodeLevel`/`DatePosterior` |
| `hte/concepts.py` | `Bucket.Concept` | `Slot`, `ConsensusStatus`, `Concept`, `Vocabulary` (always carries `OTHER` per slot, append-only vocab index, Dirichlet-process `new_concept_probability`), the shipped seed vocabulary |
| `hte/address.py` | `Bucket.Address` | `SlotTuple`, `encode_indices`/`decode_indices` (placement), `encode_sequence_indices`/`decode_sequence_indices`, `short_id`, and the concept-id-facing `encode`/`decode` wrappers |
| `hte/hypothesis.py` | `Bucket.Hypothesis` | `Placement`, `Sequence`, `Hypothesis` (address, `claims`, `depends_on`), JSON round trip, `prior_logit` |
| `hte/evidence.py` | (plain data, `def:evidence`) | `EvidenceKind`, `EvidenceFamily`, `Tier`, `EvidenceSpan`, `Source`, `EvidenceItem` |
| `hte/belief.py` | `Bucket.Belief` | `Opinion`, `fuse`, `Constants`, `D`, `cross_kind_bonus`, `effective_count`, detectability (`load_detectability_table`, `detectability`, `detectability_scale`), `edge_strength`, `cluster_weight`, `weight`, `pooled_weight`, `score` |

## Design notes for the next agent

- **TIME_BIN is numeric; it has no concept vocabulary of its own.** The paper buckets time
  into 200 century bins across a 20,000-year span for its own vocabulary
  sizing (`main.tex` §Combinatorics). `hte.timeline.time_bin_index` computes
  that index directly from an astronomical year; `hte.address.encode` and
  `Placement.slot_tuple`/`Placement.address` take it as an explicit
  `time_bin` argument rather than resolving it through `Vocabulary`, the
  way ACTOR/ACTION/OBJECT/PLACE/MECHANISM are resolved.
- **A hypothesis's prior logit sums only its five concept-bearing slots.**
  `Placement.prior_logit` and `Hypothesis.prior_logit` sum ACTOR/ACTION/
  OBJECT/PLACE/MECHANISM's concept `prior_logit`; TIME_BIN contributes
  nothing, matching the paper's own worked example (fixing ACTION/OBJECT/
  PLACE/TIME_BIN and varying only ACTOR and MECHANISM moves `L_prior` by
  exactly the two varied concepts' priors). `Sequence.prior_logit` sums
  both member placements' priors; the paper states a prior formula for a
  placement only, so this sum is this package's own documented extension;
  no such value is read off the source material.
- **`hte.belief.score` takes a whole `Hypothesis`, so it can call `prior_logit` itself.** It reads
  `hypothesis.address` for evidence matching and calls
  `hypothesis.prior_logit(vocab)` for the base rate, so a generator only
  has to build one `Hypothesis` object per candidate and hand it straight
  to the scorer.
- **Detectability is opt-in.** `score`/`pooled_weight`/`cluster_weight` all
  take an optional detectability table and `period`; an absence-of-evidence
  `EvidenceItem` (`is_absence=True`) is only scaled by detectability when
  both are supplied, otherwise it reads at the flat-tier, high-
  detectability default (`delta = 1.0`).
- **`n_eff` needs `Source` objects to do anything.** `pooled_weight`'s
  `sources` argument is optional; without it, each kind's effective count
  falls back to a raw item count. Pass a `{source_id: Source}` mapping (and
  optionally `stemma_edge_weights`) to get the real stemma discount.
- **The generator/tournament layer owns `L(h)` and `Theta_temporal`.** This
  package stops at the opinion `(b, d, u, a)` and its projection `P(h) = b +
  a*u`. The ranking score `L(h) = logit(P(h)) + Theta_temporal(h)` (`Eq.
  rank`) is not implemented here; it belongs to whichever module builds the
  tournament, since `Theta_temporal` needs a period's date posterior
  compared against a hypothesis's stated interval, a generation-time
  concern this package does not otherwise touch.

## Decisions made where the source material left room

- **`main.tex` and `HISTORY-HYPOTHESIS-ENGINE-SPEC.md` disagree on the
  fuzzy-match term's scale.** The paper's own equation (`main.tex` §Belief
  model) reads `e_i = min(0.99, 0.40 cos + 0.25 fuz + 0.10 motif)` with no
  normalization noted; the older spec's code snippet divides fuz by 100
  (`0.25*(fuz/100)`). `hte.belief.edge_strength` follows the paper's own
  equation and expects `views["fuzzy"]` already in `[0, 1]`; a caller holding a raw
  0-100 fuzzy-match score must divide by 100 before storing it.
- **Era has no fixed numeric width.** The resolution ladder names five
  rungs, year/decade/century/millennium/era, but only the first four have a
  width anywhere in the source material (1/10/100/1000 years).
  `hte.timeline.RESOLUTION_WIDTH_YEARS[Resolution.ERA]` is a documented
  placeholder (10,000 years); no spec fixes this number.
- **The OxCal-style phase model is not built.** `bkt-hte-period-model` asks
  for "the OxCal-style phase model over the existing timeline array," which
  in the source material is a Gibbs-sampled Bayesian chronology, out of
  scope for this core package (no generator, tournament, or calibration run
  is built here either). `hte.timeline.combine_date_observations` gives
  `Period.date_posterior` the same shape a real phase model would populate,
  by the simplest defensible rule (inverse-variance-weighted Gaussian
  pooling), documented in its own docstring as a stand-in.
- **A sequence's prior logit is this package's own extension.** See above.

## Running the tests

```bash
cd tools/hypothesis-engine
python3 -m pytest -q
```

`tests/conftest.py` puts this directory on `sys.path`, so no install step is
needed first. `tests/test_belief.py` reproduces the Çatalhöyük
farmers-versus-extraterrestrials worked example from `main.tex` §Belief model
(`tab:worked-example`) to 3 decimals.

## Voice lint

```bash
agf-lint-voice-src check tools/hypothesis-engine
```
