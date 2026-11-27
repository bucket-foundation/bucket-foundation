# Buybacks before Earnings

ID: `eq-buyback-earnings`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Quantpedia

## Logic

Buy firms that announced a buyback of at least 5 percent of shares 15 to 30 days before their earnings date and hold through the announcement.

## Source

1. Quantpedia, Earnings Announcements Combined with Stock Repurchases. https://quantpedia.com/strategies/earnings-announcements-combined-with-stock-repurchases/ (web fetch, fetched 2026-11-27)
2. Are Earnings Predictable? Evidence from Equity Issues and Buyback Announcements. Amini, Singal, 2015, Crossref. https://doi.org/10.2139/ssrn.2589966 (Crossref search, fetched 2026-11-27)

## Claimed Edge

Quantpedia, from the source paper over 1987 to 2013: 25.2% per annum, Sharpe 2.27.

## Post-Publication Decay

No fetched post-publication study. Grade C.

Decay source: Does Academic Research Destroy Stock Return Predictability?. MCLEAN, PONTIFF, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12365 (Crossref search, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
