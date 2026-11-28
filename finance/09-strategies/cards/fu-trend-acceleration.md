# Trend Acceleration

ID: `fu-trend-acceleration`
Family: Futures and CTA
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Go long when the EWMA crossover forecast is rising over the fast span and short when it is falling.

## Source

1. Source code in `finance/code/`: 1 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

pysystemtrade ships it as a diversifier to trend rules, no standalone claim.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[pysystemtrade](../../08-software/pysystemtrade.md)

## Code

- `pysystemtrade: systems/provided/rules/accel.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
