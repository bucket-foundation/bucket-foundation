# Solver gap engine

Ranking open math problems by closeness to solved ones, with a Lean proof and empirical check path.

## Result

| Measure | Value |
|---|---|
| Problems mapped | 3,599 from formal-conjectures at commit 7d450ef |
| Solved, open | 2,196, 1,403 |
| Solved with a Lean proof | 783 |
| Open problems ranked | 1,364 with a docstring over 30 characters |
| Cross-file similarity 0.9 or above | 5 [empirical: match.py stats.json, 2026-09-30, python3 match.py] |
| Cross-file similarity 0.8 or above | 31 |
| Median nearest cross-file similarity | 0.586 |
| Closest match in the same file, excluded | 455 |

## Method

Problem statements come from the `@[category research open|solved]` tags. Docstrings are embedded with all-MiniLM-L6-v2 and each open problem is matched to its nearest solved problems in other files, since same-file matches are variants of one problem [empirical: _intake/solver-gap-engine/match.py, 2026-09-30, python3 match.py].

The Lean test file proves the odd-sum identity, Fermat's little theorem and Wilson's theorem, then samples all three plus Goldbach with zero failures, and exits 1 on any failure [empirical: harness/Empirical.lean, 2026-09-30, lake env lean --run]. <!-- voice-ignore-line -->

Reproduction steps and pinned versions: `_intake/solver-gap-engine/README.md`.

## Limits

Similarity measures wording and says nothing about difficulty. A backtest against later upstream retagging gives AUC 0.583, 0.585, 0.528 and 0.441 at the snapshots of 2025-09-01, 2025-12-01, 2026-03-01 and 2026-06-01, where 0.5 is chance [empirical: formal-conjectures 137aec5c, 2026-10-01, python3 backtest.py --repo fc-history.git --head 137aec5c]. The backtest, its method and its limits: `_intake/solver-gap-engine/BACKTEST.md`.

## Next

1. Find a way to pick prover targets that passes a backtest. The gap score failed its own, so bead bkt-wfz9 waits on that and on a GPU host.
2. Replication funding for empirical checks, spec in `_intake/solver-gap-engine/REPLICATION.md`.
3. Zero-knowledge receipts for gold-layer claims under the medallion layers, bead bkt-etmx.
