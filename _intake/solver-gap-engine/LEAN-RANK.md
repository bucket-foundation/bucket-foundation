# Lean Statement Ranking

Beads bkt-gqq7 and bkt-t5ir. Two questions: do features of the Lean statement mark the open problems that upstream later tags solved, and which open problems fix every parameter, so that a bounded computation might settle them.

## Verdict

The backtest of statement features alone is null: AUC 0.488, at chance. Added to the metadata model they move AUC from 0.544 to 0.566, and the interval of that gain includes zero. The cheap tactic sweep proved none of the 58 problems it reached.

## Features

`lean_features.py` cuts each `theorem` statement out of the source at any commit and computes 23 features from the text: statement length and token count, universal and existential counts, alternation depth, explicit binders, `answer(sorry)` against `answer(True|False)`, variables in ℕ or Fin alone, mentions of ℝ and of sets, asymptotic notation, numeric literal count and largest literal, distinct identifiers, Mathlib identifiers, definitions local to the file, a statement that is one local definition, `↔`, leading negation, set finiteness, bounded quantifiers, `type_of%`.

## Backtest

Same split as `predict.py`: train on the 2025-12-01 snapshot with labels at 2026-06-01, test on the 2026-06-01 snapshot with labels at `137aec5c`. Same rows, 464 train with 37 solved later, 1,015 test with 150 solved later, base rate 14.8%. Same logistic regression, same seed, 2,000 bootstrap resamples, 5,000 label permutations.

| Model | Features | Test AUC | 95% interval | p | Top 25 | Top 50 | Top 100 |
|---|---|---|---|---|---|---|---|
| Metadata, from `predict.py` | 32 | 0.544 | 0.488 to 0.597 | 0.043 | 8, 32% | 15, 30% | 25, 25% |
| Lean statement | 23 | 0.488 | 0.435 to 0.538 | 0.680 | 8, 32% | 11, 22% | 16, 16% |
| Metadata plus Lean | 55 | 0.566 | 0.509 to 0.618 | 0.005 | 6, 24% | 13, 26% | 22, 22% |

Top columns give the count solved later and the precision. [empirical: formal-conjectures 137aec5c, 2026-10-01, python3 lean_features.py --repo fc-history.git --head 137aec5c]

Paired on the test rows, the Lean model sits 0.056 below metadata, interval -0.105 to -0.010, and the combined model 0.023 above it, interval -0.006 to +0.050. [empirical: formal-conjectures 137aec5c, 2026-10-01, python3 lean_features.py --repo fc-history.git --head 137aec5c]

The combined model has a higher AUC than metadata and a lower precision in its top 25, top 50 and top 100, so it gives no better shortlist than metadata. Its p of 0.005 tests the combined model against chance; the paired row tests the Lean features, and that row is null.

## Single Features

| Feature | Test AUC | Train AUC |
|---|---|---|
| Largest numeric literal | 0.658 | 0.459 |
| Numeric literal count | 0.650 | 0.589 |
| Statement length | 0.505 | 0.765 |
| Mathlib identifiers | 0.471 | 0.721 |

[empirical: formal-conjectures 137aec5c, 2026-10-01, python3 lean_features.py --repo fc-history.git --head 137aec5c]

The features that ranked best on the train window, length and identifier counts, sit at chance on the test window. Two features sit above 0.55 in both windows: numeric literal count and the presence of `↔`, the latter at 0.696 on train and 0.576 on test. Both were picked from 23 after the test labels were read, so each is a lead for the next snapshot and carries no claim.

## Fixed-Parameter Cases

`finite_sweep.py` scans the 1,402 open problems at `137aec5c` for statements that fix every parameter to a numeral or a finite type. It rejects 1,341 on the first failed test: an infinite object in the statement 381, asymptotic notation 333, a free variable 324, an unbounded quantifier 154, `answer(sorry)` standing for data 118, no numeral 31.

| Group | Count |
|---|---|
| Open problems at head | 1,402 |
| Fixed-instance statements | 61 |
| Of those, a local definition quantifies over an infinite type | 60 |
| Of those, a bounded search with a size read from the statement | 10 |

[empirical: formal-conjectures 137aec5c, 2026-10-01, python3 finite_sweep.py --repo fc-history.git --head 137aec5c]

| Bounded case | Search space | Basis |
|---|---|---|
| `W_3_21_eq` to `W_3_28_eq`, 8 van der Waerden values | 10^125 to 10^249 | 2-colourings of 1..N for N from 416 to 827 |
| `conway99Graph` | 10^1460 | graphs on 99 vertices |
| `molsOrder12` | 10^1709 | 11 square tables of order 12 |

[empirical: formal-conjectures 137aec5c, 2026-10-01, python3 finite_sweep.py --repo fc-history.git --head 137aec5c]

Every bounded case sits beyond enumeration; each needs a SAT encoding or a symmetry argument. The other 51 fixed instances carry an unbounded search or an infinite object inside a definition: SIC-POVM existence in 11 dimensions, 9 AME states, Lychrel 196, the solitary number 10, De Giorgi in dimensions 4 to 8. `finite-cases.json` lists all 61 with tier, definitions flagged and size.

## Tactic Sweep

60 of the 61 cases, bounded cases first, at the `7d450ef` checkout, each statement unchanged between that pin and head. A scratch module imports the upstream file and states `type_of% @name`, or its negation for the `False` answer, then tries each tactic. `native_decide` was excluded. 2 processes at a time, 60 s and 4 GB each.

| Tactic | Runs | Proved | Failed | Timed out |
|---|---|---|---|---|
| `decide` | 100 | 0 | 100 | 0 |
| `omega` | 100 | 0 | 100 | 0 |
| `simp` | 100 | 0 | 100 | 0 |
| `norm_num` | 100 | 0 | 100 | 0 |
| `aesop` | 100 | 0 | 100 | 0 |

[empirical: formal-conjectures 7d450ef, Lean 4.33.1, 2026-10-01, python3 finite_sweep.py --repo fc-history.git --head 137aec5c --build fc-pin --scratch attempts]

58 problems reached the tactics, 42 of them under both answers, 9 of them bounded cases. Two got no attempt: `conway99Graph` and `poisson_conjecture.variants.dimension_one` hit the 60 s cap during import, on a machine where other jobs pushed one import to 119 s. `--resume` reruns those two alone. Controls: 8 upstream test theorems that upstream proves with one of these tactics, 8 reproduced by the same scratch setup with axioms limited to `propext`, `Classical.choice` and `Quot.sound`. All 8 controls use `decide`; the other four tactics have no positive control. No open problem was proved, so nothing awaits human review. `attempts.jsonl` holds 583 rows with the Lean message for each.

## Limits

- Value-finding problems are left out. The 118 statements rejected for `answer(sorry)` include fixed finite computations such as `Dedekind_10`, `snake_dim_nine` and `ramsey_number_six_six`, so the 61 undercount the problems a bounded computation could settle.
- Of the 61 fixed-parameter statements, 1 is closed and 10 are bounded searches. About 20 of the rest fix their parameters and still range over real numbers or infinite objects.
- Most tactic failures are a missing `Decidable` instance or a `decide` that did not reduce. The 0 of 58 measures these five tactics and says little about the problems.
- The label is an upstream retag, as in `BACKTEST.md`. One split, one test window, 150 positives.
- Features come from regular expressions over source text. Notation, `variable` blocks and definitions imported from other files are invisible to them.
- The finite scan reads the statement and the definitions in the same file. A Mathlib term such as `finrank` is caught by a word list; that list is short.
- The W and MOLS sizes come from a hand reading of two local definitions. The size counts raw candidates and ignores symmetry.
- The one case the scan marks as free of infinite definitions, `erdos_596.variants.K4_K3_exceptional_iff`, takes its definition from another file and is unreviewed.
- Five tactics with default settings and no lemma hints. A failure says the statement resists these tactics and says nothing about its difficulty.

## Reproduce

```bash
git clone --bare https://github.com/google-deepmind/formal-conjectures fc-history.git
git clone fc-history.git fc-pin && git -C fc-pin checkout 7d450ef && (cd fc-pin && lake exe cache get)
pip install -r requirements.txt
python3 lean_features.py --repo fc-history.git --head 137aec5c
python3 finite_sweep.py --repo fc-history.git --head 137aec5c --pin 7d450ef --build fc-pin --scratch attempts
```
