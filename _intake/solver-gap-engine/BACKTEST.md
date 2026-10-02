# Gap Score Backtest

Bead bkt-gz71. The gap score ranks an open problem by the cosine similarity of its docstring to the nearest solved problem in another file. The backtest asks one question: at a past date, did a higher score mark the problems that upstream later tagged solved?

## Method

Each snapshot is the last formal-conjectures commit before its date. Scores use that snapshot alone. The label is the tag of the same theorem name at upstream `137aec5c`, dated 2026-09-30. An open problem whose name is absent at that commit is dropped. Tags come from `@[category research open|solved]`, so the label means "upstream retagged it solved", which covers new proofs, new counterexamples and corrections of a wrong tag.

AUC is the chance that a problem later tagged solved outscored one that stayed open. 0.5 is chance. Intervals are 2,000 bootstrap resamples; p values are 5,000 label permutations, one-sided, seed 0.

## Gap Score

| Snapshot | Open tracked | Solved later | AUC | 95% interval | p | AUC within collection | AUC of docstring length |
|---|---|---|---|---|---|---|---|
| 2025-09-01 | 313 | 43 | 0.583 | 0.484 to 0.679 | 0.044 | 0.567 | 0.707 |
| 2025-12-01 | 453 | 69 | 0.585 | 0.507 to 0.657 | 0.014 | 0.567 | 0.658 |
| 2026-03-01 | 653 | 97 | 0.528 | 0.467 to 0.592 | 0.182 | 0.522 | 0.623 |
| 2026-06-01 | 1,015 | 150 | 0.441 | 0.389 to 0.494 | 0.989 | 0.497 | 0.511 |

[empirical: formal-conjectures 137aec5c, 2026-10-01, python3 backtest.py --repo fc-history.git --head 137aec5c]

The score shows a weak signal at the 2025-12 snapshot alone, with p values uncorrected for four tests, and none in 2026. At the June 2026 snapshot it ranked later-solved problems below the rest; the within-collection figure of 0.497 is consistent with high-scoring collections having few resolutions. Docstring length, a feature with no model behind it, beat the score at all four snapshots. The top 50 by score held 10 later-solved problems at the June snapshot against 7.4 expected from the 14.8% base rate.

The earlier report said a high score marks a problem worth handing to a prover. These numbers give no support for that reading.

## Metadata Model

A logistic regression on 32 features known at the snapshot: both similarity scores, docstring length, solved and open siblings in the file, variant flag, recent citation count, 13 keyword flags and 10 collection flags. Trained on the 2025-12-01 snapshot with labels at 2026-06-01, tested on the 2026-06-01 snapshot with labels at 2026-09-30.

| Measure | Value |
|---|---|
| Train rows, solved later | 464, 37 |
| Test rows, solved later | 1,015, 150 |
| Test AUC | 0.544, interval 0.488 to 0.597, p 0.043 |
| Top 50 by model | 15 solved later, 30% against a 14.8% base rate |
| Top 50 by gap score | 10 solved later, 20% |

[empirical: formal-conjectures 137aec5c, 2026-10-01, python3 predict.py --repo fc-history.git --head 137aec5c]

The interval includes 0.5. The top-50 count is one split and one list, so it is a lead and stays out of any claim. `backtest/candidates-head.json` ranks today's 1,363 open problems with this model refit on the train and test rows together; its first 15 rows are 4 single problems and 11 cases from one file, which shows the model learned which files resolve in batches.

## Sibling Momentum

Hypothesis: an open problem whose file had another problem move to solved in the prior window has a higher resolution rate in the next one.

| Window | Open | With a recent solved sibling | Rate with | Rate without |
|---|---|---|---|---|
| 2025-12-01 to 2026-03-01 | 528 | 4 | 0 of 4 | 1.9% |
| 2026-03-01 to 2026-06-01 | 729 | 1 | 0 of 1 | 5.4% |
| 2026-06-01 to 2026-09-30 | 1,054 | 21 | 14.3% | 14.5% |

[empirical: formal-conjectures 137aec5c, 2026-10-01, python3 momentum.py --repo fc-history.git --head 137aec5c]

No effect detected, and the test is underpowered: one window has 21 problems with a recent solved sibling, the other two have 4 and 1.

## Resolution Rate

| Window | Open at start, tracked | Retagged solved | Rate | With a formal-proof link |
|---|---|---|---|---|
| 2025-09-01 to 2025-12-01 | 393 | 5 | 1.3% | 0 |
| 2025-12-01 to 2026-03-01 | 528 | 10 | 1.9% | 0 |
| 2026-03-01 to 2026-06-01 | 729 | 39 | 5.3% | 24 |
| 2026-06-01 to 2026-09-01 | 1,082 | 41 | 3.8% | 32 |
| 2026-09-01 to 2026-09-30 | 1,396 | 159 | 11.4% | 88 |

[empirical: formal-conjectures 137aec5c, 2026-10-01, python3 rates.py --repo fc-history.git --head 137aec5c]

September 2026 moved 159 open problems to solved, against 41 in the three months before it. The moves sit in about 117 commits by about 24 authors on 18 days, and the largest single commit moved about 12, so one bulk retag does not explain the month. The commit figures count changed tag lines and sum to 165 against the 159 tracked by name. 88 of the 159 carry a `formal_proof` tag, a link to a proof, in several cases in a third-party repository. The count measures upstream tags; this backtest read no proof.

## Limits

- A retag is a proxy for a resolution. A problem solved in the literature years ago and tagged late counts as solved later.
- Problems renamed or removed between snapshot and head are dropped: 53, 75, 109 and 39 across the four snapshots.
- Snapshots overlap, so the four AUC rows share problems and are four views of one history.
- The tag pattern misses 6 of 3,605 declarations at head.
- One embedding model, all-MiniLM-L6-v2, on docstrings. A model that reads the Lean statement may behave differently.

## Reproduce

```bash
git clone --bare https://github.com/google-deepmind/formal-conjectures fc-history.git
pip install -r requirements.txt
for s in backtest predict momentum rates; do python3 $s.py --repo fc-history.git --head 137aec5c; done
python3 plot.py
```

Outputs land in `backtest/`, which stays out of git apart from the two plots and the four result files.
