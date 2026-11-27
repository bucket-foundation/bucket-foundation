# Small-Cap Premium

ID: `eq-size-small-cap`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Overweight the smallest market-cap stocks.

## Source

1. The relationship between return and market value of common stocks. Banz, 1981, Journal of Financial Economics. https://doi.org/10.1016/0304-405X(81)90018-0 (Crossref DOI, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 3.2. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)
3. Quantpedia free strategy page. https://quantpedia.com/strategies/small-capitalization-stocks-premium-anomaly/ (fetched 2026-11-27)

## Claimed Edge

Banz found small NYSE firms earned higher risk-adjusted returns 1936-1975.

## Post-Publication Decay

The raw size premium faded after 1981. Asness and co-authors restore it only after controlling for quality.

Decay source: Size Matters, If You Control Your Junk. Asness, Frazzini, Israel, Moskowitz, 2015. https://doi.org/10.2139/ssrn.2632685 (Crossref search, fetched 2026-11-27)

## Capacity

Small to medium. The edge sits in microcaps where spreads eat it.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[zipline-reloaded](../../08-software/zipline-reloaded.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- Quantpedia small-capitalization-stocks-premium-anomaly
- Size

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
