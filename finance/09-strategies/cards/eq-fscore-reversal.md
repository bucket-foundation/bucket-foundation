# F-Score with Short-Term Reversal

ID: `eq-fscore-reversal`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Quantpedia

## Logic

Within last month losers buy high F-Score stocks; within winners short low F-Score stocks; hold one month.

## Source

1. Quantpedia, Combining Fundamental FSCORE and Equity Short-Term Reversals. https://quantpedia.com/strategies/combining-fundamental-fscore-and-equity-short-term-reversals/ (web fetch, fetched 2026-11-27)
2. Noise Trading, Slow Diffusion of Information, and Short-Term Reversals: A Fundamental Analysis Approach. Zhu and co-authors, 2017, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3097420 (Crossref search, fetched 2026-11-27)

## Claimed Edge

Quantpedia, from the source paper over 1984 to 2015: 12.01% data from table 6, Sharpe 0.39.

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
