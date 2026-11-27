# Country Index Momentum and Reversal

ID: `etf-country-momentum`
Family: ETFs and Macro
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Rank country ETFs on 12-month return; long-run losers revert over 3 to 5 years.

## Source

1. Winner-Loser Reversals in National Stock Market Indices. Richards. https://doi.org/10.5089/9781451859232.001.a001 (Crossref search, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/momentum-factor-effect-in-country-equity-indexes/ (fetched 2026-11-27)

## Claimed Edge

Country indexes show momentum at one year and reversal over several years.

## Post-Publication Decay

Small universe makes results fragile.

Decay source: Value and Momentum Everywhere. Asness, Moskowitz, Pedersen, 2013, The Journal of Finance. https://doi.org/10.1111/jofi.12021 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[bt](../../08-software/bt.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- Quantpedia momentum-factor-effect-in-country-equity-indexes

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
