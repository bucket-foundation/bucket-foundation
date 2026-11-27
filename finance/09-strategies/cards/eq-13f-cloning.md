# 13F Best-Ideas Cloning

ID: `eq-13f-cloning`
Family: Equities
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Copy the highest-conviction positions of fund managers from quarterly 13F filings.

## Source

1. Best Ideas. Cohen, Polk, Silli, 2009. https://doi.org/10.2139/ssrn.1571821 (Crossref search, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/alpha-cloning-following-13f-fillings/ (fetched 2026-11-27)
3. Systematic 13F Hedge Fund Alpha. Angelini et al., 2019. https://doi.org/10.2139/ssrn.3459526 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Managers' best ideas outperform their other holdings.

## Post-Publication Decay

13F filings are due no later than 45 days after quarter-end; Angelini and co-authors' strategy on conviction and consensus of long-horizon managers beat the S&P 500 by 3.80% on average with a Sharpe ratio of 0.75 over Q1 2004 to Q2 2019.

Decay source: Systematic 13F Hedge Fund Alpha. Angelini et al., 2019. https://doi.org/10.2139/ssrn.3459526 (Crossref DOI, fetched 2026-11-27)

## Capacity

Small to medium.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- Quantpedia alpha-cloning-following-13f-fillings

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
