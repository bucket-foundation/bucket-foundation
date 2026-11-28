# House Price Momentum

ID: `re-house-momentum`
Family: Real Estate
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy in metros with rising prices over the past year.

## Source

1. The Efficiency of the Market for Single-Family Homes. Case, Shiller, 1988. https://doi.org/10.3386/w2506 (Crossref search, fetched 2026-11-27)

## Claimed Edge

Case and Shiller find house price changes positively autocorrelated.

## Post-Publication Decay

Round-trip transaction costs in housing cancel most short-term momentum.

Decay source: The Efficiency of the Market for Single-Family Homes. Case, Shiller, 1988. https://doi.org/10.3386/w2506 (Crossref search, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-longrun](../../03-data-sources/cards/D-longrun.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- KS 16.4

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
