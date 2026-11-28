# Graham Net-Net Stocks

ID: `eq-net-net`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Quantpedia

## Logic

Each year buy stocks priced below two thirds of net current assets minus all liabilities and hold one year.

## Source

1. Quantpedia, Net Current Asset Value Effect. https://quantpedia.com/strategies/net-current-asset-value-effect/ (web fetch, fetched 2026-11-27)
2. Testing Benjamin Graham's Net Current Asset Value Strategy in London. Xiao, Arnold, 2007, Crossref. https://doi.org/10.2139/ssrn.966188 (Crossref search, fetched 2026-11-27)

## Claimed Edge

Quantpedia, from the source paper over 1980 to 2005: 31.19% per annum.

## Post-Publication Decay

No fetched post-publication study. Grade C.

Decay source: Does Academic Research Destroy Stock Return Predictability?. MCLEAN, PONTIFF, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12365 (Crossref search, fetched 2026-11-27)

## Capacity

Small.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
