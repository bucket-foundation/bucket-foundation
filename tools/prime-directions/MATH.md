# Prime Directions Math

Bead `bkt-plg2`. Every step the engine runs, with the claim each output rests on and where that claim is checked.

## Matrix

A corpus of n documents over m features becomes a sparse matrix X ∈ ℝ^{n×m}. For a text corpus, X_ij = 1 when document i contains term j. For the Bucket graph, the features are the node's terms plus one column per node with at least two links, X_ij = 1 when node i links to node j in either direction. The graph run then weights column j by idf_j = ln((1+n)/(1+df_j)) + 1 and scales each row to unit length, so ‖x_i‖ = 1.

## Prime directions

The truncated SVD X ≈ U_k Σ_k V_kᵀ keeps the top k singular triples. Rows of V_k are the prime directions, orthonormal: V_k V_kᵀ = I. The engine checks this on every run and reports max |V_k V_kᵀ − I|; the graph run gives 2.7e-15.

The engine computes the SVD with the randomized range finder of Halko, Martinsson and Tropp (SIAM Review 53, 2011): sample Y = (X Xᵀ)^q X Ω with a Gaussian Ω, orthonormalize, and take the exact SVD of the small projected matrix. By Eckart and Young (Psychometrika 1, 1936), U_k Σ_k V_kᵀ is the best rank-k approximation of X in Frobenius norm.

The SVD is uncentered. Component 1 then tracks the mean row, and its variance share is small.

## Scores

Document i's score on direction c is s_ic = (U_k Σ_k)_ic = x_i · v_c, the length of x_i's projection on v_c. The globe and the projection chart use standardized scores z_ic = (s_ic − mean_c) / sd_c. Each standardized column sums to zero.

Variance share of direction c is var(s_·c) / Σ_j var(X_·j).

## Residuals

For orthonormal v_1 … v_k, the projection x̂ = Σ_c (x · v_c) v_c satisfies

‖x‖² = ‖x̂‖² + ‖x − x̂‖²,

so the residual is ‖x‖² − Σ_c s_ic², computed from the scores without forming x̂. The residual chart shows the share ‖x − x̂‖² / ‖x‖² per row, against PageRank, next to the scree of variance shares.

## PageRank

With A the weighted directed adjacency and P its row-normalized transition matrix, PageRank solves r = d Pᵀ r + d (Σ_{dangling} r_i)/n · 1 + (1 − d)/n · 1, with d = 0.85 (Brin and Page, 1998). Power iteration stops when ‖r_{t+1} − r_t‖₁ < 1e-10. Each step keeps Σ r = 1.

## Canon clusters

Node i joins the pole of its strongest direction: c*(i) = argmax_c |z_ic|, sign = sign(z_ic*). With k directions there are at most 2k canon clusters. Clusters are numbered 1, 2, 3, … in descending order of PageRank mass Σ_{i ∈ C} r_i, so the naming is a bijection onto an initial segment of ℕ. A cluster's name is its three top-loading terms on that pole, or its three highest-PageRank members when every top feature is a link.

Quality is Newman modularity on the undirected graph, Q = Σ_C [L_C/m − (d_C/2m)²], reported with three references: the same labels shuffled 20 times, the human branch labels, and Louvain (Blondel et al., 2008) as an upper reference. The public graph run on 2026-09-27, 1,685 nodes and 20 canon clusters: canon Q 0.278, shuffled −0.001 ± 0.007, branch labels 0.770, Louvain 0.859 over 395 communities. NMI against branches 0.36, silhouette on z 0.19. The canons follow the text directions and cut across the branch taxonomy; they recover less edge structure than the branches, which are built from the same editorial links.

## Five-number summary

Per direction, the boxplot shows min, Q1, median, Q3 and max of s_·c, whiskers at min and max, with the mean and ±1 SD beside it. The same numbers are in `canon.json` under `component_summaries`.

## Gaps

For term t, the gap log-ratio is ln((df_A + a)/(n_A + 2a)) − ln(max_B (df_B + a)/(n_B + 2a)), a = 0.5. It is positive when corpus A covers t at a higher smoothed rate than every other corpus.

## Lean

`lean/` holds core-Lean proofs over ℚ, with no Mathlib and no `sorry`. `lean/check.sh` builds them and fails on `sorry` or any axiom outside `propext`, `Classical.choice` and `Quot.sound`.

| Claim | Lean theorem | Status |
|---|---|---|
| Dot product is symmetric, linear in each slot | `dot_comm`, `dot_smul_right`, `dot_sub_left`, `dot_sub_right` | proved |
| Residual identity for one unit direction | `pythagoras_unit` | proved |
| Centered scores sum to zero | `centered_sum_zero` | proved |
| A PageRank step keeps total mass 1 when the walk part has mass 1 | `pagerank_step_mass` | proved |
| One-cluster partition has modularity zero | `modularity_single_cluster` | proved |

Claims that need Mathlib's real analysis and linear algebra, and stay as cited results here: the residual identity for k orthonormal directions by induction on k, existence of the SVD, Eckart and Young, the Halko, Martinsson and Tropp error bound, convergence of the PageRank power iteration through Perron and Frobenius, and the sign of the gap log-ratio, which needs `Real.log`. The walk part's mass in `pagerank_step_mass` is a hypothesis; the code meets it by adding the dangling mass back uniformly.
