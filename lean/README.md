# BucketMath

Citation rules: `docs/agents/MATH-CONTRACT.md`.

## Polymath Capacity And Sequencing

Bead `bkt-pj2ps`. Results hold for any set of learning domains: languages, fields, decks.

| Claim | Tag |
|---|---|
| The review interval at retention r grows with stability when retention rises with stability | [bm:BucketMath.Learning.Capacity.lastHold_mono_stability] |
| Retention stays at or above r until the review interval when retention falls with elapsed time | [bm:BucketMath.Learning.Capacity.held_retention] |
| Weekly upkeep falls as stability rises | [bm:BucketMath.Learning.Capacity.upkeep_antitone] |
| Domains held under budget B number at most B divided by the least upkeep | [bm:BucketMath.Learning.Capacity.capacity_bound] |
| The bound is reached by a pool of least-upkeep domains | [bm:BucketMath.Learning.Capacity.capacity_tight] |
| A held set that fits the budget keeps fitting as stabilities grow, and the bound rises | [bm:BucketMath.Learning.Capacity.capacity_rises], [bm:BucketMath.Learning.Capacity.capacity_bound_mono] |
| Shared prefix depth in a taxonomy tree is an ultrametric similarity | [bm:BucketMath.Learning.Sequencing.lcp_isUltra] |
| Acquiring a whole set costs the same in every order, so the nearest-next greedy order is optimal | [bm:BucketMath.Learning.Sequencing.totalCost_perm], [bm:BucketMath.Learning.Sequencing.greedy_optimal] |
| Under a budget that stops after k domains, greedy nearest-next can lose: a counterexample at k = 3 | [bm:BucketMath.Learning.Sequencing.greedy_fails_under_budget] |

Upkeep values, retention curves, base costs and taxonomy trees are inputs; cite them with `[empirical: ...]`.
