# Calibration

Mode: kfold
Reason: all 105 ground-truth events carry discovery_year == year (this corpus's own documented simplification), so holdout_by_discovery_date splits every one of them onto one side of any cutoff and run_holdout scores nothing; k-fold hides evidence directly instead, needing no discovery date at all.

Cutoff year: None
Held-out events: 105
Covered by a matching pre-cutoff placement: 17 (coverage of truth: 0.1619047619047619)
Brier score: 0.42287985891391355

## Calibration curve

| Bin | Count | Mean predicted | Mean observed |
|---|---|---|---|
| [0.0, 0.1) | 11 | 0.06701017152630061 | 0.36363636363636365 |
| [0.1, 0.2) | 7 | 0.13246375758013115 | 0.8571428571428571 |
| [0.2, 0.3) | 1 | 0.20751604040976718 | 1.0 |
| [0.3, 0.4) | 2 | 0.3110590449183292 | 1.0 |
| [0.4, 0.5) | 3 | 0.4548900117396599 | 1.0 |
| [0.5, 0.6) | 3 | 0.5178179664763872 | 0.3333333333333333 |
| [0.6, 0.7) | 0 | None | None |
| [0.7, 0.8) | 0 | None | None |
| [0.8, 0.9) | 0 | None | None |
| [0.9, 1.0) | 0 | None | None |

## Per-fold

| Fold | Held out | Covered | Coverage of truth | Brier score |
|---|---|---|---|---|
| 0 | 21 | 1 | 0.047619047619047616 | 0.7864905711585243 |
| 1 | 24 | 6 | 0.25 | 0.45897370219089345 |
| 2 | 19 | 2 | 0.10526315789473684 | 0.28290999303051045 |
| 3 | 20 | 2 | 0.1 | 0.42221119556056347 |
| 4 | 21 | 6 | 0.2857142857142857 | 0.4048061154227195 |

## Per-event predictions

| Event | Year | Reading | Hypothesis | Predicted | Observed |
|---|---|---|---|---|---|
| T-foundations-ms-4 | 1966 | true | 25316679ff65cbde | 0.113 | 1.0 |
| T-birth-ms-3 | 1982 | true | c4fb0eda510e7e4d | 0.167 | 1.0 |
| T-ecera-ms-1 | 2021 | true | d26534dfafcb3add | 0.010 | 1.0 |
| T-ecera-ms-1 | 2021 | wrong-interval | 7a24ba8fb6e29336 | 0.088 | 0.0 |
| T-ecera-ms-6 | 2024 | true | e3943ec55a7f513c | 0.103 | 1.0 |
| T-ecera-ms-6 | 2024 | wrong-interval | 3db32cf3121b8e5e | 0.073 | 0.0 |
| T-formalism-ms-6 | 1928 | true | 5ee868ee7c66b136 | 0.311 | 1.0 |
| T-formalism-ms-6 | 1928 | wrong-interval | 71fc90d01b168e1e | 0.537 | 0.0 |
| T-old-ms-0 | 1900 | true | 5ee868ee7c66b136 | 0.311 | 1.0 |
| T-qinfobirth-ms-1 | 1973 | true | 0aee79e84870b4b8 | 0.077 | 1.0 |
| T-qinfobirth-ms-1 | 1973 | wrong-interval | 83bedfc7cd7988d6 | 0.089 | 0.0 |
| T-early-ms-3 | 1996 | true | df971134baf914cd | 0.508 | 1.0 |
| T-early-ms-3 | 1996 | wrong-interval | 83bedfc7cd7988d6 | 0.059 | 0.0 |
| T-foundations-ms-8 | 1973 | true | 0aee79e84870b4b8 | 0.208 | 1.0 |
| T-foundations-ms-8 | 1973 | wrong-interval | df971134baf914cd | 0.508 | 0.0 |
| T-qinfobirth-ms-5 | 1984 | true | ca15a1df2656df61 | 0.436 | 1.0 |
| T-race-ms-8 | 2019 | true | d26534dfafcb3add | 0.030 | 1.0 |
| T-race-ms-8 | 2019 | wrong-interval | 7a24ba8fb6e29336 | 0.091 | 0.0 |
| T-birth-ms-0 | 1980 | true | 2327b1803300bff8 | 0.477 | 1.0 |
| T-birth-ms-0 | 1980 | wrong-interval | 0ecf89e8b1fb4624 | 0.123 | 0.0 |
| T-birth-ms-9 | 1994 | true | c1f9920e593e7069 | 0.157 | 1.0 |
| T-birth-ms-9 | 1994 | wrong-interval | 6029c22fcb4a5ae2 | 0.063 | 0.0 |
| T-ecera-ms-8 | 2025 | true | 1df825282de5d40f | 0.090 | 1.0 |
| T-formalism-ms-3 | 1927 | true | 8711788d191de91f | 0.451 | 1.0 |
| T-formalism-ms-3 | 1927 | wrong-interval | 58ae6ce05122bee3 | 0.067 | 0.0 |
| T-qinfobirth-ms-3 | 1982 | true | c4fb0eda510e7e4d | 0.152 | 1.0 |
| T-solvay-ms-2 | 1935 | true | a21942d6e5086829 | 0.112 | 1.0 |
