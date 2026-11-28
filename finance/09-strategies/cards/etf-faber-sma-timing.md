# Moving-Average Tactical Allocation

ID: `etf-faber-sma-timing`
Family: ETFs and Macro
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Hold each asset class ETF when its price is above the 10-month moving average, else T-bills.

## Source

1. A Quantitative Approach to Tactical Asset Allocation. Faber, 2007, The Journal of Wealth Management. https://doi.org/10.3905/jwm.2007.674809 (Crossref DOI, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/asset-class-trend-following/ (fetched 2026-11-27)

## Claimed Edge

Equity-like returns with bond-like volatility and smaller drawdowns in 1973-2005.

## Post-Publication Decay

Decay source: Time series momentum: Is it there?. Huang, Li, Wang, Zhou, 2020, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2019.08.004 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[bt](../../08-software/bt.md), [vectorbt](../../08-software/vectorbt.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- Quantpedia asset-class-trend-following

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
