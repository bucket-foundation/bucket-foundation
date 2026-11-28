# Country ETF Pairs

ID: `etf-pairs-country`
Family: ETFs and Macro
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Distance-method pairs on country ETFs.

## Source

1. Pairs Trading: Performance of a Relative-Value Arbitrage Rule. Gatev, Goetzmann, Rouwenhorst, 2006, Review of Financial Studies. https://doi.org/10.1093/rfs/hhj020 (Crossref DOI, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/pairs-trading-with-country-etfs/ (fetched 2026-11-27)

## Claimed Edge

Quantpedia lists positive backtests on country ETF pairs.

## Post-Publication Decay

Few pairs; edges shrink with ETF arbitrage.

Decay source: Does Simple Pairs Trading Still Work?. Do, Faff, 2010, Financial Analysts Journal. https://doi.org/10.2469/faj.v66.n4.1 (Crossref DOI, fetched 2026-11-27)

## Capacity

Small.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[mlfinlab](../../08-software/mlfinlab.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- Quantpedia pairs-trading-with-country-etfs

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
