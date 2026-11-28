# Treasury Cash-Futures Basis

ID: `rt-treasury-basis`
Family: Rates
Retail feasibility: **D**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy cash Treasuries, sell futures, finance in repo; earn the gap between implied and actual repo.

## Source

1. Hedge Funds and the Treasury Cash-Futures Disconnect. Barth, Kahn, 2021. https://doi.org/10.67236/faxi2748 (Crossref search, fetched 2026-11-27)
2. Hedge Funds and the Treasury Cash-Futures Disconnect. Office of Financial Research working paper 21-01. https://financialresearch.gov/working-papers/2021/04/01/hedge-funds-and-the-treasury-cash-futures-disconnect (fetched 2026-11-27)

## Claimed Edge

A replicating portfolio of bills and futures was overvalued against notes and bonds; hedge funds ran the trade with repo leverage.

## Post-Publication Decay

The basis trade grew to as much as half of hedge fund Treasury positions and about a quarter of dealers' repo lending, and many of its risks materialized in March 2020.

Decay source: Hedge Funds and the Treasury Cash-Futures Disconnect. Barth, Kahn, 2021. https://doi.org/10.67236/faxi2748 (Crossref search, fetched 2026-11-27)

## Capacity

Large for institutions.

## Data Needed

[D-macro](../../03-data-sources/cards/D-macro.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
