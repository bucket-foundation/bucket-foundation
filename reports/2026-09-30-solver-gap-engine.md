# Solver gap engine

Ranking open math problems by closeness to solved ones, with a Lean proof and empirical check path.

## Result

| Measure | Value |
|---|---|
| Problems mapped | 3,592 from formal-conjectures |
| Solved, open | 2,196, 1,396 |
| Solved with a Lean proof | 783 |
| Open problems ranked | 1,369 with a docstring |
| At similarity 0.9 or above | 57 |
| At similarity 0.8 or above | 174 |
| Median similarity | 0.635 |

## Method

Problem statements come from the `@[category research open|solved]` tags. Docstrings are embedded with all-MiniLM-L6-v2 and every open problem is matched to its three nearest solved problems by cosine similarity [empirical: _intake/solver-gap-engine/match.py, 2026-09-30, python3 match.py].

The Lean test file proves the odd-sum identity and Fermat's little theorem, then samples Wilson, Fermat, the odd sum and Goldbach with zero failures [empirical: harness/Empirical.lean, 2026-09-30, lake env lean --run]. <!-- voice-ignore-line -->

## Limits

Similarity measures wording. A high score marks a candidate for a prover and says nothing about difficulty.

## Next

1. Run a neural prover on the top 50, bead bkt-wfz9, blocked on a GPU host.
2. Replication funding for empirical checks, spec in `_intake/solver-gap-engine/REPLICATION.md`.
3. Zero-knowledge receipts for gold-layer claims under the medallion layers, bead bkt-etmx.
