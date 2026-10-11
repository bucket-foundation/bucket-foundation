# Atlas Thresholds

Five constants shape the frontier and the solvability score. Each was set by hand. `python3 thresholds.py` sweeps each one, tests reach as a classifier of solved problems, and writes every number here to `thresholds/thresholds.json` and `thresholds/tables.md` `[empirical: tools/solvability-atlas/thresholds/thresholds.json, 2026-10-11, python3 thresholds.py]`. The shipped constants are unchanged.

| Constant | Shipped | Where | Finding | Proposed |
|---|---|---|---|---|
| `REACH_QUANTILE` | 0.1, tau 0.762 | `solvability-frontier.ts`, `forecast.py` | Lets in 88% of solved rows and 69% of open rows | Tau 0.832 by Youden's J, with reach measured outside the variant family |
| `MIN_BRANCH_SOLVED` | 10 | same two files | Mind holds 10 solved rows, so the constant sits on the edge of a 129-row flip | 20 |
| Ring radii | 0.6, 1.0, 1.5 | `solvability-frontier.ts` | No count or ranking depends on them | Keep as drawing constants, add the linear view |
| Score weights | 0.55 resolved, 0.45 formal | `atlas.py` | Every weight from 0.474 to 1 gives the same order | Keep as a declared default |

## Data

The committed neighbour file on `dev` holds 5,209 rows with Lean theorems left off, 1,694 of them solved. The shipped rule gives tau 0.762, 4,128 inside and 1,081 outside. The Python port in `thresholds.py` matches `buildFrontier` on tau, on all four zone counts and on both top-20 lists. The README still quotes the 2026-10-06 build: 5,080 rows, 1,621 solved, tau 0.781. Later merges added rows, and tau moved 0.019 with them.

Embeddings are `BAAI/bge-small-en-v1.5` at the pinned revision, read from the cache that `build.sh` fills. The top similarity of every row agrees with the committed neighbour file to 0.0015.

## Sensitivity

Full tables: `thresholds/tables.md`. Plot: `thresholds/sensitivity.png`.

**Reach quantile.** Sweeping 0.01 to 0.5 moves tau from 0.648 to 0.864 and the inside count from 4,946 to 2,114. Each 0.025 step near the shipped value moves about 200 rows across the line: 243 at 0.075 and 191 at 0.125. The branch ranking by share of open rows inside holds: rank correlation with the shipped ranking stays at or above 0.87 over the whole sweep. The growth top 20 keeps 15 rows at 0.075, 14 at 0.125 and 1 at 0.2. The edge top 20 lists the rows nearest tau, so it changes completely at every other quantile.

**Minimum solved per branch.** Values 1 to 10 give one result, and values 11 to 22 give another. Mind holds 10 solved rows. At 11 its 129 open rows become unsampled and 17 of the growth top 20 change: 11 of the 20 are mind rows, and others rank there by the mind rows they pull. At 25 chemistry drops out, at 30 cosmology, at 35 biophysics and applied. Tau and the inside count of mathematics never move.

**Ring radii.** Zones come from tau and the branch minimum, so no radius changes a count or a ranking. The radii set area: at 0.6, 1.0, 1.5 the frontier disc covers 44% of the drawing and the core 16%. The piecewise map draws 10.2% of row pairs in the wrong radial order for their reach at every radius tried, because a solved row with low reach still sits inside the core. Rank correlation between radius and 1 minus reach is 0.848 for every pair of radii.

**Score weights.** The score takes eight cell values: resolved or open, times four formal levels. Two cells swap order at weights 0.200, 0.286, 0.333, 0.394 and 0.474. Above 0.474 every resolved row outranks every open row and the order is fixed, so 0.55 ranks rows the same as 0.5 or 0.9. Branch mean ranking is identical from 0.4 to 1.

## Reach As A Classifier

Label: the row is solved. Score: reach, the highest similarity to a solved row. Plots: `thresholds/roc-calibration.png`.

### Leakage

The shipped reach excludes the row itself. A variant counts as solved when its parent is solved, so solved siblings sit beside each other and leak the label. 3,018 rows share a group with another row once variant families and pairs at similarity 0.95 or above are merged. Ten rows share an identical text with another row.

| Neighbours excluded | ROC AUC | 95% interval |
|---|---|---|
| The row itself, the shipped rule | 0.766 | 0.752 to 0.780 |
| Its variant family | 0.677 | 0.655 to 0.698 |
| Family and near duplicates at 0.95 | 0.675 | 0.656 to 0.696 |
| Family and near duplicates at 0.90 | 0.672 | 0.649 to 0.695 |

Family exclusion removes 0.09 of AUC. Near-duplicate exclusion past that changes the third decimal. Every number below uses family plus 0.95 exclusion. Intervals are 2,000 bootstrap draws that resample whole groups, seed 20261011.

### Predictive Power

Reach predicts solved status weakly. AUC is 0.675, 0.656 to 0.696.

| Model, five grouped folds | ROC AUC | 95% interval |
|---|---|---|
| Branch base rate | 0.548 | 0.523 to 0.574 |
| Reach alone | 0.674 | 0.654 to 0.694 |
| Branch, source list and kind base rate | 0.714 | 0.691 to 0.736 |
| Branch, source list and kind, plus reach | 0.758 | 0.737 to 0.779 |

Reach beats the branch base rate by 0.127, 0.098 to 0.156. A lookup of which list a row came from beats reach. Reach adds 0.044, 0.030 to 0.058, on top of that lookup. Within one source the signal is smaller: 0.621 inside formal-conjectures, 0.591 to 0.653 on 3,567 rows, and 0.557 inside the Wikipedia lists. Within branch it runs from 0.586 for information to 0.809 for biophysics, and the intervals for mind and information span 0.5.

### Calibration

Solved share rises with reach, from 8.5% in the lowest decile to 58.1% in the highest, against a base rate of 32.5%. One decile breaks the order: 0.816 to 0.828 holds 27.3% solved after 34.5% in the decile before. A logistic fit on reach, scored out of fold, has an expected calibration error of 0.033.

### Time Split

297 of the 1,694 solved rows carry a resolution year and 438 open rows carry a posed year. For each cutoff the reference set is the rows solved by that year, and the test set is the dated rows posed by then and still open then.

| Cutoff | Solved by cutoff | Tested | Solved later | Reach AUC | 95% interval | Branch base rate AUC | Source list base rate AUC |
|---|---|---|---|---|---|---|---|
| 2005 | 170 | 287 | 48 | 0.738 | 0.662 to 0.811 | 0.441 | 0.557 |
| 2015 | 213 | 318 | 40 | 0.743 | 0.660 to 0.822 | 0.472 | 0.791 |
| 2021 | 261 | 449 | 16 | 0.830 | 0.712 to 0.928 | 0.525 | 0.932 |

Reach beats the branch base rate at all three cutoffs, by 0.27 to 0.31. Against the source list base rate it wins at 2005 by 0.18, 0.08 to 0.29, ties at 2015 and loses at 2021. The 2015 and 2021 tests cannot separate reach from list membership. One list shows why: 15 of the 19 dated rows from the Wikipedia unsolved-mathematics list were solved later, because a row on that list gets a year mainly when someone resolves it.

### Derived Tau

| Criterion | Tau | 95% interval | Solved inside | Open inside | Youden's J |
|---|---|---|---|---|---|
| Shipped, 10th percentile of solved reach | 0.762 | | 88.4% | 69.0% | 0.195 |
| Same rule on family-excluded reach | 0.752 | 0.732 to 0.763 | 90.0% | 71.8% | 0.182 |
| Youden's J | 0.832 | 0.800 to 0.841 | 53.5% | 28.2% | 0.254 |
| False-positive rate 20% | 0.843 | 0.841 to 0.846 | 43.2% | 20.0% | 0.232 |
| False-positive rate 10% | 0.861 | 0.859 to 0.865 | 25.3% | 10.0% | 0.153 |

The shipped rule is a fixed true-positive rate of 90%. Open rows play no part in it, and seven in ten of them land inside. Youden's J puts tau at 0.832. On the shipped frontier that value leaves 2,789 inside and 2,420 outside, moves 1,339 rows and replaces the whole growth top 20.

Branches need different taus. Mathematics holds 79% of the rows and its text sits closer together: its own Youden tau is 0.841, while the other seven branches fall between 0.670 and 0.752. A tau fitted on the other branches and applied to mathematics lets in 97.7% of its open rows. A tau fitted with mathematics lets in at most 25% of the solved rows of any other branch. The shipped frontier shows the same split: 2,350 of 2,637 open mathematics rows are inside, against 84 of 878 open rows elsewhere. The time split, whose reference set is thinner, puts Youden's tau near 0.70.

## Score Weights

No outcome exists to fit them on. The score takes `resolved` as an input, so a regression of solved on the score terms is circular. Formal status is recorded today, after the proofs: all 793 rows with a `proved` status are solved. A logistic regression of solved on the formal value gives a slope of 6.88 and an AUC of 0.773, and that number measures the bookkeeping. The weights stay a declared default. A fit needs formal status as it stood at a past date, which the atlas does not record.

## Linear Figure

`thresholds/frontier-linear-vs-piecewise.png` draws the shipped piecewise disc beside a linear one. In the linear panel radius equals 1 minus reach, the centre is reach 1, and the frontier is a circle at radius 0.238. Every pair of rows sits in reach order, and the largest radius is 0.487. The cost: solved and open rows overlap, since zone no longer sets the band.

## Proposals

The switch stays with the founder. `thresholds/tables.md` shows the shipped frontier at each proposed value.

1. **Reach.** Exclude a row's variant family when taking its nearest solved neighbour. This removes the leak worth 0.09 of AUC and needs the full similarity row, since 50 stored neighbours can all be family.
2. **Tau.** 0.832 by Youden's J, or 0.861 for a 10% false-positive rate. A tau per branch fits the data better than either. Mind and information would carry one with no support, since their AUC intervals span chance.
3. **Branch minimum.** 20. Every value from 11 to 22 gives the same frontier, so the result stops depending on one mind row. Mind has 10 solved rows and an AUC interval of 0.383 to 0.839.
4. **Radii and weights.** Keep both as declared defaults, and label them that way in the method text.

## Limits

- Solved here means a list records the row as solved. Lists of solved results and lists of open questions differ in wording, and reach picks that up. The source list lookup at AUC 0.714 measures how much.
- Mathematics is 79% of rows and 87% of solved rows. Every pooled number is close to a mathematics number.
- The time split rests on 16 to 48 later-solved rows per cutoff, and rows gain a year mainly by being solved. It also drops the 1,397 solved rows with no year from the reference set.
- Grouped folds and the bootstrap resample groups of related rows. Rows from one list can still share wording across groups.
- One embedding model. A different model moves every similarity, and tau with it. Tau also moves as rows are added: 0.781 to 0.762 in five days.
- Leave-one-branch-out puts 4,112 of 5,209 rows in a single fold, so it tests transfer between mathematics and the rest.
- Bootstrap intervals for the fold models resample out-of-fold predictions and leave the fits fixed.

## Reproduce

```bash
./build.sh
python3 thresholds.py
python3 -m pytest tests/test_thresholds.py
```

`thresholds.py` needs the embedding cache from `build.sh` and encodes any missing text with the pinned model. The sensitivity and weight sections need only the committed neighbour file and the two problem tables. `ATLAS_FULL_REPEAT=1` makes the test rerun all 2,000 bootstrap draws and compare the whole file.
