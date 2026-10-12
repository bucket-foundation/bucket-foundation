<!-- voice-ignore-file: family titles are quoted from the claimant's catalogue -->
# Rows Of openai-math-2026-10

Built by `python3 claims_build.py` from `claims/openai-math-2026-10.map.tsv` and the catalogue of https://github.com/openai/math at commit `fd4aeeb2e`. Lean scope compares the machine-checked statement with the statement claimed for the row. No entry carries a confirmation.

## Rows Marked Claimed

79 rows. The family claims the row's problem in full. Status `claimed`, counted as open.

| Row | Family | Lean scope | Why |
|---|---|---|---|
| `wp-hilbert-s-tenth-problem-over-the-field-of-rational-numbers` | 004 Hilbert’s tenth problem over ℚ | none | The catalogue states undecidability of rational zeros of integer polynomials, which is the row. |
| `fc-wikipedia-irrational-irrational-catalanconstant` | 005 Irrationality of Catalan’s constant | full | Irrationality of Catalan's constant is the row. |
| `fc-wikipedia-ellipticcurverank-goldfeld-conjecture` | 006 Goldfeld’s conjecture: densities and mean analytic rank | none | The claim is stated for analytic rank. The row uses Mordell-Weil rank, which equals analytic rank at rank zero and one by Gross-Zagier and Kolyvagin. |
| `fc-wikipedia-ellipticcurverank-goldfeld-conjecture-squarefree` | 006 Goldfeld’s conjecture: densities and mean analytic rank | none | The claim orders signed squarefree twists by absolute value, the convention of this row. Analytic rank is claimed; Mordell-Weil rank follows at rank zero and one by Gross-Zagier and Kolyvagin. |
| `wp-do-siegel-zeros-exist` | 003 The quasi-Riemann hypothesis | full | The 7/8 half-plane and the companion paper on Landau-Siegel zeros exclude a real zero within c over log q of one. SiegelZeros.lean states the uniform gap for every primitive real character. Real zeros elsewhere in the unit interval are outside it, and they are outside the row too. |
| `fc-wikipedia-flintcooksonhills-flint-hills-series-converges` | 017 The irrationality exponent of π is 2 | narrower | The catalogue lists convergence of the Flint Hills series as a consequence of the irrationality exponent of pi being two. PiExponent.lean proves the irrationality exponent. The scope note places the convergence consequence outside the selected statement. |
| `wp-artin-s-conjecture-on-primitive-roots` | 029 Primitive roots for every admissible integer base | none | The row states infinitude for every base that is neither a square nor minus one, which is what the catalogue claims. The density formula is unclaimed. |
| `wp-nagata-s-conjecture-on-curves` | 039 Nagata’s conjecture and maximal Seshadri constants | full | The strict inequality for every curve through at least ten very general points is the row. |
| `wp-nagatabiran-conjecture` | 039 Nagata’s conjecture and maximal Seshadri constants | full | Maximal multipoint Seshadri constants on every smooth polarized surface for large r is the row. MaximalSeshadriConstants.lean covers smooth complex projective surfaces, the case the row states. |
| `fc-arxiv-2208-14736-zariskicancellation-zariski-cancellation-pr` | 047 Zariski cancellation and affine fibrations over the complex numbers | full | A complex fourfold whose product with the line is affine five-space refutes cancellation for the polynomial ring in four variables in characteristic zero. |
| `wp-zariskilipman-conjecture` | 048 A characteristic-zero counterexample to Lipman–Zariski | none | A singular normal complex surface with free tangent sheaf refutes the row. |
| `wp-zariski-multiplicity-conjecture-on-the-topological-equisingu` | 059 Counterexamples to Zariski’s multiplicity conjecture | none | Homeomorphic hypersurface germs of different multiplicity refute the row. |
| `wp-the-brennan-conjecture` | 072 Brennan's conjecture and the integral-means spectrum | full | Area integrability on the interval from 4/3 to 4 is the row. |
| `fc-wikipedia-brennanconjecture-brennan-universalspectrum` | 072 Brennan's conjecture and the integral-means spectrum | full | The spectrum value at minus two equal to one is the row. |
| `wp-falconer-s-conjecture` | 073 The Falconer distance conjecture | full | Positive measure of the distance set above dimension d over two in every dimension is the row. |
| `fc-wikipedia-falconer-falconer-conjecture` | 073 The Falconer distance conjecture | full | The all-dimensional statement is the row. |
| `fc-wikipedia-falconer-falconer-conjecture-two` | 073 The Falconer distance conjecture | full | The planar case is one of the two linked Lean statements. |
| `wp-mahler-s-conjecture-on-the-product-of-the-volumes-of-a-centr` | 087 The Mahler conjectures, functional inequalities and polar-product symplectic width | full | The symmetric volume product bound in every dimension is the row. MahlerConjecture.lean and SymmetricMahlerEquality.lean cover the symmetric case with equality. The functional inequalities are outside. |
| `uniquegames` | 102 The Unique Games Conjecture and optimal approximation thresholds | full | The catalogue claims Khot's conjecture. UniqueGamesTheorem.lean states a polynomial-time reduction from 3SAT with completeness one minus epsilon and soundness delta over a fixed alphabet. |
| `wp-l-rl-problem` | 103 Exact derandomization of logarithmic space: \mathsf L=\mathsf{RL}=\mathsf{BPL} | full | Equality of L and RL is the row. LogspaceEquality.lean states equality of the language classes in one explicit Turing machine model. The compiler and its running-time bounds are outside. |
| `wp-can-the-fast-fourier-transform-be-computed-in-time` | 130 Exact Fourier transforms below n\log n | full | The source list asks for o(n log n); the atlas row lost the bound at ingestion. The claim gives n times log n to the power one minus 10^-13 at every length. UniformFourier.lean covers every length in a model with exact complex arithmetic, unrestricted coefficients and a supplied root of unity. Bit complexity is outside. |
| `fc-paper-strongsensitivityconjecture-strong-sensitivity-conject` | 132 A superquadratic separation of sensitivity and block sensitivity | full | Block sensitivity above sensitivity to a power greater than two refutes the row. |
| `wp-generalized-star-height-problem` | 134 Generalized star height at most three | full | The row asks whether a bounded nesting depth suffices. The claim gives depth three for every regular language. The least depth stays open. |
| `wp-banach-s-problem-is-there-an-ergodic-system-with-simple-lebe` | 144 Banach’s simple Lebesgue-spectrum problem | full | An ergodic diffeomorphism of the three-torus with simple Lebesgue spectrum answers the row. |
| `wp-rokhlin-s-multiple-mixing-problem-are-all-strongly-mixing-sy` | 145 Rokhlin’s multiple-mixing problem | full | Mixing of all finite orders for every mixing transformation answers the row. |
| `wp-the-hadwiger-conjecture-relating-coloring-to-clique-minors` | 157 Graph coloring, clique minors, and Colin de Verdière invariants | full | Graphs whose chromatic number exceeds their largest clique minor refute the row. HadwigerCounterexample.lean covers the ordinary chromatic form. The fractional strengthening is outside. |
| `fc-erdosproblems-3-erdos-3` | 159 Erdős’s reciprocal-sum conjecture and quasipolynomial Szemerédi bounds | full | Arithmetic progressions of every length in a set with divergent reciprocal sum is the row. ErdosReciprocal.lean states the reciprocal-sum consequence, which is the row. The paper's quantitative bound is outside it. |
| `fc-erdosproblems-142-erdos-142-lower` | 159 Erdős’s reciprocal-sum conjecture and quasipolynomial Szemerédi bounds | narrower | The quantitative bound N exp(-c (log N)^e) is o(N / log N), which is the row. The scope note places the quantitative bound outside the selected Lean statement. |
| `fc-erdosproblems-138-erdos-138` | 160 Superexponential van der Waerden numbers | full | The k-th root of the van der Waerden number tending to infinity is the row. |
| `wp-sidorenko-s-conjecture-on-homomorphism-densities-of-graphs-i` | 161 Counterexamples to Sidorenko’s conjecture and the forcing conjecture | full | A bipartite graph on 35 vertices with density below the random count refutes the row. |
| `fc-wikipedia-sidorenkoconjecture-sidorenko-conjecture` | 161 Counterexamples to Sidorenko’s conjecture and the forcing conjecture | full | A finite host graph with density below the bound refutes the row. |
| `fc-wikipedia-sidorenkoconjecture-sidorenko-conjecture-graphon` | 161 Counterexamples to Sidorenko’s conjecture and the forcing conjecture | narrower | A finite host graph is a step graphon, so the graph counterexample refutes the graphon form. SidorenkoCounterexample.lean states the finite graph form. The passage to graphons is outside it. |
| `wp-ryser-s-conjecture-relating-the-maximum-matching-size-and-mi` | 162 Counterexamples to Ryser’s covering conjecture | full | Intersecting r-partite hypergraphs with covering number r refute the row. |
| `fc-erdosproblems-172-erdos-172` | 164 Hindman’s finite sums and products conjecture | none | Monochromatic sets of every finite size closed under subset sums and products is the row. |
| `wp-turan-s-brick-factory-problem` | 165 The Harary–Hill and Zarankiewicz crossing-number formulas | full | Zarankiewicz's formula for every complete bipartite graph answers the row. |
| `wp-crossing-number` | 165 The Harary–Hill and Zarankiewicz crossing-number formulas | full | Hill's formula for every complete graph answers the row. |
| `fc-erdosproblems-1083-erdos-1083` | 166 The higher-dimensional Erdős distinct-distances conjecture | none | A lower bound of order n to the 2/d, which matches the grid upper bound, answers the row. |
| `fc-erdosproblems-181-erdos-181` | 171 The hypercube Ramsey conjecture | none | A Ramsey number of the hypercube of order 2^n is the row. |
| `wp-the-second-neighborhood-problem` | 173 Seymour’s second-neighborhood conjecture | full | A vertex with second neighbourhood at least as large as the first in every oriented graph is the row. |
| `wp-ryser-s-conjecture-on-circulant-hadamard-matrices` | 179 The circulant Hadamard and Barker-sequence conjectures | full | Circulant Hadamard matrices exist in orders one and four alone, which is the row. |
| `fc-arxiv-2402-13202-circulanthadamard-circulant-hadamard-conjec` | 179 The circulant Hadamard and Barker-sequence conjectures | full | Circulant Hadamard matrices exist in orders one and four alone, which is the row. |
| `fc-arxiv-2104-00502-barkersequence-barker-conjecture` | 179 The circulant Hadamard and Barker-sequence conjectures | narrower | The catalogue lists the Barker lengths, none above 13, which is the row. EvenBarker.lean covers even lengths. The scope note places odd lengths outside the selected statement. |
| `wp-barnette-s-conjecture` | 180 Barnette’s Hamiltonian-cycle conjecture | full | A Hamiltonian cycle in every cubic bipartite 3-connected planar graph is the row. |
| `fc-erdosproblems-184-erdos-184` | 181 The Erdős–Gallai cycle-decomposition conjecture | full | A decomposition into O(n) cycles and edges is the row. |
| `fc-erdosproblems-551-erdos-551` | 189 Cycle–clique Ramsey numbers | full | The cycle-clique Ramsey formula for k at least n at least three is the row. |
| `wp-serre-s-positivity-conjecture` | 193 Serre’s intersection-multiplicity conjecture | none | Strict positivity over every regular local ring, mixed characteristic included, is the row. |
| `fc-wikipedia-serremultiplicityconjectures-intersectionmultiplic-3` | 193 Serre’s intersection-multiplicity conjecture | none | Strict positivity for finitely generated modules is the row. |
| `fc-wikipedia-serremultiplicityconjectures-intersectionmultiplic-4` | 193 Serre’s intersection-multiplicity conjecture | none | The prime ideal form is a case of the module statement the catalogue claims. |
| `fc-wikipedia-smallcohenmacaulaymodules-exists-issmallcohenmacau` | 195 A counterexample to the small Cohen–Macaulay module conjecture | narrower | A complete local domain with no maximal Cohen-Macaulay module refutes the row. The scope note says the Lean file verifies that the candidate ring exists and does not prove that it lacks a maximal Cohen-Macaulay module. |
| `fc-wikipedia-kaplansky-zero-divisor-conjecture` | 196 A counterexample to Kaplansky’s zero-divisor conjecture | full | A torsion-free group whose group algebra over the field of two elements has zero divisors refutes the row. |
| `wp-is-every-group-surjunctive` | 197 A torsion-free group algebra that is not directly finite | narrower | The catalogue lists injective cellular automata that are not surjective, which answers the row. The Lean statements give failure of direct finiteness. The cellular automaton statement is outside the scope note. |
| `fc-wikipedia-surjunctivegroup-gottschalk-surjunctivity-conjectu` | 197 A torsion-free group algebra that is not directly finite | narrower | The catalogue lists injective cellular automata that are not surjective, which refutes the row. The Lean statements give failure of direct finiteness. The cellular automaton statement is outside the scope note. |
| `fc-paper-auslanderreiten-auslander-reiten` | 199 Counterexamples to Auslander–Reiten, Tachikawa and related homological conjectures | full | A finite-dimensional algebra with a nonprojective module of vanishing Ext refutes the row. |
| `wp-finite-lattice-representation-problem` | 206 Finite lattice representation and undecidability | narrower | A finite lattice that is no congruence lattice of a finite algebra answers the row. FiniteCongruenceGraph.lean proves an equivalence with a graph criterion. The negative answer is outside the selected statement. |
| `wp-shelah-s-eventual-categoricity-conjecture` | 240 Shelah's eventual categoricity and the prescribed-threshold obstruction | narrower | Eventual categoricity in ZFC is the row. CHObstruction.lean covers the obstruction under the continuum hypothesis. The scope note says the eventual categoricity theorem is not included. |
| `wp-does-the-partition-principle-pp-imply-the-axiom-of-choice-ac` | 244 The Partition Principle does not imply Choice | full | A model of ZF with the Partition Principle and without Choice answers the row. PartitionConsistency.lean states relative consistency from the consistency of ZF. |
| `wp-barendregtgeuversklop-conjecture` | 245 Weak normalization implies strong normalization in pure type systems | full | Weak normalization implying strong normalization in every pure type system is the row. |
| `wp-is-every-finitely-presented-periodic-group-finite` | 247 An infinite finitely presented residually finite 2-group and a finitely presented nil algebra | full | An infinite finitely presented periodic group answers the row. |
| `wp-eilenbergganea-conjecture` | 249 A finitely generated Eilenberg–Ganea counterexample | full | A group of cohomological dimension two and geometric dimension three refutes the row. |
| `fc-openquantumproblems-13-mutuallyunbiasedbases-dim6` | 266 Exactly three mutually unbiased bases in dimension six | narrower | Three as the maximal number of mutually unbiased bases in dimension six is the row. The scope note says the Lean file proves an upper bound of five and does not establish three. |
| `wp-baumconnes-conjecture` | 285 Counterexamples to Baum–Connes and Kadison–Kaplansky | none | Failure of injectivity and of surjectivity of the assembly map refutes the row. |
| `wp-hilbertsmith-conjecture` | 304 The Hilbert–Smith conjecture in every dimension | none | Every locally compact group acting faithfully on a connected manifold is a Lie group, which is the row. |
| `fc-hilbertproblems-5-hilbert-smith-conjecture` | 304 The Hilbert–Smith conjecture in every dimension | none | Every locally compact group acting faithfully on a connected finite-dimensional manifold is a Lie group, which is the row. |
| `fc-hilbertproblems-5-hilbert-smith-padic-formulation` | 304 The Hilbert–Smith conjecture in every dimension | none | The row records its own equivalence with the conjecture the catalogue claims. |
| `wp-borel-conjecture` | 320 Nonhomeomorphic closed aspherical four-manifolds | none | Homotopy equivalent closed aspherical four-manifolds that are not homeomorphic refute the row. |
| `wp-cartanhadamard-conjecture` | 337 Sharp Cartan–Hadamard isoperimetry and rigidity | full | The sharp isoperimetric comparison in every dimension is the row. SharpCAT0Filling.lean states the sharp Euclidean filling inequality for integral cycles of dimension at least two in proper CAT(0) spaces, which the scope note calls the integral-current form of the conjecture. The negative curvature comparison is outside. |
| `wp-nearby-lagrangian-conjecture` | 340 A counterexample to the nearby Lagrangian conjecture | none | A closed exact Lagrangian that is not Hamiltonian isotopic to the zero section refutes the row. |
| `wp-regularity-of-solutions-of-vlasovmaxwell-equations` | 362 Global smoothness for relativistic Vlasov–Maxwell | full | The row names no system. The claim is global smooth solutions for the three-dimensional one-species relativistic system with compactly supported density, the standard form of the problem. |
| `fc-paper-degiorgi-degiorgi-eight` | 375 De Giorgi's conjecture in dimension eight | none | The conjecture in dimension eight is the row. |
| `wp-the-gaussian-moat-problem` | 028 Uniformly bounded components of Gaussian-prime graphs | full | No infinite walk through distinct Gaussian primes with bounded steps answers the row. |
| `fc-erdosproblems-952-erdos-952` | 028 Uniformly bounded components of Gaussian-prime graphs | full | No infinite sequence of distinct Gaussian primes with bounded gaps answers the row. |
| `fc-erdosproblems-371-erdos-371` | 012 Independent largest prime factors of consecutive integers | full | Density one half for the set where the largest prime factor increases is the row. |
| `fc-erdosproblems-416-erdos-416-parts-i` | 024 An asymptotic formula for the number of totients | full | V(cx)/V(x) tending to c at c equal to two is the row. |
| `fc-erdosproblems-416-erdos-416-parts-ii` | 024 An asymptotic formula for the number of totients | full | An asymptotic equivalent for V(x) answers the row. |
| `fc-erdosproblems-431-erdos-431` | 013 Ostmann’s inverse Goldbach conjecture | full | No finite modification of the primes is a sumset of two sets with at least two elements each, which answers the row. |
| `fc-erdosproblems-821-erdos-821` | 011 Prime-factor statistics of p-1 | none | Infinitely many n with more than n^(1-e) totient preimages is the row. |
| `fc-erdosproblems-968-erdos-968` | 026 Positive lower density of large prime gaps | full | Positive lower density of the indices where p_n / n increases is the row. |
| `fc-erdosproblems-304-upper-bound` | 025 Short Egyptian fractions | full | Every a/b is a sum of O(log log b) distinct unit fractions, which is the row. |
| `fc-erdosproblems-1150-erdos-1150` | 076 Real ultraflat Littlewood polynomials and unbounded binary merit factors | full | Sign polynomials with maximum modulus (1 + o(1)) sqrt(n) at every large length answer the row in the negative. |

## Special Cases

23 rows. The family claims part of the row. Status unchanged; the entry is a note on the row.

| Row | Family | Lean scope | Why |
|---|---|---|---|
| `wp-for-which-number-fields-does-hilbert-s-tenth-problem-hold` | 004 Hilbert’s tenth problem over ℚ | none | The claim covers the field of rationals. The row asks about every number field. |
| `bsd` | 002 The full BSD formula from low Selmer corank | none | Full formula for curves whose Selmer group has corank zero or one at some prime. The conjecture in general stays open. |
| `wp-zilberpink-conjecture` | 016 Zilber–Pink in abelian varieties and the Siegel threefold | none | Abelian varieties and the curve case in the Siegel threefold. The row covers mixed Shimura and semiabelian varieties. |
| `wp-section-conjecture` | 019 The local p-adic section conjecture and global consequences | none | The p-adic local statement and modular curves over the rationals. The row covers finitely generated fields. |
| `fc-wikipedia-artinprimitiverootsconjecture-artin-primitive-root` | 029 Primitive roots for every admissible integer base | none | The row asks for positive density. The claim gives infinitude with a lower bound of order x over log squared x. |
| `hodge` | 032 The rational Hodge conjecture for CM abelian varieties | none | The rational Hodge conjecture for CM abelian varieties. The conjecture in general stays open. Three manuscripts on Weil classes and K3 surfaces were withdrawn on 2026-10-07. |
| `wp-fujita-conjecture` | 038 Fujita’s freeness conjecture | none | The freeness half at m at least n plus one. The very ampleness half is unclaimed. |
| `wp-abundance-conjecture` | 034 Log abundance for compact Kähler spaces under logarithmic Iitaka subadditivity | none | Log abundance for compact Kahler spaces under an Iitaka subadditivity hypothesis. Six manuscripts in this group were revised on 2026-10-07. |
| `wp-virasoro-conjecture` | 065 Virasoro constraints for complete intersections and projective-bundle towers | none | Complete intersections and projective bundle towers. The row covers every smooth projective variety. |
| `wp-kakeya-conjecture` | 074 Kakeya in three and four dimensions | none | The maximal conjecture in dimension three and Hausdorff dimension in dimension four. Higher dimensions are unclaimed. |
| `fc-wikipedia-kakeya-kakeya-set-conjecture` | 074 Kakeya in three and four dimensions | none | Hausdorff dimension in dimension four. The row covers every dimension. |
| `wp-the-gnrs-conjecture-on-whether-minor-closed-graph-families-h` | 089 Bounded-distortion L1 embeddings of planar and bounded-treewidth graphs | full | Planar and bounded-treewidth graphs. The row covers every minor-closed family. |
| `hilbert-16` | 143 Hilbert's sixteenth problem: uniform bounds for limit cycles | narrower | A uniform bound on limit cycles by degree. The oval-arrangement half and the value of the bound stay open. QuinticLienard.lean proves the count of two for quintic Lienard systems, which is a special case of the catalogue statement. |
| `wp-hilbert-s-sixteenth-problem` | 143 Hilbert's sixteenth problem: uniform bounds for limit cycles | narrower | A uniform bound on limit cycles by degree. The row asks about configurations of ovals of M-curves. QuinticLienard.lean proves the count of two for quintic Lienard systems. |
| `wp-birkhoff-conjecture-if-a-billiard-table-is-strictly-convex-a` | 147 The near-boundary Birkhoff conjecture | none | The near-boundary form, which assumes a foliated annulus by invariant curves. The row assumes integrability alone. |
| `fc-wikipedia-borsukconjecture-borsuk-conjecture` | 156 Borsuk's conjecture fails in dimension nine | full | A counterexample in dimension nine refutes one case of the range four to sixty-two. Dimensions four to eight stay open. |
| `wp-kaplansky-s-conjectures` | 196 A counterexample to Kaplansky’s zero-divisor conjecture | full | The zero-divisor conjecture is one of several under this name. The row names no single statement. |
| `fc-paper-eisenbudgreenharris-eisenbud-green-harris` | 200 Eisenbud–Green–Harris and lex-plus-powers | none | Fields of characteristic zero. The row names no restriction on the field. |
| `fc-wikipedia-kaplansky-idempotent-conjecture` | 207 The ℓ¹-Bass conjecture for all discrete groups | full | Characteristic-zero domains. The row names no restriction on the field. |
| `fc-arxiv-math-0703548-farrelljonesconsequences-bass-conjecture` | 207 The ℓ¹-Bass conjecture for all discrete groups | narrower | Characteristic-zero domains. The row covers every commutative integral domain. The Lean statement is the complex Bass trace conjecture. Other characteristic-zero domains are outside the note. |
| `wp-the-cosmic-censorship-hypothesis-and-the-chronology-protecti` | 264 Strong cosmic censorship near two-ended Kerr data | none | A local genericity statement near two-ended Kerr data. The hypothesis in general stays open. |
| `fc-paper-degiorgi-degiorgi-le-eight` | 375 De Giorgi's conjecture in dimension eight | none | Dimension eight. Dimensions four to seven are not named in the catalogue. |
| `fc-erdosproblems-120-erdos-120` | 084 The geometric case of the Erdős similarity conjecture | narrower | Geometric progressions. The row covers every infinite set. DyadicAvoidance.lean covers ratio one half. The catalogue claims every ratio. |

## Weaker Bounds

16 rows. The family claims a bound short of the value or statement the row asks for. Status unchanged; the entry is a note on the row.

| Row | Family | Lean scope | Why |
|---|---|---|---|
| `riemann` | 003 The quasi-Riemann hypothesis | full | A zero-free half-plane to the right of 7/8. The critical line statement stays open. |
| `wp-generalized-riemann-hypothesis` | 003 The quasi-Riemann hypothesis | full | A zero-free half-plane to the right of 7/8 for every Dirichlet L-function. The hypothesis stays open. |
| `matmul` | 107 Matrix multiplication with exponent at most 9/4 | full | An upper bound of 9/4 on the exponent over the complex numbers. The value of the exponent stays open. |
| `wp-what-is-the-fastest-algorithm-for-matrix-multiplication` | 107 Matrix multiplication with exponent at most 9/4 | full | An upper bound of 9/4 on the exponent over the complex numbers. The fastest algorithm stays open. |
| `wp-borsuk-s-problem-on-upper-and-lower-bounds-for-the-number-of` | 156 Borsuk's conjecture fails in dimension nine | full | A counterexample in dimension nine. Bounds in other dimensions stay open. |
| `unitdist` | 158 The Euclidean plane cannot be colored with five colors | full | A lower bound of six. The chromatic number of the plane is six or seven. |
| `wp-the-hadwigernelson-problem-on-the-chromatic-number-of-unit-d` | 158 The Euclidean plane cannot be colored with five colors | full | A lower bound of six. The chromatic number of the plane is six or seven. |
| `fc-erdosproblems-508-hadwigernelsonproblem` | 158 The Euclidean plane cannot be colored with five colors | full | A lower bound of six. The chromatic number of the plane is six or seven. |
| `fc-erdosproblems-142-erdos-142` | 159 Erdős’s reciprocal-sum conjecture and quasipolynomial Szemerédi bounds | narrower | An upper bound for r_k(N). The row asks for an asymptotic formula. The scope note places the quantitative bound outside the selected Lean statement. |
| `wp-determine-growth-rate-of-rk-n-see-szemeredi-s-theorem` | 159 Erdős’s reciprocal-sum conjecture and quasipolynomial Szemerédi bounds | narrower | An upper bound for r_k(N). The growth rate stays open. The scope note places the quantitative bound outside the selected Lean statement. |
| `wp-the-values-of-the-van-der-waerden-numbers` | 160 Superexponential van der Waerden numbers | full | A lower bound. The values stay open. |
| `wp-how-many-unit-distances-can-be-determined-by-a-set-of-points` | 167 Planar distinct distances and unit-distance bounds | full | An upper bound of n to the 4/3 minus delta. The count stays open. |
| `wp-finding-matching-upper-and-lower-bounds-for-k-sets-and-halvi` | 183 Power savings for planar halving lines and k-sets | full | A power saving in the upper bound. Matching bounds stay open. |
| `wp-improving-lower-and-upper-bounds-for-the-heilbronn-triangle` | 191 A power improvement in the Heilbronn triangle lower bound | narrower | A power improvement in the lower bound. The exponent stays open. The Lean construction covers an unbounded sequence of sizes. The scope note says the statement for every large n is broader. |
| `fc-erdosproblems-148-erdos-148` | 025 Short Egyptian fractions | full | log log F(k) of order k. The row asks for good estimates of F(k). |
| `fc-erdosproblems-970-erdos-970` | 021 A quadratic bound for Jacobsthal’s function | full | The bound h(k) of order at most k squared. The row also asks for the order of magnitude, which the scope note says is not determined. |

## Related Statements

11 rows. The family claims a neighbouring statement. Status unchanged.

| Row | Family | Lean scope | Why |
|---|---|---|---|
| `op-is-the-k-server-conjecture-true` | 110 Optimal-order randomized k-server on arbitrary metrics | full | A randomized competitive ratio of order log squared k. The row is the deterministic conjecture with ratio exactly k. |
| `wp-can-parity-games-be-solved-in-polynomial-time` | 104 Quasipolynomial algorithms for mean-payoff, stochastic and parity games | full | Quasipolynomial algorithms. The row asks for polynomial time. |
| `wp-can-the-edit-distance-between-two-strings-of-length-be-compu` | 121 Almost-linear approximation of edit distance | full | An almost-linear approximation. The row asks for exact computation in strongly subquadratic time. |
| `wp-hilbertarnold-problem-is-there-a-uniform-bound-on-limit-cycl` | 143 Hilbert's sixteenth problem: uniform bounds for limit cycles | narrower | Polynomial planar fields. The row is about generic finite-parameter families on the sphere. QuinticLienard.lean proves the count of two for quintic Lienard systems. |
| `cosmiccensor` | 264 Strong cosmic censorship near two-ended Kerr data | none | Strong cosmic censorship near Kerr. The row is weak cosmic censorship. |
| `invsubspace` | 293 Invariant projections, hyperinvariant subspaces, and transitive algebras | full | An operator with no hyperinvariant subspace. An invariant subspace for a single operator on Hilbert space stays open. |
| `wp-invariant-subspace-problem-does-every-bounded-operator-on-a` | 293 Invariant projections, hyperinvariant subspaces, and transitive algebras | full | An operator with no hyperinvariant subspace. The row asks about invariant subspaces. |
| `wp-novikov-conjecture` | 307 Failure of rational injectivity for maximal coarse assembly | full | Failure of the rational coarse Novikov conjecture. The row is the Novikov conjecture for manifolds. |
| `wp-arnoldgivental-conjecture-and-arnold-conjecture-relating-sym` | 347 Counterexamples to stable-Morse and strong Arnold fixed-point bounds | full | Counterexamples to the stable Morse and strong forms. The homological Arnold conjecture is untouched. |
| `navier` | 376 Universal computation in forced Navier–Stokes flows | full | Universal computation in forced flows. Existence and smoothness of unforced solutions stays open. |
| `wp-smooth-solutions-exist-for-the-navierstokes-equations` | 376 Universal computation in forced Navier–Stokes flows | full | Universal computation in forced flows. The row asks when smooth solutions exist. |

## Match Unestablished

5 rows. The catalogue text does not show that the family settles the row. Status unchanged.

| Row | Family | Lean scope | Why |
|---|---|---|---|
| `fc-wikipedia-brennanconjecture-brennan-universalspectrumbounded` | 072 Brennan's conjecture and the integral-means spectrum | narrower | The row is the value of the bounded spectrum at minus two. The catalogue states the universal spectrum at minus two and the bounded spectrum at minus one. The Lean statements name the universal spectrum at minus two. |
| `fc-paper-degiorgi-degiorgi-four` | 375 De Giorgi's conjecture in dimension eight | none | The catalogue classifies stable solutions in dimension seven, which may give this dimension; it does not say so. |
| `fc-paper-degiorgi-degiorgi-five` | 375 De Giorgi's conjecture in dimension eight | none | The catalogue classifies stable solutions in dimension seven, which may give this dimension; it does not say so. |
| `fc-paper-degiorgi-degiorgi-six` | 375 De Giorgi's conjecture in dimension eight | none | The catalogue classifies stable solutions in dimension seven, which may give this dimension; it does not say so. |
| `fc-paper-degiorgi-degiorgi-seven` | 375 De Giorgi's conjecture in dimension eight | none | The catalogue classifies stable solutions in dimension seven, which may give this dimension; it does not say so. |

## Absent From The Atlas

- Erdős problem 293: On the third-party list of 23 Erdős problems; the atlas has no row for it.
- Erdős problem 604: On the third-party list of 23 Erdős problems; the atlas has no row for it.
- Erdős problem 802: On the third-party list of 23 Erdős problems; the atlas has no row for it.
