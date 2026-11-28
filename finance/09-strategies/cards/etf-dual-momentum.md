# Dual Momentum

ID: `etf-dual-momentum`
Family: ETFs and Macro
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Pick the stronger of US and international equity over 12 months; hold it only if it beats T-bills, else bonds.

## Source

1. Risk Premia Harvesting Through Dual Momentum. Antonacci, 2012. https://doi.org/10.2139/ssrn.2042750 (Crossref search, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/asset-class-momentum-rotational-system/ (fetched 2026-11-27)

## Claimed Edge

Antonacci reports higher return and half the drawdown of world equities since 1974.

## Post-Publication Decay

Single-author backtest with a published book; parameters chosen in-sample.

Decay source: Does Academic Research Destroy Stock Return Predictability?. Mclean, Pontiff, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12365 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[bt](../../08-software/bt.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- KS 4.1.2

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
