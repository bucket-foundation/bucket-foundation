# Black-Litterman Allocation

ID: `ex-black-litterman`
Family: Execution and Portfolio Construction
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Blend market-implied equilibrium returns with signal views by confidence and optimize weights on the posterior.

## Source

1. Global Portfolio Optimization. Black, Litterman, 1992, Financial Analysts Journal. https://doi.org/10.2469/faj.v48.n5.28 (Crossref search, fetched 2026-11-27)
2. Source code in `finance/code/`: 1 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

Black and Litterman 1992 proposed the method to tame mean-variance weights.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[QuantConnect/Lean](../../08-software/lean.md)

## Code

- `QuantConnect/Lean: Algorithm.Framework/Portfolio/BlackLittermanOptimizationPortfolioConstructionModel.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
