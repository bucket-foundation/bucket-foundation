# Momentum within Low Asset Growth

ID: `eq-momentum-asset-growth`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Quantpedia

## Logic

Run 6-month momentum inside the highest asset growth tercile, where momentum is strongest per the paper.

## Source

1. Quantpedia, Momentum Factor Combined with Asset Growth Effect. https://quantpedia.com/strategies/momentum-factor-combined-with-asset-growth-effect/ (web fetch, fetched 2026-11-27)
2. Nyberg, Poyry: Firm Expansion and Stock Price Momentum https://papers.ssrn.com/sol3/papers.cfm?abstract_id=1684767. http://www.fma.org/NY/Papers/Expansion2010.pdf (linked from Quantpedia; SSRN blocked the fetch )

## Claimed Edge

Quantpedia, from the source paper over 1968 to 2006: 16.77% per annum, Sharpe 1.21.

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
