# Frontier Surface

Bead `bkt-w2h0`. The frontier circle sorts problems into inside and outside by reach. This pass replaces that rule with a regression: a fitted surface over the problem graph that predicts a continuous target, scored out of sample. `python3 surface.py --render frontier-surface-map` rebuilds `surface/table.csv`, `surface/results.json`, `surface/tables.md` and one render. Every number here comes from that run `[empirical: tools/solvability-atlas/surface/results.json, 2026-10-13, python3 surface.py --render frontier-surface-map]`.

## Finding

| Question | Answer |
|---|---|
| Does a surface over the map predict years to resolve in repeated folds | Weakly. The graph-smoothed surface scores R squared 0.090, interval 0.043 to 0.123; the Gaussian process 0.060, the linear model 0.049 and the boosted trees 0.000, all three with intervals that include zero |
| Does it beat the circle | In repeated folds, yes by a small margin: the circle scores -0.010 and reach -0.019, and the graph surface sits 0.100 above the circle, interval 0.064 to 0.138 |
| Does it hold on a temporal split | No. Trained on rows resolved before 2010 and tested on the 80 resolved later, the graph surface scores -0.003 and the Gaussian process 0.005. At a 2000 cutoff both are negative |
| What predicts best | The year posed: 0.222 alone in repeated folds, 0.123 on the 2010 split. A solved problem posed in 2015 can have at most 11 years, so this is a property of which rows are in the table |
| Does the surface rank the October claims | No. AUC 0.437, interval 0.373 to 0.504, against 0.496 for reach on the same 1,348 rows |

The surface is a small improvement on a circle that carries no signal for this target, and it fails the temporal test. Read it as a null result with one weak positive in the fold test.

## Table

`surface_table.py` writes one row per problem: 5,209 rows, the Lean theorems left out. Columns: identity, branch, form, status, formal status, level, posed and resolved year, the targets, eight map coordinates, graph features, the circle's reach and zone, and OpenAlex counts.

The map coordinates are the first eight nontrivial eigenvectors of the normalised neighbour graph in `solvability-neighbors-data.json`, 50 stored neighbours per row. They use the graph alone and no label. The cached sentence vectors stay outside the repository, so the build reads committed data only.

| Target | Rows that carry it | Verdict |
|---|---|---|
| Years from posed to resolved | 217 | Chosen, as `log(1 + years)` |
| Time open with unsolved rows censored | 687, of which 470 censored | Left for a survival model; R squared has no standard form under censoring and 68% of the rows are censored |
| Share of the 50 neighbours that are solved | 5,209 | Circular: the target is a smoothed function of the same graph the features come from |

Years to resolve is the one continuous outcome the atlas observes instead of deriving from its own graph. Its cost is the row count and a selection effect: only solved problems with both years appear.

Field coverage: level on 71 rows, formal status on 5,209, posed year on 687, resolved year on 309, OpenAlex counts on 499 rows of which 7 carry the target. `[empirical: tools/solvability-atlas/surface/results.json, 2026-10-13, python3 surface.py]`

## Leakage Guards

| Column | Treatment |
|---|---|
| Status, solved flag, resolved year, reach, zone, disc radius | Post-outcome. Kept in the table, barred from every feature set by `surface.assert_leak_free` |
| Formal status | Barred: a Lean proof is written after the resolution |
| Level | Barred: assigned in 2026 by a curator who knew the outcome, and present on 71 rows |
| OpenAlex counts | Barred: counted through 2026, and present on 7 target rows |
| Neighbours solved before the row was posed | Allowed in the `map_year` set. Each uses resolved years earlier than the row's own posed year |
| Map coordinates, angle, in-degree, mean and top similarity, word count, branch, form | Allowed in both sets |

Two leaks remain and are stated in the paper already: the embedding model and the 2026 corpus postdate every cutoff, and the stored neighbour lists are the 2026 lists.

Folds keep a variant family together. The temporal split trains on rows resolved before the cutoff and tests on rows resolved in that year or later. The circle baselines use the shipped 2026 reach, which favours the circle.

## Scores

Repeated grouped folds: 217 rows, 5 folds, 20 repeats. Intervals are 2,000 bootstrap draws over families, each on one repeat's out-of-fold predictions. The permutation baseline shuffles the target 200 times and reruns the folds. `[empirical: tools/solvability-atlas/surface/results.json, 2026-10-13, python3 surface.py]`

| Model | Features | R squared | 95% interval | MAE, years | Permutation R squared, 95% | p |
|---|---|---|---|---|---|---|
| mean | none | -0.010 | -0.038 to -0.001 | 28.2 | | |
| circle | inside or outside | -0.010 | -0.040 to -0.001 | 28.2 | | |
| reach | reach | -0.019 | -0.049 to -0.005 | 28.2 | | |
| year | posed year | 0.222 | 0.104 to 0.328 | 24.2 | | |
| linear | map | 0.049 | -0.073 to 0.153 | 26.2 | -0.059 to 0.011 | 0.0050 |
| Gaussian process | map | 0.060 | -0.073 to 0.182 | 26.4 | -0.088 to 0.015 | 0.0050 |
| boosted trees | map | -0.000 | -0.170 to 0.149 | 27.2 | -0.304 to -0.049 | 0.0050 |
| graph-smoothed | map | 0.090 | 0.043 to 0.123 | 26.9 | -0.032 to 0.001 | 0.0050 |
| linear | map and year | 0.269 | 0.074 to 0.419 | 21.4 | -0.056 to 0.013 | 0.0050 |
| Gaussian process | map and year | 0.236 | 0.070 to 0.369 | 24.5 | -0.107 to 0.001 | 0.0050 |
| boosted trees | map and year | 0.290 | 0.130 to 0.433 | 23.0 | -0.319 to -0.066 | 0.0050 |
| graph-smoothed | map and year | 0.297 | 0.185 to 0.397 | 22.3 | -0.050 to 0.006 | 0.0050 |

The circle is constant on this target: 215 of the 217 rows are solved and sit inside it. With the posed year added, the graph-smoothed model gains 0.075 over the year alone, interval 0.043 to 0.109; the other three gains have intervals that include zero.

Temporal split at 2010: 137 training rows, 80 test rows.

| Model | Features | R squared | 95% interval | Minus year alone |
|---|---|---|---|---|
| mean | none | -0.049 | -0.195 to -0.000 | |
| circle | inside or outside | -0.049 | -0.195 to -0.000 | |
| reach | reach | -0.179 | -0.306 to -0.106 | |
| year | posed year | 0.123 | -0.061 to 0.207 | |
| linear | map | -0.077 | -0.221 to -0.012 | -0.200, -0.416 to 0.029 |
| Gaussian process | map | 0.005 | -0.140 to 0.117 | -0.118, -0.305 to 0.087 |
| boosted trees | map | -0.483 | -0.864 to -0.216 | -0.606, -0.932 to -0.332 |
| graph-smoothed | map | -0.003 | -0.134 to 0.049 | -0.125, -0.333 to 0.096 |
| linear | map and year | 0.081 | -0.172 to 0.233 | -0.042, -0.218 to 0.118 |
| Gaussian process | map and year | 0.111 | -0.147 to 0.254 | -0.012, -0.112 to 0.063 |
| boosted trees | map and year | 0.090 | -0.221 to 0.290 | -0.033, -0.236 to 0.131 |
| graph-smoothed | map and year | 0.140 | -0.045 to 0.224 | 0.018, 0.003 to 0.031 |

`surface/tables.md` holds the 2000 and 2015 splits. At 2015 the graph surface scores 0.095 on 65 test rows; at 2000 it scores -0.122 on 103. The sign changes with the cutoff. `[empirical: tools/solvability-atlas/surface/results.json, 2026-10-13, python3 surface.py]`

The neighbour-solved density fits at R squared 0.546 for a linear model on the eight coordinates and 0.708 for boosted trees, over 5,209 rows. That number shows the density is smooth over the map and carries no evidence about which problems get solved. `[empirical: tools/solvability-atlas/surface/results.json, 2026-10-13, python3 surface.py]`

## Stored Function

`surface.frontier_surface(table, weights, model, target, cutoff, seed)` returns the fitted surface: a predicted value for every row, the training ids and the parameters. `model` takes `graph`, `gp`, `gbt` or `linear`. `surface.render(name, surface, table)` looks the name up in `surface.RENDER_FUNCTIONS`, writes into a new folder under `surface/renders/<date>/` and saves a manifest with the function, parameters, inputs and commit. A second call makes a second folder.

`frontier-surface-map` draws the surface over the first two map coordinates and repeats the predictions on the shipped frontier disc, with the circle drawn. The render of 2026-10-13 is `surface/renders/2026-10-13/frontier-surface-map-205009/`. Predictions run from about 10 to 25 years across the map, a narrow band that matches the low score.

## Next Test

The reading changes if a surface scores above the posed year on a temporal split with an interval for the gain that excludes zero at two cutoffs. Two changes could get there: a posed year on more rows, since 4,522 of 5,209 have none, and a survival model that uses the 470 open rows with a posed year.
