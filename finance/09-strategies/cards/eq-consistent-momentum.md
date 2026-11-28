# Consistent Momentum

ID: `eq-consistent-momentum`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Quantpedia

## Logic

Buy stocks in the top decile of both the 7 to 1 and 6 to 1 month return windows, short those in the bottom decile of both; hold six months.

## Source

1. Quantpedia, Consistent Momentum Strategy. https://quantpedia.com/strategies/consistent-momentum-strategy/ (web fetch, fetched 2026-11-27)
2. Chen, Chou, Hsieh: Persistency of the Momentum Effect: The Role of Consistent Winners and Losers. http://papers.ssrn.com/sol3/papers.cfm?abstract_id=2652592 (linked from Quantpedia; SSRN blocked the fetch )

## Claimed Edge

Quantpedia, from the source paper over 1980 to 2011: 16.08% per annum, Sharpe 0.48.

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
