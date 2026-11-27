# Short Index Volatility

ID: `op-short-index-vol`
Family: Options and Volatility
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Sell index variance or straddles; implied volatility exceeds realized on average.

## Source

1. Variance Risk Premiums. Carr, Wu, 2008, Review of Financial Studies. https://doi.org/10.1093/rfs/hhn038 (Crossref DOI, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 7.1. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)
3. Quantpedia free strategy page. https://quantpedia.com/strategies/volatility-risk-premium-effect/ (fetched 2026-11-27)

## Claimed Edge

Carr and Wu find strongly negative variance risk premia in index options.

## Post-Publication Decay

February 2018 wiped out short-VIX products; the premium persists with fat left tails.

Decay source: Expected Option Returns. Shumway, Coval, 1999. https://doi.org/10.2139/ssrn.189840 (Crossref search, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[financial-models-numerical-methods](../../08-software/financial-models-numerical-methods.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- KS 2.25
- KS 7.4
- KS 7.6
- Quantpedia volatility-risk-premium-effect

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
