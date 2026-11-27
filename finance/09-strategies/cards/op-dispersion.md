# Dispersion Trading

ID: `op-dispersion`
Family: Options and Volatility
Retail feasibility: **D**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Sell index options, buy single-stock options, to harvest the correlation risk premium.

## Source

1. The Price of Correlation Risk: Evidence from Equity Options. Driessen, Maenhout, Vilkov, 2005. https://doi.org/10.2139/ssrn.673425 (Crossref search, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 7.4. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)
3. Quantpedia free strategy page. https://quantpedia.com/strategies/dispersion-trading/ (fetched 2026-11-27)

## Claimed Edge

Index options carry a priced correlation premium that single stock options lack.

## Post-Publication Decay

Crowded among banks; correlation spikes in crashes cause losses.

Decay source: The Price of Correlation Risk: Evidence from Equity Options. Driessen, Maenhout, Vilkov, 2005. https://doi.org/10.2139/ssrn.673425 (Crossref search, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- KS 6.3
- Quantpedia dispersion-trading

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
