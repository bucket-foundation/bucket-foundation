# Primes

The founder's rule: a node's tier follows how prime it is. A number breaks down into its prime factors; a concept, a law, or an equation breaks down the same way. Take any node, list what it rests on, ask of each factor whether it breaks down further, and stop at the factors that do not. Those are the primes. The equals sign is the worked example: one prime that a large share of mathematics and physics contains.

The decomposition gives the graph three things. A dependency structure with irreducible ideas at the bottom. A tier for every node, set by how many layers of combination sit between it and its primes. The input for a truth level: a node built from many uncertain factors is less likely to hold than one built from a few certain ones.

Code: `src/lib/research-os/primes.ts`. Tests: `scripts/test-research-os-primes.ts`. Report over the live graph: `scripts/research-os/primes-report.ts`. Beads: the ros-prime epic in `BEADS-PENDING.jsonl`, which carries ros-25.

## Prior work

The idea has a long line, and each strand of it shapes a design choice here.

**Leibniz's characteristic numbers.** In 1679 Leibniz assigned a number to each primitive concept and built a composite concept as the product of its primitives' numbers, so that "every A is B" holds when A's number is divisible by B's. It is the founder's idea in its first form. It stalled on two points: nobody could agree on the primitives, and a single number could not carry negation, so Leibniz moved to pairs of numbers. Marshall (1977) studies this arithmetization of the syllogism. The lesson taken here: primes are provisional, found and reviewed, and the graph keeps edges with kinds and confidence instead of bare products. Marshall, P. D. (1977). Łukasiewicz, Leibniz and the arithmetization of the syllogism. *Notre Dame Journal of Formal Logic*, 18. https://doi.org/10.1305/ndjfl/1093887926

**Semantic primes.** The Natural Semantic Metalanguage program looks for meanings that every language studied can express and that resist definition in simpler words. Wierzbicka's 1996 book set out the program with about 55 of them; the list stood at 65 by 2014, among them THE SAME, OTHER, ONE, TWO, ALL, SOME, KIND, PART, BECAUSE, IF, NOT, TRUE, BEFORE, AFTER, WHEN, and WHERE. The equals sign is THE SAME written for quantities. These are the strongest empirical candidates for the bottom layer of the graph. Wierzbicka, A. (1996). *Semantics: Primes and Universals*. Oxford University Press. https://doi.org/10.1093/oso/9780198700029.001.0001. Goddard, C., and Wierzbicka, A. (2014). *Words and Meanings*. Oxford University Press. https://doi.org/10.1093/acprof:oso/9780199668434.001.0001

**Knowledge space theory.** A surmise relation says which items a learner must master before another; the feasible knowledge states follow from it, and adaptive assessment (ALEKS) runs on it. A prime here is an item with no prerequisite in the surmise relation, and a learner's standing is a knowledge state. Doignon, J.-P., and Falmagne, J.-C. (1985). Spaces for the assessment of knowledge. *International Journal of Man-Machine Studies*, 23. https://doi.org/10.1016/s0020-7373(85)80031-6. Falmagne, J.-C., and Doignon, J.-P. (2010). *Learning Spaces*. Springer. https://doi.org/10.1007/978-3-642-01039-2

**Formal concept analysis.** A concept is the pair of its extent (the things it covers) and its intent (the attributes they share), and concepts order into a lattice. Read as decomposition, a concept's intent is its set of factors, and the lattice's join and meet say which concepts combine into which. Wille, R. (1992). Concept lattices and conceptual knowledge systems. *Computers and Mathematics with Applications*, 23. https://doi.org/10.1016/0898-1221(92)90120-7

**Reverse mathematics and machine-checked proofs.** For theorems of ordinary mathematics, reverse mathematics finds the weakest axiom system that proves each one, and most fall into five systems. Metamath's `set.mm` records every theorem's proof down to its axioms, equality axioms included, so the reach of the equals sign across formal mathematics is measurable there. The mathematics branch has a ground truth this method can be checked against. Simpson, S. G. (2009). *Subsystems of Second Order Arithmetic*. Cambridge University Press. https://doi.org/10.1017/cbo9780511581007. Metamath: https://us.metamath.org/

**Prerequisite learning.** Eleven papers in the intake (`_intake/research-os-k12-literature/prerequisite-knowledge-graphs/`) bear on this work, and five of them set its rules. Trained annotators agree only moderately on whether one concept is a prerequisite of another (Alzetta and colleagues, 2018), so every proposal gets a second, independent judgment, and the agreement between the two is measured with Cohen's kappa. A resource's teaching order diverges from true prerequisite order (Manrique and colleagues, 2018), which is why the graph's primes came out as course entry points. Active learning cuts the labels a reviewer must give (Liang and colleagues, 2018), so the review queue shows the proposals with the most at stake first. Novices' concept maps lack the cross-links between branches that experts draw (Novak, 1990), so the shortlist offers factors from every branch. Link structure outside the text carries prerequisite signal (Pan and colleagues, 2017; Zhou and Xiao, 2019; Roy and colleagues, 2019), and RefD turns Wikipedia's links into a score: A rests on B when the articles A links to refer to B more than the articles B links to refer to A. That score is the judge here that no Claude model writes. ConceptNet 5.5 has a HasPrerequisite relation that can serve as a further outside check. Liang, C., Wu, Z., Huang, W., and Giles, C. L. (2015). Measuring prerequisite relations among concepts. *EMNLP*. https://doi.org/10.18653/v1/d15-1193. Cohen, J. (1960). A coefficient of agreement for nominal scales. *Educational and Psychological Measurement*, 20. https://doi.org/10.1177/001316446002000104. Efron, B. (1979). Bootstrap methods: another look at the jackknife. *Annals of Statistics*, 7. https://doi.org/10.1214/aos/1176344552. Speer, R., Chin, J., and Havasi, C. (2017). ConceptNet 5.5. *AAAI*. https://doi.org/10.1609/aaai.v31i1.11164

**Network statistics.** For the truth level and the load-bearing primes in slice 3: betweenness (Brandes, 2001, https://doi.org/10.1080/0022250x.2001.9990249), k-core decomposition (Batagelj and Zaveršnik, 2003, https://doi.org/10.48550/arxiv.cs/0310049), k-shell position as a better predictor of spreading influence than degree (Kitsak and colleagues, 2010, https://doi.org/10.1038/nphys1746), and noisy-OR and noisy-AND gates for combining uncertain causes (Oniśko, Druzdzel, and Wasyluk, 2001, https://doi.org/10.1016/s0888-613x(01)00039-1). Centrality measures disagree on which node is central (Valdez-Roldan and Masuli, 2025), so slice 3 reports several.

## Terms

| Term | Meaning |
|---|---|
| Factor | A node another node rests on. The `from` end of a `prerequisite` edge that points at the node, or the `to` end of a `derives_from` edge that leaves it. |
| Composite | A node with at least one factor. |
| Prime | A node with no factors that at least one node rests on. Irreducible in the graph as it stands. |
| Unfactored | A node with no dependency edge in either direction. The graph says nothing about its makeup yet. |
| Signature | The primes under a node, each with its multiplicity: the number of distinct factor paths that reach it. |
| Depth and tier | The longest factor path from a node down to a prime. Primes sit at tier 0; each tier combines the tiers below. |
| Penetration | For a prime, how many composites contain it and how many branches those composites span, with the Shannon entropy of the branch mix as the spread. |

The prime and unfactored states stay separate on purpose. A node with no factors looks prime only because nobody has decomposed it. Treating every factorless node as prime would put 1,277 primes at the bottom of the graph, most of them transcript facts and paper records.

## Algorithm

1. Build the factor map from `prerequisite` and `derives_from` edges, keeping the highest confidence when two edges name the same factor.
2. Find strongly connected components with an iterative Tarjan pass. A dependency cycle becomes one unit whose members share a signature. A cycle with no outside factors is a prime cluster.
3. Tarjan emits components in reverse topological order over factor links, so one pass in that order computes every signature: a prime's signature is itself with multiplicity 1, and a composite's signature is the sum of its factors' signatures. Multiplicities clamp at 10^12.
4. Penetration counts, for each prime, the composites whose signature holds it, grouped by branch.

The whole graph decomposes in one linear pass over nodes and edges. A 20,000-node chain runs in the tests without recursion.

## Results on the local graph

Run on 2026-09-18 over the local Supabase graph: 1,903 nodes and 1,109 dependency edges (841 `prerequisite`, 268 `derives_from`).

| Status | Nodes |
|---|---|
| Prime | 41 |
| Composite | 626 |
| Unfactored | 1,236 |
| In a cycle | 2 |

Tiers run from 0 to 17. Nodes per tier, tier 0 first: 41, 59, 85, 89, 58, 50, 33, 32, 21, 22, 17, 25, 35, 18, 24, 24, 25, 9.

Unfactored by kind: 484 facts, 476 primary sources, 126 concepts, 99 figures, 47 sites, 2 laws, 2 extensions.

The most penetrating primes:

| Prime | Branch | Composites containing it |
|---|---|---|
| Kinematics, describing motion | 02-physics | 113 |
| Vectors and the dot and cross product | 02-physics | 113 |
| Derivatives and integrals for physics | 02-physics | 107 |
| Equivalence principle | 06-cosmology | 86 |
| Cosmological principle | 06-cosmology | 80 |
| Boltzmann distribution | 05-biophysics | 78 |
| Gibbs free energy | 05-biophysics | 70 |
| The neuron doctrine | 07-mind | 70 |
| Sets and functions | 01-mathematics | 68 |
| The nuclear atom | 03-chemistry | 61 |

## What the results show

**The primes are course entry points.** The 41 primes are the first Academy atoms of each branch: Kinematics, Vectors, Sets and functions. Each of them decomposes further. Kinematics rests on vectors, derivatives, measurement, and equality. They are prime only because the Academy graph starts there. The decompose-further queue (ros-prime 2) is the step that splits them.

**No prime crosses a branch.** Every prime's branch spread is 0: all the composites that contain it sit in its own branch. Cross-branch links in the graph are `bridges`, and a bridge is an analogy, never a factor. Physics does not rest on mathematics anywhere in the dependency edges, even though Derivatives and integrals for physics is mathematics. The equals sign, number, set, and function belong at the bottom of every branch at once, and the graph has no node for the equals sign at all. Cross-branch factor edges are the first thing the decompose-further queue should propose.

**The deepest composites are transcript fragments.** Depth 17 is reached by `fact` nodes such as "as you are?" and "the top clock always has to run faster than every other.", sentences from interview transcripts ingested as canon facts and linked by `derives_from` to deep physics concepts. They inflate depth and would pull a truth level toward noise. The report makes them easy to list; a quality gate on facts belongs in the decompose-further review.

**Equations sit high, as expected.** Schrödinger's equation sits at depth 14 and the Einstein field equation at 13; Stoichiometry and balanced equations at 2. Depth tracks how much has to be in place before an idea makes sense.

## Slice 2: the decompose-further queue

Every prime and every unfactored idea gets decomposed by a model, checked by a second model and by Wikipedia's links, and decided by a person. Nothing a model says writes `graph.edges`; the review at `/research-os/edges` does. Runner: `scripts/research-os/decompose-further.ts`. Pure logic: `src/lib/research-os/decompose-further.ts` and `src/lib/research-os/refd.ts`. Review writes: `src/lib/research-os/inference/review-actions.ts`.

**Targets.** Idea nodes only: concepts, laws, and derivations from the Academy atoms, canon entries, references, and primary sources. Facts, primary-source records, figures, and sites are evidence. The 105 canon concept tags, the bridges, and the intake digests group other material (33 of the tags are people, such as Euler and Tesla), so they are neither targets nor factors. On the local graph that leaves 40 targets: 38 primes and 2 unfactored ideas. The first run, before this rule, asked about 166 targets, most of them tags.

**Shortlist.** Each target's candidates come from three pools: the three most basic nodes of every branch, the 25 nearest by embedding (`BAAI/bge-small-en-v1.5`, run locally), and the 10 best by a stemmed, IDF-weighted word overlap. Nodes that already rest on the target are left out. That stops a single proposal from closing a cycle; two proposals can still close one together, so the runner checks the whole pending set with the graph's own edges and flags every pair on a cycle for the reviewer.

**Three judgments.** Prerequisite judgment is subjective enough that trained annotators agree only moderately, so one model's word is not enough.

1. The proposer (Sonnet) names up to six direct factors from the shortlist, up to four missing base ideas, or says the target is irreducible and why.
2. The verifier (Opus) sees the proposer's picks mixed with as many passed-over candidates, at least two, in a seeded random order and unlabelled, and answers for each whether a learner must hold it to hold the target. Blinding keeps the verifier from rubber-stamping. The picks and the verdicts form a two-by-two table; Cohen's kappa over it, with a 95% interval from resampling targets (Efron, 1979), measures how far the two models agree beyond chance.
3. RefD over Wikipedia's links scores every pair. An Academy atom maps to the Wikipedia article its lesson cites; other nodes map by exact title when the article exists and is not a disambiguation page. The score runs over the mapped articles only, with redirects folded in. The runner reports how the score ranks the verifier's confirmed pairs against its refuted ones as a ROC area: 0.5 means the links cannot tell the verdicts apart.

Confidence follows the scale the other proposers use (`inference/calibration.ts`): 0.65 when the verifier confirmed a pair, 0.4 when it refuted it, 0.3 while unchecked. A reviewer's approval writes 0.95. Two Claude models share more failure modes than two model families would, which is the reason for the third judgment.

**Missing primes.** The base ideas the proposer names go through one more model pass that groups synonyms and spots ideas that already have a node. An idea that has a node becomes a factor proposal for every target that named it. The rest go to `graph.node_proposals` with their aliases, the targets that named them and why, and the existing nodes they may duplicate by embedding. Each is checked against the semantic primes and the foundations of mathematics (number, set, function, equality, measurement) by head noun, and a match is flagged as a hint. A later run that names the same idea reuses its key. Approving a missing prime creates a concept node at the lowest grade tier among the targets that named it and queues an unchecked factor proposal to each of them, which the next run verifies.

**Irreducible verdicts.** A target the proposer calls irreducible goes to `graph.irreducible_proposals` with the reason. A reviewer who confirms it takes the node out of later runs; one who rejects it sends it back.

**Review.** The page lists irreducible verdicts, missing primes by how many targets named them, and factor proposals grouped by target, highest impact first. Each proposal shows both judgments, the Wikipedia score, where it came from, and any cycle. The reviewer picks the edge kind: "rests on" writes a `derives_from` edge and leaves learning order alone, and "learning order" writes a `prerequisite` edge and rebuilds the routing closure. A decision claims the row first, so two reviewers cannot decide it twice, and an approval that would close a cycle in the graph is refused.

**What moves.** `scripts/research-os/primes-report.ts` keeps its last result as a baseline. Each run lists the primes that gained factors, the new primes, the nodes that joined the dependency graph, and the primes a reviewer confirmed as irreducible, with any that later gained factors flagged for a second look.

### Results

RESULTS-V2

## Next slices

1. **Truth level** (ros-prime 3, with ros-truth). A node's truth level combines its primes' standing and its factor edges' confidence. Independent factors combine as a product; shared primes count once, so two factors that rest on the same prime do not double its weight, the effective-count idea `hte` already uses for evidence. Bootstrap over edge confidences for an interval. Network statistics over the dependency graph: PageRank for load-bearing primes, betweenness for bottlenecks, k-core for the dense center, articulation points for single primes whose failure would disconnect large parts of the graph. How a claim is known, the source levels in ros-truth, sets each prime's starting standing.
2. **Surfaces** (ros-prime 4). A made-of section on the node page with the factor tree down to primes and the truth level, and map layers colored by tier, penetration, and truth level.
3. **Canon concept tags.** The 105 tags stay out of decomposition. Splitting them into the people they name and the ideas they stand for would bring the ideas back in as targets.
