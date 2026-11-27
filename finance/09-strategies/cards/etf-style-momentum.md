# Style Index Momentum

ID: `etf-style-momentum`
Family: ETFs and Macro
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Quantpedia

## Logic

Each month go long the Russell style ETF with the best 12-month return and short the worst of six size and value styles.

## Source

1. Quantpedia, Momentum Factor and Style Rotation Effect. https://quantpedia.com/strategies/momentum-factor-and-style-rotation-effect/ (web fetch, fetched 2026-11-27)
2. Tibbs, Eakins, DeShurko: Using Style Index Momentum to Generate Alpha https://papers.ssrn.com/sol3/papers.cfm?abstract_id=1276815. http://www.mta.org/eweb/docs/pdfs/2008DowAwardWinner.pdf (linked from Quantpedia; SSRN blocked the fetch )

## Claimed Edge

Quantpedia, from the source paper over 1972 to 2005: 9.25% per annum, Sharpe 0.33.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
