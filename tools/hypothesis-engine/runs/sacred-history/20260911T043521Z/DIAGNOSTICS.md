# Coverage diagnostics

Mode: kfold
Held-out events: 3; covered: 3 (coverage of truth: 1.0)

## Reasons for the uncovered remainder

| Reason | Count |
|---|---|
| no evidence after holdout | 0 |
| evidence present but no placement generated | 0 |
| placement generated but dropped by the cap | 0 |
| placement present but slot mismatch | 0 |
| placement present but interval mismatch | 0 |

## Notes

- "dropped_by_cap" reads zero here by construction: hte.calibrate's own candidate-building (_placement_from_item, one candidate per kept evidence item) applies no max_hypotheses cap and never calls hte.generate at all (holdout_kfold's own module docstring states this cost tradeoff explicitly). A generation-pass diagnostic over hte.runner.run_campaign's own hypothesis population, where the cap does apply, is a distinct check this function does not perform; see docs/COVERAGE-2026-09-10.md.

## Uncovered events by reason

