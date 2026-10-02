# Atlas Score Backtest

Bead bkt-0p21. The atlas gives each of 71 problems a solvability score, `0.55 * resolved + 0.45 * formal`. This check asks what the score can predict.

## Result

| Feature | AUC against resolved | 95% interval | Known before resolution |
|---|---|---|---|
| Solvability score | 1.000 | 1.000 to 1.000 | no, it contains the outcome |
| Formal term alone | 0.883 | 0.742 to 0.987 | no, a Lean proof follows a resolution |
| Level, reversed | 0.723 | 0.570 to 0.855 | in part, the curator set it after the fact |
| Year posed | 0.351 | 0.189 to 0.526 | yes |
| Market count | 0.376 | 0.278 to 0.485 | yes |

[empirical: tools/solvability-atlas/problems.tsv, 2026-10-01, python3 backtest.py]

15 of 71 problems are resolved. The score separates them from the open ones with no error because 55% of it is the resolved flag. All 10 problems with Lean status `proved` are resolved and none of the 10 with status `statement` are, so the formal term records the outcome too. The score describes the present state of a problem. It carries no forecast.

Two features exist before a resolution. Newer problems have a lower resolved share, with an interval that crosses 0.5. Problems that touch more markets have a lower resolved share too, with an interval of 0.278 to 0.485. Level gives 0.72, and a curator who knew each outcome assigned it.

## Resolved Problems

| Level | Problems | Resolved |
|---|---|---|
| 2 | 1 | 1 |
| 3 | 10 | 5 |
| 4 | 28 | 6 |
| 5 | 32 | 3 |

10 of the 15 resolved problems are in mathematics and 4 in information. Physics, chemistry, cosmology and mind hold 23 problems and no resolved one. The median wait from posed to resolved is 62 years, range 0 to 387.

## Limits

- The catalog has one version, so no past snapshot exists to score and then check. Every number here is in-sample.
- 71 rows, 15 resolved. The intervals are wide.
- The catalog is hand-picked and holds famous problems, which skews it toward long waits.

## Next Step

A forecast needs a date. Freeze today's catalog with a probability per open problem from features known today, store it, and score it against outcomes at a fixed later date. `backtest.py` then has a real test set.
