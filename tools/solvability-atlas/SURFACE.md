# Frontier Surface

Bead `bkt-w2h0`. The frontier circle sorts problems into inside and outside by reach. This pass replaces that rule with regression: fitted surfaces over the problem graph that predict a continuous target, scored out of sample. `python3 surface.py --render frontier-surface-map` rebuilds `surface/table.csv`, `surface/results.json`, `surface/tables.md` and one render. Every number here comes from that run `[empirical: tools/solvability-atlas/surface/results.json, 2026-10-13, python3 surface.py --render frontier-surface-map]`.

## Finding

The map and graph features add no signal beyond the posed year that survives a posed-year split or a within-source comparison. This is a null result.

| Question | Answer |
|---|---|
| Gain over posed year, years to resolve, repeated folds | Graph-smoothed 0.075 in R squared, interval 0.043 to 0.109. Linear 0.047, Gaussian process 0.014 and boosted trees 0.068, each with an interval that covers zero |
| Same gain on the posed-year sweep | Graph-smoothed between 0.000 and 0.027 at the six cutoffs from 1950 to 2000, every interval covering zero; 0.104 at 2010, interval 0.009 to 0.231, where the model's own R squared is -1.221 on 33 test rows. The other three models lose to the posed year at 1950 through 1980 |
| Gain over posed year, survival, pooled concordance | Cox 0.252, interval 0.188 to 0.313, and forest 0.137, interval 0.085 to 0.190, in folds |
| Same gain within a source list | Cox -0.133, interval -0.265 to 0.011; forest 0.160, interval 0.025 to 0.292, in folds. On the sweep all 14 intervals cover zero |
| Does a surface beat the circle | The circle is constant on these targets. The graph surface sits 0.100 above it in folds, interval 0.064 to 0.138. On the sweep both are negative at every cutoff, from -0.133 at 1950 to -6.014 for the surface and -6.541 for the circle at 2010 |
| Does the surface rank the October claims | No. AUC 0.437, interval 0.373 to 0.504, against 0.496 for reach on the same 1,348 rows |

The pooled survival gain is a source effect. Of the 96 source lists behind the 653 survival rows, 89 hold one outcome only: a timeline of discoveries lists solved problems and a list of open questions lists open ones. Seven lists mix the two, with 273 rows and 74 resolved. A text embedding can tell the lists apart, so it predicts the outcome through the list. Within a list the gain has no stable sign.

The fold gain of 0.075 for years to resolve may be a time proxy. A ridge model predicts the posed year from the map features at R squared 0.141 out of fold, and the fold gain does not carry to the sweep.

## Table

`surface_table.py` writes one row per problem: 5,209 rows, the Lean theorems left out. Columns: identity, branch, form, source, status, formal status, level, posed and resolved year, the targets, eight map coordinates, graph features, the circle's reach and zone, and OpenAlex counts.

The map coordinates are the first eight nontrivial eigenvectors of the normalised neighbour graph in `solvability-neighbors-data.json`, 50 stored neighbours per row. They use the graph alone and no label. The cached sentence vectors stay outside the repository, so the build reads committed data only.

| Target | Rows that carry it | Use |
|---|---|---|
| Years from posed to resolved | 217 | Regression on `log(1 + years)`. Solved rows only, so the target is truncated at 2026 minus the posed year |
| Time open, unsolved rows censored at 2026 | 653: 217 resolved and 436 censored | Survival models. 34 solved rows with a posed year and no resolved year are left out, because their event time is unknown |
| Share of the 50 neighbours that are solved | 5,209 | Reported as a check. The target is a smoothed function of the same graph the features come from |

Field coverage: level on 71 rows, formal status on 5,209, posed year on 687, resolved year on 309, OpenAlex counts on 499 rows of which 7 carry the regression target `[empirical: tools/solvability-atlas/surface/results.json, 2026-10-13, python3 surface.py]`.

## Leakage Guards

| Column | Treatment |
|---|---|
| Status, solved flag, resolved year, reach, zone, disc radius | Post-outcome. Kept in the table, barred from every feature set by `surface.assert_leak_free` |
| Source list | Barred as a feature. It fixes the outcome for 89 of 96 lists, so scores are also reported within a list |
| Formal status | Barred: a Lean proof is written after the resolution |
| Level | Barred: assigned in 2026 by a curator who knew the outcome, and present on 71 rows |
| OpenAlex counts | Barred: counted through 2026, and present on 7 target rows |
| Neighbours solved before the row was posed | Allowed in the `map_year` set. Each uses resolved years earlier than the row's own posed year |
| Map coordinates, angle, in-degree, mean and top similarity, word count, branch, form | Allowed in both sets |

Two leaks remain and are stated in the paper already: the embedding model and the 2026 corpus postdate every cutoff, and the stored neighbour lists are the 2026 lists.

Folds keep a variant family together. The posed-year split trains on rows posed and resolved before the cutoff and tests on rows posed in the cutoff year or later; the survival version trains on every row posed before the cutoff with its status as known at the cutoff. The circle baselines use the shipped 2026 reach, which favours the circle.

## Years To Resolve

Repeated grouped folds: 217 rows, 5 folds, 20 repeats. Intervals are 2,000 bootstrap draws over families, each on one repeat's out-of-fold predictions, so they understate the spread across repeats. The last column is the R squared range when the target is shuffled 200 times `[empirical: tools/solvability-atlas/surface/results.json, 2026-10-13, python3 surface.py]`.

| Model | Features | R squared | 95% interval | MAE, years | Minus posed year | Shuffled target, 95% |
|---|---|---|---|---|---|---|
| mean | none | -0.010 | -0.038 to -0.001 | 28.2 | | |
| circle | inside or outside | -0.010 | -0.040 to -0.001 | 28.2 | | |
| reach | reach | -0.019 | -0.049 to -0.005 | 28.2 | | |
| year | posed year | 0.222 | 0.104 to 0.328 | 24.2 | | |
| linear | map | 0.049 | -0.073 to 0.153 | 26.2 | -0.173, -0.325 to -0.027 | -0.059 to 0.011 |
| Gaussian process | map | 0.060 | -0.073 to 0.182 | 26.4 | -0.162, -0.307 to -0.018 | -0.088 to 0.015 |
| boosted trees | map | -0.000 | -0.170 to 0.149 | 27.2 | -0.222, -0.395 to -0.056 | -0.304 to -0.049 |
| graph-smoothed | map | 0.090 | 0.043 to 0.123 | 26.9 | -0.132, -0.237 to -0.023 | -0.032 to 0.001 |
| linear | map and year | 0.269 | 0.074 to 0.419 | 21.4 | 0.047, -0.120 to 0.177 | -0.056 to 0.013 |
| Gaussian process | map and year | 0.236 | 0.070 to 0.369 | 24.5 | 0.014, -0.132 to 0.149 | -0.107 to 0.001 |
| boosted trees | map and year | 0.290 | 0.130 to 0.433 | 23.0 | 0.068, -0.060 to 0.192 | -0.319 to -0.066 |
| graph-smoothed | map and year | 0.297 | 0.185 to 0.397 | 22.3 | 0.075, 0.043 to 0.109 | -0.050 to 0.006 |

The circle is constant here: 215 of the 217 rows are solved and sit inside it. The stored surface uses the graph-smoothed model. That choice was first made on these folds, so its fold score is optimistic; the sweep is the test it did not see.

Posed-year sweep, R squared on rows posed in the cutoff year or later:

| Model | Features | 1950 | 1960 | 1970 | 1980 | 1990 | 2000 | 2010 |
|---|---|---|---|---|---|---|---|---|
| train rows | | 61 | 73 | 83 | 96 | 99 | 114 | 137 |
| test rows | | 119 | 110 | 96 | 78 | 67 | 51 | 33 |
| mean and circle | none | -0.133 | -0.247 | -0.269 | -0.706 | -1.357 | -3.095 | -6.541 |
| reach | reach | -0.123 | -0.221 | -0.238 | -0.602 | -1.161 | -2.819 | -6.342 |
| year | posed year | -0.212 | 0.030 | 0.052 | 0.108 | 0.021 | -0.483 | -1.325 |
| graph-smoothed | map | -0.133 | -0.247 | -0.269 | -0.701 | -1.346 | -3.073 | -6.014 |
| Gaussian process | map | -0.520 | -0.388 | -0.399 | -0.696 | -1.140 | -2.563 | -4.608 |
| graph-smoothed | map and year | -0.212 | 0.036 | 0.055 | 0.110 | 0.027 | -0.456 | -1.221 |
| Gaussian process | map and year | -1.121 | -0.445 | -0.348 | -0.448 | -0.279 | -0.731 | -0.433 |
| boosted trees | map and year | -0.866 | -0.602 | -0.640 | -0.305 | -0.423 | -1.367 | -0.399 |

The scores fall with the cutoff because a later test set holds shorter times than the training mean: a row posed in 2010 and solved by 2026 has at most 16 years. No model reaches 0.11. Graph-smoothed gain over the posed year, with intervals:

| 1950 | 1960 | 1970 | 1980 | 1990 | 2000 | 2010 |
|---|---|---|---|---|---|---|
| 0.000, -0.012 to 0.012 | 0.006, -0.007 to 0.020 | 0.004, -0.012 to 0.020 | 0.002, -0.014 to 0.019 | 0.006, -0.016 to 0.034 | 0.027, -0.008 to 0.079 | 0.104, 0.009 to 0.231 |

`surface/tables.md` holds every model at every cutoff.

## Time Open With Censoring

`surface_survival.py` fits a ridge-penalised Cox model and a random survival forest from scikit-survival on the 653 rows, each once on the posed year alone and once on the map, graph and year features. Concordance is Harrell's index. The Brier score is the mean over 10, 25 and 50 years, each on rows posed at least that long before 2026, so every outcome is observed and no censoring weight is needed. Within-source concordance counts only pairs of rows from the same source list. Folds: 5 folds, 10 repeats `[empirical: tools/solvability-atlas/surface/results.json, 2026-10-13, python3 surface.py]`.

| Model | Features | Concordance | 95% interval | Within source | 95% interval | Brier | 95% interval |
|---|---|---|---|---|---|---|---|
| Cox | posed year | 0.488 | 0.430 to 0.543 | 0.662 | 0.545 to 0.766 | 0.193 | 0.176 to 0.210 |
| Cox | map and year | 0.740 | 0.698 to 0.780 | 0.528 | 0.440 to 0.619 | 0.146 | 0.126 to 0.168 |
| forest | posed year | 0.662 | 0.611 to 0.711 | 0.383 | 0.300 to 0.479 | 0.191 | 0.172 to 0.212 |
| forest | map and year | 0.798 | 0.760 to 0.835 | 0.543 | 0.451 to 0.628 | 0.131 | 0.115 to 0.147 |
| Kaplan-Meier | none | | | | | 0.192 | 0.177 to 0.208 |

Gain of map and year over the posed year alone. A negative Brier gain is an improvement.

| Model | Split | Concordance gain | 95% interval | Within-source gain | 95% interval | Brier gain | 95% interval |
|---|---|---|---|---|---|---|---|
| Cox | folds | 0.252 | 0.188 to 0.313 | -0.133 | -0.265 to 0.011 | -0.047 | -0.062 to -0.029 |
| forest | folds | 0.137 | 0.085 to 0.190 | 0.160 | 0.025 to 0.292 | -0.061 | -0.078 to -0.044 |
| Cox | posed 1950 or later | 0.128 | 0.057 to 0.202 | -0.119 | -0.280 to 0.043 | -0.040 | -0.071 to -0.005 |
| forest | posed 1950 or later | 0.168 | 0.115 to 0.219 | 0.009 | -0.070 to 0.091 | -0.064 | -0.088 to -0.041 |
| Cox | posed 1970 or later | 0.079 | 0.007 to 0.149 | -0.036 | -0.217 to 0.079 | 0.004 | -0.055 to 0.069 |
| forest | posed 1970 or later | 0.174 | 0.107 to 0.240 | 0.048 | -0.049 to 0.130 | -0.065 | -0.109 to -0.025 |
| Cox | posed 1990 or later | 0.001 | -0.080 to 0.085 | -0.062 | -0.222 to 0.075 | 0.012 | -0.023 to 0.048 |
| forest | posed 1990 or later | 0.057 | -0.021 to 0.135 | -0.053 | -0.207 to 0.085 | -0.082 | -0.126 to -0.045 |
| Cox | posed 2010 or later | 0.424 | 0.321 to 0.524 | -0.036 | -0.270 to 0.214 | -0.210 | -0.294 to -0.126 |
| forest | posed 2010 or later | 0.103 | 0.005 to 0.196 | -0.144 | -0.320 to 0.038 | -0.127 | -0.171 to -0.083 |

The pooled concordance and Brier gains are real as predictions on this table and come from the source lists. The within-source column was added after the pooled result came in, on the measured fact that 89 of 96 lists hold one outcome. The forest's within-source gain in folds is measured against a posed-year forest that scores 0.383, below chance, and it does not repeat on any cutoff. The forest on the posed year alone scores 0.500 on every cutoff because each test year lies beyond the training years.

## Other Checks

The neighbour-solved density fits at R squared 0.546 for a linear model on the eight coordinates and 0.708 for boosted trees, over 5,209 rows. The density is smooth over the map by construction and says nothing about which problems get solved `[empirical: tools/solvability-atlas/surface/results.json, 2026-10-13, python3 surface.py]`.

## Stored Function

`surface.frontier_surface(table, weights, model, target, cutoff, seed)` returns the fitted surface: a predicted value for every row, the training ids and the parameters. `model` takes `graph`, `gp`, `gbt` or `linear`. `surface.render(name, surface, table)` looks the name up in `surface.RENDER_FUNCTIONS`, writes into a new folder under `surface/renders/<date>/` and saves a manifest with the function, parameters, inputs and commit. A second call makes a second folder.

`frontier-surface-map` draws the surface over the first two map coordinates and repeats the predictions on the shipped frontier disc, with the circle drawn. The render of 2026-10-13 is `surface/renders/2026-10-13/frontier-surface-map-205009/`. Predictions run from about 10 to 25 years across the map, a narrow band that matches the low score.

## Next Test

The reading changes if map features beat the posed year within source lists, with an interval that excludes zero at two cutoffs. That needs lists that mix outcomes: today 273 rows sit in such lists. A posed year on more rows is the cheapest route, since 4,522 of 5,209 have none. The frontier backtest in the paper compares rows across the same lists and should be rerun within a list.
