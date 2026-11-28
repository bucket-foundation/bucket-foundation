# Beyond De Prado and Cotton: Hierarchical and Iterative Methods for General Mean-Variance Portfolios

ID: `eq-ax-beyond-de-prado-and-cotton-hierarchical-and-iterat`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: HRP-$μ$ is a hierarchical allocator that accepts an arbitrary signal $μ$ and nests standard HRP when $γ= 0$ and $μ=\mathbf{1}$. This paper introduces three methods that incorporate alpha signals into hierarchical and regularised portfolio construction.

## Source

1. Beyond De Prado and Cotton: Hierarchical and Iterative Methods for General Mean-Variance Portfolios. Bernd Johannes Wuebben, 2026, arXiv 2604.23833. https://arxiv.org/abs/2604.23833 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: At convergence, CRISP is Markowitz applied to a variance-preserving shrunk covariance-diagonal variances unchanged, off-diagonal correlations shrunk-with $γ$ tuned for out-of-sample Sharpe rather than covariance-estimation loss. In Monte Carlo experiments across multiple covariance regimes and estimation ratios, HRP-$μ$ and HRP-$Σμ$ both outperform plain HRP with HRP-$Σμ$ improving on HRP-$μ$.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
