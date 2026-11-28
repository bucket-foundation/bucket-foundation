# R&D Intensity

ID: `eq-rd-intensity`
Family: Equities
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy firms with high R&D over market value.

## Source

1. The Stock Market Valuation of Research and Development Expenditures. Chan, Lakonishok, Sougiannis, 1999. https://doi.org/10.3386/w7223 (Crossref search, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/rd-expenditures-and-stock-returns/ (fetched 2026-11-27)

## Claimed Edge

High R&D-to-market firms earned excess returns in Chan, Lakonishok and Sougiannis.

## Post-Publication Decay

Weaker after intangibles became a large share of market value.

Decay source: Replicating Anomalies. Hou, Xue, Zhang, 2018, The Review of Financial Studies. https://doi.org/10.1093/rfs/hhy131 (Crossref DOI, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- Quantpedia rd-expenditures-and-stock-returns
- RD
- RD_q

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
