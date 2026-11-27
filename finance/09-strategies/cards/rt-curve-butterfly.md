# Yield Curve Butterfly Mean Reversion

ID: `rt-curve-butterfly`
Family: Rates
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Trade the 2s5s10s butterfly when it deviates from its fitted level, duration-neutral.

## Source

1. 151 Trading Strategies. Kakushadze, Serur, 2018. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 5.7. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Kakushadze and Serur describe the trade; curvature mean-reverts in principal-component studies.

## Post-Publication Decay

Relative-value funds run it with leverage; 1998 and 2020 show the blowup risk.

Decay source: 151 Trading Strategies. Kakushadze, Serur, 2018. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-macro](../../03-data-sources/cards/D-macro.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- KS 5.6
- KS 5.7
- KS 5.8

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
