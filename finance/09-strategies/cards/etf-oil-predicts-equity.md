# Oil Price Changes Predict Stocks

ID: `etf-oil-predicts-equity`
Family: ETFs and Macro
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Reduce equity exposure after oil price rises.

## Source

1. Striking oil: Another puzzle?. Driesprong, Jacobsen, Maat, 2008, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2007.07.008 (Crossref DOI, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/crude-oil-predicts-equity-returns/ (fetched 2026-11-27)

## Claimed Edge

Oil price changes predict stock market returns in many developed markets.

## Post-Publication Decay

Weaker after 2008 as the oil-equity correlation changed sign.

Decay source: A Comprehensive Look at The Empirical Performance of Equity Premium Prediction. Welch, Goyal, 2007, Review of Financial Studies. https://doi.org/10.1093/rfs/hhm014 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md), [D-macro](../../03-data-sources/cards/D-macro.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- Quantpedia crude-oil-predicts-equity-returns

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
