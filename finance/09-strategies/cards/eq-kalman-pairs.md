# Kalman Filter Pairs

ID: `eq-kalman-pairs`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Estimate a time-varying hedge ratio with a Kalman filter and trade the residual spread.

## Source

1. Pairs trading. Elliott and co-authors, 2005, Quantitative Finance. https://doi.org/10.1080/14697680500149370 (Crossref search, fetched 2026-11-27)
2. Source code in `finance/code/`: 1 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

Elliott, van der Hoek and Malcolm 2005 modeled spreads as a mean-reverting state process.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[Financial-Models-Numerical-Methods](../../08-software/financial-models-numerical-methods.md)

## Code

- `Financial-Models-Numerical-Methods: src/FMNM/Kalman_filter.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
