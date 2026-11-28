# Residual Momentum

ID: `eq-residual-momentum`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Rank stocks on past residual returns after removing Fama-French factor exposure.

## Source

1. Residual momentum. Blitz, Huij, Martens, 2011, Journal of Empirical Finance. https://doi.org/10.1016/j.jempfin.2011.01.003 (Crossref DOI, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/residual-momentum-factor/ (fetched 2026-11-27)

## Claimed Edge

About double the risk-adjusted return of total-return momentum with fewer crashes.

## Post-Publication Decay

Factor momentum work argues the residual version captures part of factor timing.

Decay source: Factor Momentum and the Momentum Factor. Ehsani, Linnainmaa, 2022, The Journal of Finance. https://doi.org/10.1111/jofi.13131 (Crossref DOI, fetched 2026-11-27)

## Capacity

Medium to large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[alphalens-reloaded](../../08-software/alphalens-reloaded.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- KS 3.7
- Quantpedia residual-momentum-factor
- ResidualMomentum
- ResidualMomentum6m

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
