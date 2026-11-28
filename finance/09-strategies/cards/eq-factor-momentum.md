# Factor Momentum

ID: `eq-factor-momentum`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy factors with positive returns over the past year, sell factors with negative returns.

## Source

1. Factor Momentum and the Momentum Factor. Ehsani, Linnainmaa, 2022, The Journal of Finance. https://doi.org/10.1111/jofi.13131 (Crossref DOI, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/momentum-factor-and-style-rotation-effect/ (fetched 2026-11-27)

## Claimed Edge

Factor momentum explains most of individual stock momentum in Ehsani and Linnainmaa.

## Post-Publication Decay

Recent, little out-of-sample record.

Decay source: Is There a Replication Crisis in Finance?. Jensen, Kelly, Pedersen, 2023, The Journal of Finance. https://doi.org/10.1111/jofi.13249 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
