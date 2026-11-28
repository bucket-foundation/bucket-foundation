# Lottery Stocks, MAX

ID: `eq-max-lottery`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Avoid or short stocks with the highest maximum daily return over the past month.

## Source

1. Maxing out: Stocks as lotteries and the cross-section of expected returns. Bali, Cakici, Whitelaw, 2011, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2010.08.014 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Stocks with extreme maximum daily returns earn lower future returns.

## Post-Publication Decay

Overlaps with idiosyncratic volatility and fails for value-weighted portfolios in some replications.

Decay source: Replicating Anomalies. Hou, Xue, Zhang, 2018, The Review of Financial Studies. https://doi.org/10.1093/rfs/hhy131 (Crossref DOI, fetched 2026-11-27)

## Capacity

Small.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[alphalens-reloaded](../../08-software/alphalens-reloaded.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- MaxRet

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
