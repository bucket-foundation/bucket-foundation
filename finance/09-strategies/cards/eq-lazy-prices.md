# Lazy Prices, Filing Changes

ID: `eq-lazy-prices`
Family: Equities
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Compare each 10-K or 10-Q to the prior one. Short firms that change their language most.

## Source

1. Lazy Prices. Cohen, Malloy, Nguyen, 2020, The Journal of Finance. https://doi.org/10.1111/jofi.12885 (Crossref DOI, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/the-positive-similarity-of-company-filings-and-stock-returns/ (fetched 2026-11-27)

## Claimed Edge

Non-changers beat changers by up to 188 basis points a month in five-factor alpha.

## Post-Publication Decay

NLP tools make the signal cheap to compute, which invites crowding.

Decay source: Does Academic Research Destroy Stock Return Predictability?. Mclean, Pontiff, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12365 (Crossref DOI, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md)

## Implementation

[fingpt](../../08-software/fingpt.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- Quantpedia the-positive-similarity-of-company-filings-and-stock-returns

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
