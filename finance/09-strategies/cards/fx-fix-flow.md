# Month-End FX Fix Flow

ID: `fx-fix-flow`
Family: FX
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Trade the predictable dollar flows from portfolio rebalancing around the month-end 4pm London fix.

## Source

1. Forex Trading and the WMR Fix. Evans, 2014, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.2487991 (Crossref search, fetched 2026-11-27)

## Claimed Edge

Prices show systematic moves around the fix.

## Post-Publication Decay

Decay source: Forex Trading and the WMR Fix. Evans, 2014, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.2487991 (Crossref search, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
