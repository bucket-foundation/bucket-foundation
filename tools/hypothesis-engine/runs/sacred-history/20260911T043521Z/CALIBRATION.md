# Calibration

Mode: kfold
Reason: all 14 ground-truth events carry discovery_year == year (this corpus's own documented simplification), so holdout_by_discovery_date splits every one of them onto one side of any cutoff and run_holdout scores nothing; k-fold hides evidence directly instead, needing no discovery date at all.

Cutoff year: None
Held-out events: 3
Covered by a matching pre-cutoff placement: 3 (coverage of truth: 1.0)
Brier score: 0.35266401971222877

## Calibration curve

| Bin | Count | Mean predicted | Mean observed |
|---|---|---|---|
| [0.0, 0.1) | 0 | None | None |
| [0.1, 0.2) | 1 | 0.17462730330914117 | 1.0 |
| [0.2, 0.3) | 0 | None | None |
| [0.3, 0.4) | 0 | None | None |
| [0.4, 0.5) | 0 | None | None |
| [0.5, 0.6) | 2 | 0.5661998871714278 | 1.0 |
| [0.6, 0.7) | 0 | None | None |
| [0.7, 0.8) | 0 | None | None |
| [0.8, 0.9) | 0 | None | None |
| [0.9, 1.0) | 0 | None | None |

## Per-fold

| Fold | Held out | Covered | Coverage of truth | Brier score |
|---|---|---|---|---|
| 0 | 1 | 1 | 1.0 | 0.17630893377898355 |
| 1 | 0 | 0 | None | None |
| 2 | 0 | 0 | None | None |
| 3 | 1 | 1 | 1.0 | 0.6812400884427403 |
| 4 | 1 | 1 | 1.0 | 0.2004430369149625 |

## Per-event predictions

| Event | Year | Reading | Hypothesis | Predicted | Observed |
|---|---|---|---|---|---|
| clm-corr-motif-parallel-411bd30b84 | -571 | true | 405307d49d0e764c | 0.580 | 1.0 |
| clm-corr-motif-parallel-99eb113edd | -1200 | true | bfb09bc7e383624a | 0.175 | 1.0 |
| clm-corr-figure-mapping-ad5075f70a | 570 | true | 0999a5915c2e3d89 | 0.552 | 1.0 |
