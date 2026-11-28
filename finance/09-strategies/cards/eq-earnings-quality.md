# Earnings Quality Composite

ID: `eq-earnings-quality`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Quantpedia

## Logic

Rank stocks on a composite of cash flow to assets, ROE, accruals and use; buy high quality, short low.

## Source

1. Quantpedia, Earnings Quality Factor. https://quantpedia.com/strategies/earnings-quality-factor/ (web fetch, fetched 2026-11-27)
2. Global Return Premiums on Earnings Quality, Value, and Size. Kozlov, Petajisto, 2012, Crossref. https://doi.org/10.2139/ssrn.2179247 (Crossref search, fetched 2026-11-27)

## Claimed Edge

Quantpedia, from the source paper over 1988 to 2012: 7.95% per annum, Sharpe 0.67.

## Post-Publication Decay

No fetched post-publication study. Grade C.

Decay source: Does Academic Research Destroy Stock Return Predictability?. MCLEAN, PONTIFF, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12365 (Crossref search, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
