# Volatility-Managed Portfolios

ID: `etf-volatility-targeting`
Family: ETFs and Macro
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Scale exposure inversely to last month's realized variance.

## Source

1. Volatility‐Managed Portfolios. Moreira, Muir, 2017, The Journal of Finance. https://doi.org/10.1111/jofi.12513 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Volatility-managed factor portfolios raise Sharpe ratios and produce large alphas.

## Post-Publication Decay

Cederburg and co-authors find the strategies fail out of sample in real-time implementation.

Decay source: On the performance of volatility-managed portfolios. Cederburg, O’Doherty, Wang, Yan, 2020, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2020.04.015 (Crossref search, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[pysystemtrade](../../08-software/pysystemtrade.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- KS 6.5

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
