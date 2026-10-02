# Math Contract

Bead `bkt-hoz6`. Every quantitative claim an agent writes in a PR body, a MATH.md, a paper or a research note carries one of two tags.

- `[bm:BucketMath.Module.name]` cites a definition or a proved theorem in BucketMath, the Lean library at `lean/`. Use `[bm-open:Name]` for a stated claim that has no proof yet; those live in `BucketMath.Open`.
- `[empirical: source, date, command]` marks a measured number: the data it came from, when, and the command that reproduces it.

## Tools

```bash
python3 tools/bucketmath/bm.py lookup residual unit direction
python3 tools/bucketmath/bm.py lint path/to/MATH.md
python3 tools/bucketmath/bm.py check
python3 tools/bucketmath/bm.py check --write
```

`lookup` searches `lean/manifest.json`. `lint` fails when a tag names nothing, cites an open claim as proved, or cites a proved one as open; it warns on sentences with a number and a quantitative word and no tag. `check` builds the library, requires every theorem outside `BucketMath.Open` to use only `propext`, `Classical.choice` and `Quot.sound`, keeps the build offline, and fails when the committed manifest differs from a fresh one. `--write` refreshes it. The MCP tool `bucketmath_lookup` answers the same lookup from the public server; the local server also has `bucketmath_check`.

## Limits

The lint resolves tags. It cannot tell whether the cited theorem supports the sentence, and its number heuristic misses measured claims written without digits; the critic reviews both. Theorems from the history hypothesis engine appear as `external` until they move into BucketMath.

## Library

| Module | Holds |
|---|---|
| `BucketMath.Vec` | sums, dot products and their linear rules over ℚ |
| `BucketMath.Directions` | residual identity for a unit direction, PageRank step mass, one-cluster modularity |
| `BucketMath.Profile` | profiles as slices of integer pairs, quarter turns, coils of rotated slices, preserved energy |
| `BucketMath.Markets` | spread, economic value added, regimes, competitive entry and excess return |
| `BucketMath.Project` | projection onto orthonormal directions and the residual identity for k directions |
| `BucketMath.Graph` | prerequisite reachability, rank order along prerequisite chains, acyclicity under a strict rank |
| `BucketMath.Discovery` | expected discovery as the sum of probability times value, additive and monotone over admissible directions |
| `BucketMath.Learning` | prerequisite closure, learning paths, the minimum unit and weighted learning path, coverage and extent monotonicity; `Learning.Diamond` is the worked example |
| `BucketMath.Marketing` | marketing ratios as partial division over ℚ, CPA times conversions equals spend, CTR and retention at most one, channel shares summing to one, last-touch and linear credit conserving the conversion count |
| `BucketMath.Ranking` | an insertion sort over id and integer score pairs, its output a permutation ordered by score descending then id ascending, and the one list with that property |
| `BucketMath.Grade` | the log-scale grade as an integer inequality: two positive values are within a rational tolerance when a power of the larger is at most a power of ten multiplied by the same power of the smaller; symmetry, scale invariance, monotonicity in the ratio, the boundary at one half |
| `BucketMath.Fsrs` | the review scheduling clamps in fixed point: a two-sided clamp, a floor, round half up and the capped interval, with their bounds |
| `BucketMath.Split` | the payment split in integer micro-units: author, node and operations parts, with the node part inside the non-author share and zero under a payment floor |
| `BucketMath.Open` | stated claims without proofs, empty today |
| `BucketMathAll` | BucketMath plus the history engine package at `papers/history-hypothesis-engine/lean` |

Core Lean 4.33.1 only; `Std` ships with the toolchain. Adding a fetched package fails `check`.

## Theorems And Inputs

| Claim | Kind |
|---|---|
| A prerequisite chain under a strict rank never cycles | [bm:BucketMath.Graph.acyclic_of_rank] |
| Expected discovery never drops when admissible directions are added | [bm:BucketMath.Discovery.expected_mono] |
| Projection energy plus residual energy equals total energy | [bm:BucketMath.Project.pythagoras_orthonormal] |
| An efficient industry has spread within the band | [bm:BucketMath.Markets.efficient_spread_bounded] |
| Every concept a target requires and the learner lacks appears on any valid learning path | [bm:BucketMath.Learning.remaining_necessary] |
| An enumerated, prerequisite-ordered list of missing concepts is a shortest path, and a minimum-effort one under nonnegative weights | [bm:BucketMath.Learning.minimum_unit_distance], [bm:BucketMath.Learning.minimum_weighted_effort] |
| Under a strict rank, every required prerequisite ranks below its target | [bm:BucketMath.Graph.required_rank_lt] |
| With unique ids, ranking returns a permutation ordered by score descending then id ascending, and that list is unique | [bm:BucketMath.Ranking.rank_perm], [bm:BucketMath.Ranking.rank_ordered], [bm:BucketMath.Ranking.rank_unique] |
| The log-scale grade is symmetric, unchanged by a common scale, and accepts every pair whose ratio is no larger than an accepted pair's; no pair of positive rationals sits on the boundary at tolerance one half | [bm:BucketMath.Grade.within_symm], [bm:BucketMath.Grade.within_scale], [bm:BucketMath.Grade.within_of_closer], [bm:BucketMath.Grade.no_exact_boundary] |
| For any raw values, the clamped difficulty, stability and interval sit inside their bounds | [bm:BucketMath.Fsrs.review_bounds] |
| The split parts sum to the amount and the author part is at least four fifths of it | [bm:BucketMath.Split.split_total], [bm:BucketMath.Split.author_floor] |
| Graph edges, direction probabilities and values, market returns, benchmark choice, concept edges, effort weights, learner evidence | inputs; cite each with `[empirical: source, date, command]` |
