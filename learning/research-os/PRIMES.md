# Primes

The founder's rule: a node's tier follows how prime it is. A number breaks down into its prime factors; a concept, a law, or an equation breaks down the same way. Take any node, list what it rests on, ask of each factor whether it breaks down further, and stop at the factors that do not. Those are the primes. The equals sign is the worked example: one prime that a large share of mathematics and physics contains.

The decomposition gives the graph three things. A dependency structure with irreducible ideas at the bottom. A tier for every node, set by how many layers of combination sit between it and its primes. The input for a truth level: a node built from many uncertain factors is less likely to hold than one built from a few certain ones.

Code: `src/lib/research-os/primes.ts`. Tests: `scripts/test-research-os-primes.ts`. Report over the live graph: `scripts/research-os/primes-report.ts`. Beads: the ros-prime epic in `BEADS-PENDING.jsonl`, which carries ros-25.

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

## Next slices

1. **Decompose further** (ros-prime 2). For every prime and every unfactored concept, propose factors with the local engine's `claude -p` path, including factors in other branches, and write them as low-confidence proposed edges routed to the existing edge review. Seed the bottom layer with the primes the graph lacks: equality, number, set, function, measurement, cause.
2. **Truth level** (ros-prime 3, with ros-truth). A node's truth level combines its primes' standing and its factor edges' confidence. Independent factors combine as a product; shared primes count once, so two factors that rest on the same prime do not double its weight, the effective-count idea `hte` already uses for evidence. Bootstrap over edge confidences for an interval. Network statistics over the dependency graph: PageRank for load-bearing primes, betweenness for bottlenecks, k-core for the dense center, articulation points for single primes whose failure would disconnect large parts of the graph. How a claim is known, the source levels in ros-truth, sets each prime's starting standing.
3. **Surfaces** (ros-prime 4). A made-of section on the node page with the factor tree down to primes and the truth level, and map layers colored by tier, penetration, and truth level.
