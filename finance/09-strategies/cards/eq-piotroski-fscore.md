# Piotroski F-Score

ID: `eq-piotroski-fscore`
Family: Equities
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Within high book-to-market stocks, buy those passing most of nine accounting checks.

## Source

1. Value Investing: The Use of Historical Financial Statement Information to Separate Winners from Losers. Piotroski, 2000, Journal of Accounting Research. https://doi.org/10.2307/2672906 (Crossref DOI, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/combining-fundamental-fscore-and-equity-short-term-reversals/ (fetched 2026-11-27)

## Claimed Edge

High-score firms within the value universe beat low-score firms.

## Post-Publication Decay

Returns concentrate in small, illiquid firms; later replications find smaller value-weighted spreads.

Decay source: Replicating Anomalies. Hou, Xue, Zhang, 2018, The Review of Financial Studies. https://doi.org/10.1093/rfs/hhy131 (Crossref DOI, fetched 2026-11-27)

## Capacity

Small to medium.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md)

## Implementation

[alphalens-reloaded](../../08-software/alphalens-reloaded.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- PS
- PS_q

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
