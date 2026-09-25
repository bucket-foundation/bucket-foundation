# Synthetic validation

Run from the repository root:

```sh
python3 learning/research-os/learning-system/analysis/evaluate.py
```

Requires Python 3 and NumPy. Executed with Python 3.13.13 and NumPy 2.5.1. Dependency pin: `../requirements.txt`. Seed: 20260925. The run takes about one second on the development host and writes `metrics.json`. Inputs are synthetic; no learner records or network access are used. Floating-point results can differ across numerical libraries.

## Prerequisite search

The generator enumerates every edge subset under one topological labeling for node counts one through five: 1,099 DAGs. Every DAG has a relabeling in this family. It enumerates downward-closed mastery sets and each target, producing 57,060 cases. The candidate traverses required ancestors and emits prerequisite-first unmastered nodes. The reference searches knowledge states by breadth-first search over all ready-node additions and stops upon reaching the target. It does not call the candidate traversal.

All cases have zero distance error, zero missing-required-node error and zero readiness error. Distance counts new nodes with unit cost. Fixed unequal costs are outside this executable experiment. Fixtures include a diamond with a disconnected node, a shortcut, a mastered target and an unmastered foundation. Typed failures cover cycles, mastery conflicts, missing nodes and unreviewed foundations. A shortest diamond chain has three nodes and omits a required fourth node.

The planner checks the target-local predicate: every mastered node in C(t) has all its immediate prerequisites in M. Since C(t) contains all ancestors, the restricted set M_C = M intersect C(t) is downward closed. The Lean `RestrictedKnown` theorem supplies this global-closure bridge for the restricted state. A fixture adds the disjoint edge 4 to 5 and mastery {5} while targeting node 3. Its plan remains [0,1,2,3], and independent state search on the restricted graph and mastery returns distance four. Chart mastery is M intersect C(t), empty in this fixture. This check makes no mastery inference outside the target closure. The exhaustive graph cases above use globally closed mastery; this fixture covers the target-local boundary.

## Axis coverage

Concept supports are a={a}, b={b}, t={a,b}. Each concept contributes total weight one, divided among its distinct supports. Fixed axis denominators equal 1.5. Milestones produce coverage 0, 1/3, 2/3 and 1. Mastering a produces coordinates (2/3,0) and squared RMS extent 2/9. Assertions test duplicate-support invariance and monotonic squared extent for every binary mastery state and single-node addition. These algebra checks allow any binary state; planning checks enforce prerequisite consistency.

## Learner response experiment

The experiment generates 1,200 learners and eight items, with observed synthetic axis covariates and one prerequisite indicator. Learners split into 400 training, 200 calibration and 600 test records. Logistic models fit an intercept, item intercepts, or item intercepts plus axis/prerequisite covariates. Calibration fits an intercept and slope on calibration learners; test predictions are frozen. A ridge coefficient of 0.01 stabilizes each fit. Calibration bins use ten fixed probability intervals.

Test Brier scores are 0.24633 for the intercept model, 0.23475 for item intercepts and 0.18649 for the axis/prerequisite model. The generator includes these predictors, so this improvement checks the analysis pipeline. It supplies no evidence of learner gains or valid production axis definitions.

Items zero and one share a planted unobserved learner factor; items two and three form the prespecified control pair. Test residuals are observed response minus fitted probability. Two thousand learner-cluster bootstrap resamples give Bonferroni-adjusted 97.5% pair intervals for a 95% family target. Two thousand learner permutations per pair produce two-sided correlation p-values; Holm correction covers the two prespecified tests.

The planted pair has correlation 0.33463, interval [0.24379,0.41299], Holm p=0.00100. The control has correlation -0.07997, interval [-0.16685,0.00182], Holm p=0.05497. Failure to reject the control is no proof of independence. Bootstrap intervals condition on the fitted model and omit training-fit uncertainty. Permutation inference assumes exchangeable learners under the pair's null hypothesis. Residual associations alone cannot identify their cause.

Items recur across learner splits to assess calibration on the same item bank. This experiment does not test generalization to unseen item families or source passages. Production evaluation needs those held-out groups, missing-data handling and assessment-policy validation. The artifact does not exercise authorization, graph snapshot races, retention or the proposed TypeScript service. Proof and production behavior need separate checks.
