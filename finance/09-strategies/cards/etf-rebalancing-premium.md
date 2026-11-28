# Rebalancing Premium

ID: `etf-rebalancing-premium`
Family: ETFs and Macro
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Rebalance a fixed-weight portfolio of volatile, low-correlation assets to capture diversification return.

## Source

1. Disentangling Rebalancing Return. Hallerbach, 2014. https://doi.org/10.2139/ssrn.2390614 (Crossref search, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/rebalancing-premium-in-cryptocurrencies/ (fetched 2026-11-27)

## Claimed Edge

Rebalanced portfolios earn a volatility-pumping return over buy and hold when assets mean-revert.

## Post-Publication Decay

Benefit depends on assets not trending; positive momentum makes rebalancing cost return.

Decay source: Time series momentum. Moskowitz, Ooi, Pedersen, 2012, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2011.11.003 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[bt](../../08-software/bt.md), [riskfolio-lib](../../08-software/riskfolio-lib.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- code lumibot: lumibot/example_strategies/classic_60_40.py
- code lumibot: lumibot/example_strategies/drift_rebalancer.py
- code qstrader: examples/sixty_forty.py

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
