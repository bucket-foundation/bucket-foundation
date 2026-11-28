# Multi-Factor Combination

ID: `eq-ff5-multifactor`
Family: Equities
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Hold a blend of value, profitability, investment, momentum and low beta.

## Source

1. A five-factor asset pricing model. Fama, French, 2015, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2014.10.010 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Combining factors with low correlation raises Sharpe ratio above any single factor.

## Post-Publication Decay

Jensen-Kelly-Pedersen find most themes survive out of sample, at smaller size than reported.

Decay source: Is There a Replication Crisis in Finance?. Jensen, Kelly, Pedersen, 2023, The Journal of Finance. https://doi.org/10.1111/jofi.13249 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large via factor ETFs.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[pyportfolioopt](../../08-software/pyportfolioopt.md), [riskfolio-lib](../../08-software/riskfolio-lib.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- KS 3.6

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
