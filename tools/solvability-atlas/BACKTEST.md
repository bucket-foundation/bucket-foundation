# Atlas Score Backtest

Bead bkt-0p21. The atlas gives each of the 71 problems in `problems.tsv` a solvability score, `0.55 * resolved + 0.45 * formal`. This check asks what that score can predict. It covers the hand catalog alone; the dated tests on the full set are in `THRESHOLDS.md`, `CLAIMS-2026-10.md` and `SURFACE.md`.

## Result

| Feature | AUC against resolved | 95% interval | Known before resolution |
|---|---|---|---|
| Solvability score | 1.000 | 1.000 to 1.000 | no, it contains the outcome |
| Formal term alone | 0.883 | 0.742 to 0.987 | no, a Lean proof follows a resolution |
| Level, reversed | 0.723 | 0.570 to 0.855 | in part, the curator set it after the fact |
| Year posed | 0.351 | 0.189 to 0.526 | yes |
| Market count | 0.376 | 0.278 to 0.485 | yes |

[empirical: tools/solvability-atlas/backtest.json, 2026-10-13, python3 backtest.py]

15 of 71 problems are resolved [empirical: tools/solvability-atlas/backtest.json, 2026-10-13, python3 backtest.py]. The score separates them from the open ones with no error because 55% of it is the resolved flag [empirical: tools/solvability-atlas/backtest.json, 2026-10-13, python3 backtest.py]. All 10 problems with Lean status `proved` are resolved and none of the 10 with status `statement` are, so the formal term records the outcome too [empirical: tools/solvability-atlas/backtest.json, 2026-10-13, python3 backtest.py]. The score describes the present state of a problem. It carries no forecast, and a high score gives no reason to hand a problem to a prover.

The weight sweep in `THRESHOLDS.md` reaches the same reading from the other side: every resolved weight from 0.474 to 1 puts each resolved row above each open row [empirical: tools/solvability-atlas/thresholds/thresholds.json, 2026-10-11, python3 thresholds.py].

Two features exist before a resolution. Newer problems have a lower resolved share, AUC 0.351 with an interval that crosses 0.5 [empirical: tools/solvability-atlas/backtest.json, 2026-10-13, python3 backtest.py]. Problems that touch more markets have a lower resolved share too, with an interval of 0.278 to 0.485 [empirical: tools/solvability-atlas/backtest.json, 2026-10-13, python3 backtest.py]. Level gives 0.723, and a curator who knew each outcome assigned it [empirical: tools/solvability-atlas/backtest.json, 2026-10-13, python3 backtest.py].

## Claimed Rows

Resolved means a resolved year in `problems.tsv`. A row with status `claimed` in the claims ledger has no resolved year and counts as open here, the rule in `claims.py`. One catalog problem is claimed today, `uniquegames`, and `backtest.json` lists it under `claimed_counted_open` [empirical: tools/solvability-atlas/backtest.json, 2026-10-13, python3 backtest.py].

## Resolved Problems

| Level | Problems | Resolved |
|---|---|---|
| 2 | 1 | 1 |
| 3 | 10 | 5 |
| 4 | 28 | 6 |
| 5 | 32 | 3 |

[empirical: tools/solvability-atlas/backtest.json, 2026-10-13, python3 backtest.py]

10 of the 15 resolved problems are in mathematics and 4 in information [empirical: tools/solvability-atlas/backtest.json, 2026-10-13, python3 backtest.py]. Physics, chemistry, cosmology and mind hold 23 problems and no resolved one [empirical: tools/solvability-atlas/backtest.json, 2026-10-13, python3 backtest.py]. The median wait from posed to resolved is 62 years, range 0 to 387 [empirical: tools/solvability-atlas/backtest.json, 2026-10-13, python3 backtest.py].

## Limits

- The hand catalog has one version, so it has no past snapshot to score and then check. Every number here is in-sample.
- 71 rows, 15 resolved [empirical: tools/solvability-atlas/backtest.json, 2026-10-13, python3 backtest.py]. The intervals are wide.
- The catalog is hand-picked and holds famous problems, which skews it toward long waits.

## Dated Tests

A forecast needs a date, and the 71-row catalog has none. The full set does: `forecast.py` freezes a forecast at the cutoffs 2005, 2015 and 2021 and `scoring.py` scores each against later outcomes. `THRESHOLDS.md` tests reach as a classifier on that set, `CLAIMS-2026-10.md` tests the frontier on the October claims, and `SURFACE.md` reports a null result for map features beyond the posed year. Nothing in this file adds to or changes those results.

## Reproduce

```bash
python3 backtest.py --plot
python3 -m pytest tests/test_backtest.py
```

`backtest.py` reads `problems.tsv` and the claims ledger, writes `backtest.json`, and with `--plot` redraws `backtest.png`. `backtest.json` is the source for every number in this file; `tests/test_backtest.py` recomputes it and checks both tables against it.
