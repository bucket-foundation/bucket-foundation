# Gap Score Backtest

Bead bkt-gz71. The gap score ranks an open problem by the cosine similarity of its docstring to the nearest solved problem in another file. The backtest asks one question: at a past date, did a higher score mark the problems that upstream later tagged solved?

## Method

Each snapshot is the last formal-conjectures commit before 00:00 UTC on its date, the `CUTOFF` constant in `backtest.py`. Scores use that snapshot alone. The label is the tag of the same theorem name at upstream `137aec5c`, dated 2026-09-30. An open problem whose name is absent at that commit is dropped, and the Dropped column counts those; `open_missing_at_head` holds the count in `backtest.json`. Tags come from `@[category research open|solved]`, so the label means "upstream retagged it solved", which covers new proofs, new counterexamples and corrections of a wrong tag.

AUC is the chance that a problem later tagged solved outscored one that stayed open. 0.5 is chance. Intervals are 2,000 bootstrap resamples; p values are 5,000 label permutations, one-sided, seed 0.

## Gap Score

| Snapshot | Open tracked | Dropped | Solved later | AUC | 95% interval | p | AUC within collection | AUC of docstring length |
|---|---|---|---|---|---|---|---|---|
| 2025-09-01 | 311 | 53 | 43 | 0.583 | 0.476 to 0.680 | 0.044 | 0.564 | 0.709 |
| 2025-12-01 | 453 | 75 | 69 | 0.585 | 0.506 to 0.659 | 0.013 | 0.567 | 0.658 |
| 2026-03-01 | 654 | 110 | 98 | 0.526 | 0.463 to 0.590 | 0.200 | 0.517 | 0.618 |
| 2026-06-01 | 1,014 | 39 | 150 | 0.441 | 0.389 to 0.494 | 0.991 | 0.497 | 0.511 |

[empirical: formal-conjectures 137aec5c, 2026-10-13, python3 backtest.py --repo fc-history.git --head 137aec5c]

The score shows a weak signal at the 2025-12 snapshot alone, with p values uncorrected for four tests, and none in 2026. At the June 2026 snapshot it ranked later-solved problems below the rest; the within-collection figure of 0.497 is consistent with high-scoring collections having few resolutions. Docstring length, a feature with no model behind it, beat the score at all four snapshots. The top 50 by score held 10 later-solved problems at the June snapshot against 7.4 expected from the 14.8% base rate [empirical: formal-conjectures 137aec5c, 2026-10-13, python3 backtest.py --repo fc-history.git --head 137aec5c].

These numbers give no support for reading a high score as the mark of a problem to hand to a prover.

## Metadata Model

A logistic regression on 32 features known at the snapshot: both similarity scores, docstring length, solved and open siblings in the file, variant flag, recent citation count, 13 keyword flags and 10 collection flags. Trained on the 2025-12-01 snapshot with labels at 2026-06-01, tested on the 2026-06-01 snapshot with labels at 2026-09-30.

| Measure | Value |
|---|---|
| Train rows, solved later | 464, 37 |
| Test rows, solved later | 1,014, 150 |
| Test AUC | 0.543, interval 0.486 to 0.596, p 0.042 |
| Top 50 by model | 15 solved later, 30% against a 14.8% base rate |
| Top 50 by gap score | 10 solved later, 20% |

[empirical: formal-conjectures 137aec5c, 2026-10-13, python3 predict.py --repo fc-history.git --head 137aec5c]

The interval includes 0.5. The top-50 count is one split and one list, so it is a lead and stays out of any claim. `backtest/candidates-head.json` ranks today's 1,363 open problems with this model refit on the train and test rows together; its first 15 rows are 4 single problems and 11 cases from one file, which shows the model learned which files resolve in batches [empirical: formal-conjectures 137aec5c, 2026-10-13, python3 predict.py --repo fc-history.git --head 137aec5c].

## Sibling Momentum

Hypothesis: an open problem whose file had another problem move to solved in the prior window has a higher resolution rate in the next one.

| Window | Open | With a recent solved sibling | Rate with | Rate without |
|---|---|---|---|---|
| 2025-12-01 to 2026-03-01 | 528 | 4 | 0 of 4 | 1.9% |
| 2026-03-01 to 2026-06-01 | 728 | 1 | 0 of 1 | 5.5% |
| 2026-06-01 to 2026-09-30 | 1,053 | 23 | 13.0% | 14.6% |

[empirical: formal-conjectures 137aec5c, 2026-10-13, python3 momentum.py --repo fc-history.git --head 137aec5c]

No effect detected, and the test is underpowered: one window has 23 problems with a recent solved sibling, the other two have 4 and 1 [empirical: formal-conjectures 137aec5c, 2026-10-13, python3 momentum.py --repo fc-history.git --head 137aec5c].

## Resolution Rate

| Window | Open at start, tracked | Retagged solved | Rate | With a formal-proof link |
|---|---|---|---|---|
| 2025-09-01 to 2025-12-01 | 391 | 5 | 1.3% | 0 |
| 2025-12-01 to 2026-03-01 | 528 | 10 | 1.9% | 0 |
| 2026-03-01 to 2026-06-01 | 728 | 40 | 5.5% | 25 |
| 2026-06-01 to 2026-09-01 | 1,081 | 41 | 3.8% | 32 |
| 2026-09-01 to 2026-09-30 | 1,390 | 159 | 11.4% | 88 |

[empirical: formal-conjectures 137aec5c, 2026-10-13, python3 rates.py --repo fc-history.git --head 137aec5c]

September 2026 moved 159 open problems to solved, against 41 in the three months before it. The moves sit in about 117 commits by about 24 authors on 18 days, and the largest single commit moved about 12, so one bulk retag does not explain the month. The commit figures count changed tag lines and sum to 165 against the 159 tracked by name. 88 of the 159 carry a `formal_proof` tag, a link to a proof, in several cases in a third-party repository. The count measures upstream tags; this backtest read no proof [empirical: formal-conjectures 137aec5c, 2026-10-13, python3 rates.py --repo fc-history.git --head 137aec5c].

## Limits

- A retag is a proxy for a resolution. A problem solved in the literature years ago and tagged late counts as solved later.
- Problems renamed or removed between snapshot and head are dropped: 53 of 364, 75 of 528, 110 of 764 and 39 of 1,053 open problems across the four snapshots. A dropped problem cannot count as unsolved, so each AUC describes the problems that kept their name [empirical: formal-conjectures 137aec5c, 2026-10-13, python3 backtest.py --repo fc-history.git --head 137aec5c].
- Snapshots overlap, so the four AUC rows share problems and are four views of one history.
- Values published before 2026-10-13 used a 16:45 UTC cutoff inherited from the wall clock of the first run and read 0.583, 0.585, 0.528 and 0.441; the cutoff is now 00:00 UTC, and at 23:59:59 UTC the four values are 0.586, 0.585, 0.526 and 0.441 [empirical: formal-conjectures 137aec5c, 2026-10-13, python3 backtest.py --repo fc-history.git --head 137aec5c with CUTOFF set to T16:45:00+00:00, then T23:59:59+00:00].
- The tag pattern misses 6 of 3,605 declarations at head [empirical: formal-conjectures 137aec5c, 2026-10-13, python3 backtest.py --repo fc-history.git --head 137aec5c].
- One embedding model, all-MiniLM-L6-v2, on docstrings. A model that reads the Lean statement may behave differently.

## Sources

Source URLs, commits and licences for formal-conjectures and the embedding model: `SOURCES.md`.

## Reproduce

```bash
git clone --bare https://github.com/google-deepmind/formal-conjectures fc-history.git
pip install -r requirements.txt
for s in backtest predict momentum rates; do python3 $s.py --repo fc-history.git --head 137aec5c; done
python3 plot.py
```

Outputs land in `backtest/`. `.gitignore` keeps `items-*.jsonl`, `predict-test.jsonl` and `candidates-head.json` out of git; the result files and plots are committed. `backtest/backtest.json` is the source for every gap score AUC quoted in the report, the README and What's New, and `scripts/test-solver-gap-backtest-numbers.mjs` fails when a copy drifts.
