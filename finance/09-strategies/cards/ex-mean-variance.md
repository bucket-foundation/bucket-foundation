# Mean-Variance Max Sharpe

ID: `ex-mean-variance`
Family: Execution and Portfolio Construction
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Estimate returns and covariances and rebalance to the maximum Sharpe ratio or minimum variance weights.

## Source

1. Optimal versus Naive Diversification: How Inefficient Is the 1/N Portfolio Strategy?. DeMiguel and co-authors, 2011, Heuristics. https://doi.org/10.1093/acprof:oso/9780199744282.003.0034 (Crossref search, fetched 2026-11-27)
2. Source code in `finance/code/`: 1 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

Markowitz 1952 framework. DeMiguel, Garlappi and Uppal 2009 found 1/N beat 14 optimized models out of sample.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[polakowo/vectorbt](../../08-software/vectorbt.md)

## Code

- `polakowo/vectorbt: examples/PortfolioOptimization.ipynb`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
