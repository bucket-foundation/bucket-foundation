# Net Share Issuance

ID: `eq-share-issuance`
Family: Equities
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Short firms that issue shares, buy firms that shrink share count.

## Source

1. Share Issuance and Cross‐sectional Returns. Pontiff, Woodgate, 2008, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.2008.01335.x (Crossref search, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 3.13. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Share issuance predicts returns with a t-statistic above value and momentum in Pontiff and Woodgate.

## Post-Publication Decay

Survives in Jensen-Kelly-Pedersen replication.

Decay source: Is There a Replication Crisis in Finance?. Jensen, Kelly, Pedersen, 2023, The Journal of Finance. https://doi.org/10.1111/jofi.13249 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md)

## Implementation

[alphalens-reloaded](../../08-software/alphalens-reloaded.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- ShareIss1Y
- ShareIss5Y

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
