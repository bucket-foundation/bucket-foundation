# All-Time High Trend Following on Stocks

ID: `eq-all-time-high-trend`
Family: Equities
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Quantpedia

## Logic

Buy liquid stocks closing at an all-time high and exit on a 10-ATR trailing stop.

## Source

1. Quantpedia, Trend-following Effect in Stocks. https://quantpedia.com/strategies/trend-following-effect-in-stocks/ (web fetch, fetched 2026-11-27)
2. Cole Wilcox, Eric Crittenden: Does Trend Following Work on Stocks. https://www.cis.upenn.edu/~mkearns/finread/trend.pdf (linked from Quantpedia; SSRN blocked the fetch)

## Claimed Edge

Quantpedia, from the source paper over 1983 to 2004: 19.3% per annum, Sharpe 1.24.

## Post-Publication Decay

No fetched post-publication study. Grade C.

Decay source: Does Academic Research Destroy Stock Return Predictability?. MCLEAN, PONTIFF, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12365 (Crossref search, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
