# Prime Algebra

The founder's idea, 2026-09-22: treat the graph's primes as tokens, so every node is a sparse code over them and attention can run over the graph in that basis. Then write the graph as generating functions over the primes, so the combinations it has built, and the ones it has not, can be counted and ranked.

Code: `src/lib/research-os/prime-algebra.ts`, pure functions over the `Decomposition` map from `primes.ts` (terms in `PRIMES.md`). Tests: `scripts/test-research-os-prime-algebra.ts`. Page: `/research-os/primes`, sections Coverage, Unexplored combinations, Primes that travel together, Implied factors, Reach. Node page: "nearest by makeup" in the made-of section.

Notation: N composites, m_v(p) the multiplicity of prime p in node v's signature, S(v) the primes with m_v(p) > 0, df(p) the composites holding p.

## M1: Attention in the Prime Basis

idf(p) = log((N + 1) / (df(p) + 1)), after Sparck Jones.
x_v(p) = log(1 + m_v(p)) * idf(p). The log damps multiplicities, which clamp at 10^12.
score(q, v) = cos(x_q, x_v), and weight(q, v) = exp(score / tau) / sum of exp(score / tau) over candidates.

A query of several nodes sums their vectors. Candidates are composites sharing at least one prime with the query. `attend(dec, queryIds, { k, tau, tieBreak })` returns each hit's cosine, softmax weight and shared primes, the largest contribution first; equal cosines order by depth, then by the tie-break. A prime every composite holds gets idf 0 and drops out, which is the behaviour an equals-sign node needs.

The node page shows the cosine, since a softmax weight depends on how many candidates there are. Composites with the same set of primes collapse into one row, the shallowest and then the first by title shown, with "and N more with the same primes". Over the idea layer, Folding funnel's nearest row is Two-state folding equilibrium at cosine 1, with 3 more on the same primes (Anfinsen's hypothesis among them), then Contact order and folding rate at 0.96.

### Attention as a Tool

bkt-jl1v. `/research-os/attend` and `GET /api/research-os/attend` rank the idea layer against concepts a user picks (`ids`, up to 8) or a phrase (`q`, up to 200 characters). Code: `src/lib/research-os/attention.ts`; tests: `scripts/test-research-os-attention.ts`.

Each hit carries its shared primes with their terms, x_q(p) * x_v(p) / (|x_q| |x_v|). The route divides every exposed term by qn * vn, so the terms sum to the cosine the hit is ranked by. A phrase enters through the 3 ideas with the highest IDF-weighted word overlap (`lexicalScore`) at 0.1 or more, each weighted by its overlap, and their vectors are summed. It runs in pure JavaScript. By default the query nodes' factor cone is hidden: every idea above or below them in the factor graph. `cone=show` lifts that. For a private node, the cone is its public factors and everything under them. Results come from the public snapshot. A signed-in user may name a private node; `authorizeNode` must allow it, and its vector is the sum of its public factors' vectors, with a fact contracted to the ideas under it. It never comes back as a result.

**Against embedding search.** `scripts/research-os/eval-attention.ts` takes 120 Academy atoms at random from 469 with a Wikipedia mapping. Each query is the first lesson sentence that shares no word with the atom's title. The atoms split 60 for tuning and 60 held out. A node counts as relevant when its Wikipedia article links to or from the source atom's article. The source atom and its near duplicates are removed from the entries, the candidates and the relevant set: same title, title overlap of 0.8 or more, same article, or a bge-small cosine of 0.93 or more. The held-out results over 497 idea nodes, with paired bootstrap intervals over queries:

| Arm | nDCG@10 | recall@20 | nDCG@10 against embedding |
|---|---|---|---|
| Embedding search, bge-small | 0.285 | 0.238 | |
| Attention, lexical entry | 0.156 | 0.141 | -0.129, interval -0.201 to -0.051 |
| Attention, embedding entry | 0.202 | 0.167 | -0.083, interval -0.152 to -0.018 |
| Rank fusion of embedding and lexical attention | 0.237 | 0.226 | -0.049, interval -0.113 to 0.014 |

Plain embedding search wins on this relevance. Attention ranks composites alone, and it spreads a query over everything that shares its primes, while Wikipedia's links reward neighbours by topic. Tuning picked 1 lexical entry with the cone shown. The page serves to explain makeup, with the primes as the reasons for each rank. Rank fusion comes closest, and its interval includes 0. On the local stack, lexical entry takes 3.9 ms at the median and 5.3 ms at p95, and the attention pass 0.4 ms and 0.9 ms. The founder labels 20 held-out queries blind as a second check.

## M2: Leibniz Numbers and the Euler Gap

Rank primes by penetration and give them 2, 3, 5, 7 in order. A node's Leibniz number is n(v) = product of q_i over i in S(v), squarefree. Divisibility is containment.

D(s) = sum of n^(-s) over the distinct Leibniz numbers of composites.
E(s) = product over primes of (1 + q^(-s)): every subset of primes once, the empty set included.
coverage(s) = D(s) / (E(s) - 1), from 0 to 1: every nonempty subset built gives 1.

Both are summed in log space (log-sum-exp for D, log1p for E, expm1 for the minus one), so a composite on 200 primes stays finite where the plain product underflows.

The frontier: realized supports and their subsets form a simplicial complex. A minimal nonface is a set of primes no composite combines while every proper subset is combined somewhere. `frontier` lists those of size 2 and 3, each ranked by the count independence predicts, N * product of df(i) / N. Triples are only tried on triangles of combined pairs. `withinGroup` keeps the sets inside one branch; a prime with no branch is a group of its own. The primes page caches the whole report for a minute and drops it after a review decision.

## M3: Primes That Travel Together

PMI(i, j) = log(c_ij * N / (df(i) * df(j))), with c_ij the composites holding both, kept when c_ij >= 3 (Church and Hanks).

An implication {i} -> {j} holds when every composite with i also has j, over at least 3 composites: the single-premise rules of a Guigues-Duquenne basis over the composite-by-prime table. Each is a candidate factor proposal, returned as data. Nothing writes it to the graph; the decompose-further queue and a reviewer decide.

## M4: Depth Polynomials

G_p(x) = sum over d of a_(p,d) x^d, where a_(p,d) counts composites at depth d holding p.
G_p(1) is penetration, G_p'(1) / G_p(1) the mean depth of p's reach, and the degree the deepest composite on p.

## On the Local Graph

Run on 2026-09-22 over the local Supabase graph, public nodes, all factor edges: 510 composites, 41 primes, 88 distinct combinations of primes.

| Measure | Value |
|---|---|
| coverage(1) | 0.345 |
| coverage(2) | 0.854 |
| Minimal nonfaces, pairs | 668 |
| Minimal nonfaces, triples | 63 |
| Nonfaces chance predicts at least once | 253 |
| Nonfaces inside one branch | 214 |

The top unexplored combinations, the count chance predicts, seen 0:

| Primes | Expected |
|---|---|
| Boltzmann distribution + Equivalence principle | 8.9 |
| Boltzmann distribution + Kinematics | 8.8 |
| Boltzmann distribution + Vectors | 8.8 |
| Boltzmann distribution + The neuron doctrine | 8.5 |
| Gibbs free energy + Equivalence principle | 8.2 |

Every one of them crosses a branch, the finding `PRIMES.md` reports from another angle: no prime reaches outside its own branch. Inside one branch the top pair is Kinematics + "Sunlight looks white" at 1.9, a transcript fact that entered as a prime.

Primes that travel together: the time-correlation function and Kubo linear response (PMI 4.04, in 4 composites); the saddle-point method, Stirling's approximation and Lagrange multipliers pairwise (3.93, in 10). Those three occur together in every composite that holds any of them.

Implied factors: 26 implications, 10 of them mutual. Kinematics and Vectors hold the same 63 composites; every composite with Derivatives and integrals for physics (58) also holds both; every one with the Cosmological principle (58) holds the Equivalence principle. The mutual pairs are primes the Academy graph always introduces together.

Reach: Boltzmann's coefficients run 10, 27, 22, 8, 4 by depth 1 to 5, mean depth 2.6. Equivalence principle spreads from depth 1 to 16, mean 9.6. Kinematics and Vectors share one polynomial.

## M5: A Random Baseline

The count in M2 assumes primes fall on composites independently, and ignores that a composite on 12 primes has more room than one on 2. `nullFrontier` draws tables from the curveball chain (Strona et al., 2014): each trade swaps the primes two composites do not share, so every composite keeps its prime count and every prime its df. 5N trades burn in, N trades separate draws, and 1,000 draws run from a fixed seed. A nonface's p is (empty + 1) / (draws + 1), where empty counts the draws in which no composite holds the whole set; at 1,000 draws the floor is 1/1,001 and the page prints it as "<0.001". Benjamini-Hochberg at 0.05 runs over every nonface tested.

`classifyFrontier` gives each nonface one class:
- **Missing edge**: a node reaches every prime in the set once the pending pairs the verifier confirmed are added to the graph (`primeReach` over the counterfactual decomposition).
- **Real gap**: it survives that and passes Benjamini-Hochberg: the shuffles almost always combine it and the graph never does.
- **Chance**: the rest.

The primes page lists real gaps first and prints the class and p beside each row; the report counts all three. The chain runs in about 370 ms on the local graph, inside the page's one-minute cache.

**Stability.** Sourav et al. (arXiv:2605.27176) report that random and topology-based subsets of a knowledge graph recover much of the full graph's signal for hypothesis generation; one read of the abstract on 2026-09-23 is the whole basis for citing it here, and the paper tests hypothesis generation by a model, which differs from this frontier. `scripts/research-os/frontier-baseline.ts` draws 100 random subsets of the composites, classifies each against the same counterfactual, and reports the Jaccard overlap of its top 20 real gaps with the full graph's.

### On the Local Graph

Run on 2026-09-23, 510 composites, 731 nonfaces.

| Measure | Before the v6 run | After |
|---|---|---|
| Confirmed pending pairs in the counterfactual | 98 | 121 |
| Missing edge | 289 | 331 |
| Chance | 419 | 378 |
| Candidate real gap | 23 | 22, top 20 at a median Jaccard of 0.81 on 90% subsets, none on halves |

After the run, 517 of the 731 nonfaces cross a branch: 231 missing edges, 264 chance, and all 22 candidate real gaps. The top candidate is Boltzmann distribution with the Equivalence principle, expected 8.9, p <0.001, then Boltzmann with the neuron doctrine, 8.5, p <0.001. Eleven of the 22 hold the neuron doctrine and 7 the Equivalence principle. Boltzmann with Kinematics and with Vectors, second and third in M2, are missing edges: confirmed pending pairs would close them.

Subsets of 90% of the composites give a median Jaccard of 0.81 over the top 20 real gaps, from 0 to 1, with 0 to 23 real gaps a subset. Subsets of half give no real gap at all: with half the composites the expected counts halve, the null leaves more sets empty, and no p clears the correction. The real-gap list is stable to losing a tenth of the graph and needs most of it to show at all.

## References

- Sparck Jones, K. (1972). A statistical interpretation of term specificity. *Journal of Documentation*. https://doi.org/10.1108/eb026526
- Velickovic, P., et al. (2018). Graph Attention Networks. *ICLR*. arXiv:1710.10903
- Koh, P. W., et al. (2020). Concept Bottleneck Models. *ICML*. proceedings.mlr.press/v119/koh20a
- Bricken, T., et al. (2023). Towards Monosemanticity. transformer-circuits.pub/2023/monosemantic-features
- Elhage, N., et al. (2022). Toy Models of Superposition. transformer-circuits.pub/2022/toy_model
- Arora, S., Li, Y., Liang, Y., Ma, T., Risteski, A. (2018). Linear Algebraic Structure of Word Senses. *TACL*. https://doi.org/10.1162/tacl_a_00034
- Rota, G.-C. (1964). On the Foundations of Combinatorial Theory I: Theory of Mobius Functions. https://doi.org/10.1007/BF00531932
- Flajolet, P., Sedgewick, R. (2009). *Analytic Combinatorics*. https://doi.org/10.1017/CBO9780511801655
- Miller, E., Sturmfels, B. (2005). *Combinatorial Commutative Algebra*. https://doi.org/10.1007/b138602
- Ganter, B., Wille, R. (1999). *Formal Concept Analysis*. https://doi.org/10.1007/978-3-642-59830-2
- Guigues, J.-L., Duquenne, V. (1986). Familles minimales d'implications informatives. numdam MSH_1986__95__5_0
- Church, K. W., Hanks, P. (1990). Word Association Norms, Mutual Information, and Lexicography. aclanthology J90-1003
- Wu, X., Lee, M. L., Hsu, W. (2004). A Prime Number Labeling Scheme for Dynamic Ordered XML Trees. *ICDE*
- Ait-Kaci, H., et al. (1989). Efficient Implementation of Lattice Operations. *TOPLAS*. https://doi.org/10.1145/59287.59293
- Krenn, M., et al. (2023). Forecasting the future of artificial intelligence with machine learning-based link prediction in an exponentially growing knowledge network. *Nature Machine Intelligence*. https://doi.org/10.1038/s42256-023-00735-0
- Sourati, J., Evans, J. (2023). Accelerating science with human-aware artificial intelligence. *Nature Human Behaviour*. https://doi.org/10.1038/s41562-023-01648-z
- Wu, T., et al. (2022). ZeroC. *NeurIPS*. arXiv:2206.15049
- Ellis, K., et al. (2021). DreamCoder. *PLDI*. https://doi.org/10.1145/3453483.3454080
- Strona, G., Nappo, D., Boccacci, F., Fattorini, S., San-Miguel-Ayanz, J. (2014). A fast and unbiased procedure to randomize ecological binary matrices with fixed row and column totals. *Nature Communications*. https://doi.org/10.1038/ncomms5114
- Benjamini, Y., Hochberg, Y. (1995). Controlling the False Discovery Rate. *JRSS B*. https://doi.org/10.1111/j.2517-6161.1995.tb02031.x
- Sourav, S., et al. (2026). The Compressive Knowledge Graph Hypothesis. arXiv:2605.27176

## Novelty

Searches on 2026-09-22 found no prior use of a Dirichlet series and Euler product over a science concept graph, of IDF attention in a basis of reviewed irreducible concepts, or of minimal nonfaces to rank unexplored concept combinations. Each rests on a few searches. Before claiming any of it, ask CENSAI at Penn State (Vasant Honavar), Tailin Wu's lab at Westlake, and Ziming Liu.
