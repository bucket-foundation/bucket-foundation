# Dividend Month Premium

ID: `eq-dividend-month`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy stocks in months they are predicted to pay a dividend.

## Source

1. The Dividend Month Premium. Hartzmark, Solomon, 2011. https://doi.org/10.2139/ssrn.1930620 (Crossref search, fetched 2026-11-27)

## Claimed Edge

Abnormal returns in predicted dividend months match the value premium in size with lower volatility.

## Post-Publication Decay

Taxes on dividends cut the edge for taxable accounts.

Decay source: Does Academic Research Destroy Stock Return Predictability?. Mclean, Pontiff, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12365 (Crossref DOI, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- DivSeason

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
