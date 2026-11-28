# Weather Derivatives

ID: `ot-weather-derivatives`
Family: Other
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Trade CME heating and cooling degree day futures against forecast models.

## Source

1. 151 Trading Strategies. Kakushadze, Serur, 2018. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 16.1. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Kakushadze and Serur list weather trades; forecasts beat climatology at short horizons.

## Post-Publication Decay

Thin market.

Decay source: 151 Trading Strategies. Kakushadze, Serur, 2018. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)

## Capacity

Small.

## Data Needed

[D-macro](../../03-data-sources/cards/D-macro.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- KS 14.3

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
