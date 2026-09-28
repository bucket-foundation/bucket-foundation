# Lean learning model

Lean 4.33.1 compiles `LearningSystem.lean` using its bundled Std library. No package downloads are needed after installing the pinned toolchain.

Run from this directory:

```sh
./check.sh
```

`check-output.txt` records the theorem axiom audit. The audit permits Lean's standard `propext`, `Classical.choice` and `Quot.sound`. It rejects proof holes, custom axioms and `native_decide`. `lake-manifest.json` contains no external packages.

## Definitions

`edge p v` means concept p is a mandatory prerequisite of v. `Required edge target v` is the inductive backward closure containing the target. `Closed edge known` requires mastery to contain the prerequisites of each mastered node. `Path edge known steps` adds one fresh node per transition, after all its direct prerequisites are known. `After` is the initial mastery union the learned nodes.

`RestrictedKnown` intersects mastery with the target closure. `restricted_closed` converts the runtime target-local consistency condition into the global `Closed` hypothesis used by the path theorems. `restricted_remaining` proves that this restriction leaves target requirements unchanged. Unrelated inconsistent mastery falls outside the restricted state.

`Enumerates` binds a duplicate-free finite list to the exact unmastered target closure. `Earlier` is a topological certificate: each prerequisite is initially known or appears earlier in the list. These assumptions are exposed arguments to the theorems. The proof does not construct this certificate from a finite DAG or verify a topological-sort implementation. The universal lower bound holds for every valid target-reaching path, including paths containing irrelevant nodes.

## Theorem mapping

| Theorem | Proven claim | Implementation obligation |
| --- | --- | --- |
| `restricted_closed` and `restricted_remaining` | Target-local mastery closure induces a closed restricted state with the same remaining target requirements. | Restrict the initial formal state to the target closure after checking local prerequisite consistency. |
| `remaining_necessary` | A target-reaching ready-addition path includes each unmastered required node. | The snapshot contains every mandatory edge; accepted mastery is downward closed. |
| `earlier_path` | A fresh duplicate-free list satisfying `Earlier` is a valid path. | Validate prerequisites against the prefix, or establish this property for the sorting implementation. |
| `minimum_unit_distance` | The certified order reaches the target and has length at most every valid target-reaching path. | Supply an exact `Enumerates` witness and an `Earlier` certificate. Unit cost counts one concept per transition. |
| `minimum_weighted_effort` | The same certified order minimizes summed fixed natural-number node costs. | Use nonnegative integer effort ticks fixed for the snapshot. Order effects and learner-dependent changing costs are outside this model. |
| `distance_antitone` | Growing mastery reduces or preserves the count of remaining requirements. | Compare the same graph and target with exact remaining lists. For interpretation as attained distances, each state also needs closure and a feasible certificate. |
| `coverage_monotone` | Fixed natural-weight catalog coverage grows when each mastered flag remains mastered. | Hold the catalog and weights fixed; prevent duplicate concepts at the application boundary. |
| `squared_extent_monotone` | Nonnegative integer coordinates that grow componentwise have a growing sum of squares. | Establish coordinate growth before using the theorem. This is raw coordinate extent, without a normalized real-valued volume theorem. |
| `diamond_ready` and `diamond_minimum` | The four-node diamond has a feasible four-step path and every target-reaching path needs at least four steps. | Reuse the diamond structure as a runtime fixture. |
| `diamond_chain_insufficient` | The foundation-left-target chain is invalid because the right branch remains missing. | Never use a concept-chain distance as a complete all-required study plan. |

## Scope

Natural weights provide exact nonnegative effort ticks and coverage numerators. Real-valued probabilities, normalized fractions and Euclidean volume are outside the formalization. Fixed positive normalization denominators preserve order mathematically; that normalization statement has no Lean theorem here. Squared extent describes a visualization and makes no psychometric or independence claim.

The model permits an arbitrary concept type with a finite enumerated target closure. Acyclicity is handled through the explicit `Earlier` certificate; no general finite-DAG sorting existence theorem is claimed. Graph truth, assessment validity, hidden-edge completeness and the TypeScript implementation remain external obligations. The proofs establish the stated discrete model and do not establish human learning gains.
