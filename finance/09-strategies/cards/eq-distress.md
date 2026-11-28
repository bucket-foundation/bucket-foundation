# Financial Distress Anomaly

ID: `eq-distress`
Family: Equities
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Avoid or short firms with the highest model-implied failure probability.

## Source

1. In Search of Distress Risk. Campbell, Hilscher, Szilagyi, 2008, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.2008.01416.x (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Distressed stocks deliver anomalously low returns.

## Post-Publication Decay

Part of the quality family that replicates in Jensen-Kelly-Pedersen.

Decay source: Is There a Replication Crisis in Finance?. Jensen, Kelly, Pedersen, 2023, The Journal of Finance. https://doi.org/10.1111/jofi.13249 (Crossref DOI, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- FailureProbability
- FailureProbabilityJune
- KS 15.3
- code QuantConnect/Lean: Algorithm.Python/Alphas/ContingentClaimsAnalysisDefaultPredictionAlpha.py

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
