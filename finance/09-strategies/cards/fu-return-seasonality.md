# Cross-Asset Return Seasonality

ID: `fu-return-seasonality`
Family: Futures and CTA
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy assets that historically do well in the coming calendar month.

## Source

1. Return Seasonalities. Keloharju, Linnainmaa, Nyberg, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12398 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Seasonality appears in commodities, country indexes and anomalies.

## Post-Publication Decay

Small per-month effect; cost sensitive.

Decay source: Return Seasonalities. Keloharju, Linnainmaa, Nyberg, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12398 (Crossref DOI, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[vectorbt](../../08-software/vectorbt.md)

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
