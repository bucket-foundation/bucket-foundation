# Prime Algebra

The founder's idea, 2026-09-22: treat the graph's primes as tokens, so every node is a sparse code over them and attention can run over the graph in that basis. Then write the graph as generating functions over the primes, so the combinations it has built, and the ones it has not, can be counted and ranked.

Code: `src/lib/research-os/prime-algebra.ts`, pure functions over the `Decomposition` map from `primes.ts` (terms in `PRIMES.md`). Tests: `scripts/test-research-os-prime-algebra.ts`. Page: `/research-os/primes`, sections Coverage, Unexplored combinations, Primes that travel together, Implied factors, Reach. Node page: "nearest by makeup" in the made-of section.

Notation: N composites, m_v(p) the multiplicity of prime p in node v's signature, S(v) the primes with m_v(p) > 0, df(p) the composites holding p.

## M1: Attention in the Prime Basis

idf(p) = log((N + 1) / (df(p) + 1)), after Sparck Jones.
x_v(p) = log(1 + m_v(p)) * idf(p). The log damps multiplicities, which clamp at 10^12.
score(q, v) = cos(x_q, x_v), and weight(q, v) = exp(score / tau) / sum of exp(score / tau) over candidates.

A query of several nodes sums their vectors. Candidates are composites sharing at least one prime with the query. `maskToCone` keeps only the seed nodes' factor cone, everything above and below them, the way graph attention masks to neighbours. `attend(dec, queryIds, { k, tau, maskToCone })` returns each hit's weight, cosine and shared primes, the largest contribution first. A prime every composite holds gets idf 0 and drops out, which is the behaviour an equals-sign node needs.

On the node page, over the idea layer: Folding funnel's nearest are Anfinsen's hypothesis, the mutational stability change and two-state folding at cosine 1 (weight 0.19 each at tau 0.1), then amyloid aggregation at 0.99.

## M2: Leibniz Numbers and the Euler Gap

Rank primes by penetration and give them 2, 3, 5, 7 in order. A node's Leibniz number is n(v) = product of q_i over i in S(v), squarefree, a bigint. Divisibility is containment.

D(s) = sum of n^(-s) over the distinct Leibniz numbers of composites.
E(s) = product over primes of (1 + q^(-s)): every subset of primes once.
coverage(s) = D(s) / E(s), at most 1 because each distinct number counts once.

Both are summed in log space (log-sum-exp for D, log1p for E), so a composite on 200 primes stays finite where the plain product underflows.

The frontier: realized supports and their subsets form a simplicial complex. A minimal nonface is a set of primes no composite combines while every proper subset is combined somewhere. `frontier` lists those of size 2 and 3, each ranked by the count independence predicts, N * product of df(i) / N. Passing each prime's branch restricts the list to sets inside one branch.

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
| coverage(1) | 0.285 |
| coverage(2) | 0.292 |
| Minimal nonfaces, pairs | 668 |
| Minimal nonfaces, triples | 63 |
| Nonfaces independence expects at least once | 253 |
| Nonfaces inside one branch | 214 |

The top unexplored combinations, expected count under independence, seen 0:

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

## Novelty

Searches on 2026-09-22 found no prior use of a Dirichlet series and Euler product over a science concept graph, of IDF attention in a basis of reviewed irreducible concepts, or of minimal nonfaces to rank unexplored concept combinations. Each rests on a few searches. Before claiming any of it, ask CENSAI at Penn State (Vasant Honavar), Tailin Wu's lab at Westlake, and Ziming Liu.
