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
| Acquiring a whole set costs the same in every order, so every order is optimal. The model assumes each acquired domain stays held and a new domain's cost is its base minus its largest similarity to the held set | [bm:BucketMath.Learning.Sequencing.totalCost_perm], [bm:BucketMath.Learning.Sequencing.every_order_optimal] |
| Under a budget that stops after k domains, greedy nearest-next can lose: a counterexample at k = 3 | [bm:BucketMath.Learning.Sequencing.greedy_fails_under_budget] |

Upkeep values, retention curves, base costs and taxonomy trees are inputs; cite them with `[empirical: ...]`.

## Learning Literature

Bead `bkt-kkvf0`. A `claim_*` definition states an empirical claim as a hypothesis; its suffix is the work id in `learning/research/**/works.jsonl`.

| Claim | Tag |
|---|---|
| Exponential forgetting is log-linear; the power curve is strictly log-convex | [bm:BucketMath.Literature.Forgetting.exp_logLinear], [bm:BucketMath.Literature.Forgetting.pow_strictLogConvex] |
| No exponential curve matches a power curve, or data strictly log-convex at one point | [bm:BucketMath.Literature.Forgetting.exp_cannot_match_pow], [bm:BucketMath.Literature.Forgetting.ebbinghaus_data_not_exponential] |
| Power retention rises with stability and halves at t equal to stability | [bm:BucketMath.Literature.Forgetting.pow_mono_stability], [bm:BucketMath.Literature.Forgetting.pow_half_at_stability] |
| Half-life regression is the base-two exponential curve and disagrees with the power curve | [bm:BucketMath.Literature.HalfLife.hlr_is_exponential], [bm:BucketMath.Literature.HalfLife.hlr_disagrees_with_power] |
| Log half-life rises with correct answers and falls with wrong ones under sign assumptions | [bm:BucketMath.Literature.HalfLife.logHalfLife_mono_correct], [bm:BucketMath.Literature.HalfLife.logHalfLife_antitone_wrong] |
| FSRS power retention rises with stability, so the interval rises and upkeep falls | [bm:BucketMath.Literature.FsrsLink.powerRetention_mono_stability], [bm:BucketMath.Literature.FsrsLink.powerInterval_mono_stability], [bm:BucketMath.Literature.FsrsLink.powerUpkeep_antitone] |
| FSRS power retention is the power curve at nine times stability and halves at t equal to 9S | [bm:BucketMath.Literature.FsrsLink.powerRetention_is_power], [bm:BucketMath.Literature.FsrsLink.powerRetention_half] |
| Under the ridgeline band no fixed gap fits every interval; a one-year interval puts the gap at 37 to 73 days | [bm:BucketMath.Literature.Ridgeline.fixed_gap_not_optimal], [bm:BucketMath.Literature.Ridgeline.year_interval_gap] |
| Averaging two exponential learners gives a strictly log-convex group curve, reconciling Newell with Heathcote | [bm:BucketMath.Literature.PracticeLaw.averaging_yields_newell], [bm:BucketMath.Literature.PracticeLaw.mixture_not_exponential] |
| BKT learning never lowers mastery; the unlearned share after n steps is the initial share times one minus T to the n | [bm:BucketMath.Literature.Bkt.learn_ge], [bm:BucketMath.Literature.Bkt.unlearned_closed_form] |
| With guess plus slip below one, a correct answer raises belief in mastery | [bm:BucketMath.Literature.Bkt.identifiable_correct_raises] |
| Rasch item order is the same at every ability; 2PL orders can cross | [bm:BucketMath.Literature.Rasch.rasch_order_invariant], [bm:BucketMath.Literature.Rasch.twoPl_orders_cross] |
| Prerequisite-closed states form a knowledge space closed under intersection and grow one ready item at a time | [bm:BucketMath.Literature.KnowledgeSpace.quasiOrdinal_is_space], [bm:BucketMath.Literature.KnowledgeSpace.closed_inter], [bm:BucketMath.Literature.KnowledgeSpace.add_ready] |
| Coverage rises with the known set; 98% coverage leaves at most one unknown token in 50, 95% one in 20 | [bm:BucketMath.Literature.Coverage.covered_mono], [bm:BucketMath.Literature.Coverage.ninetyEight_unknown_density], [bm:BucketMath.Literature.Coverage.ninetyFive_unknown_density] |
| ACT-R strength rises with each practice and decays with waiting | [bm:BucketMath.Literature.Actr.strength_practice], [bm:BucketMath.Literature.Actr.strength_decays] |
| Neither the power nor the exponential curve stays flat as permastore requires; past permastore the interval reaches the horizon and upkeep is least | [bm:BucketMath.Literature.Permastore.pow_never_flat], [bm:BucketMath.Literature.Permastore.exp_never_flat], [bm:BucketMath.Literature.Permastore.permastore_upkeep_min] |
