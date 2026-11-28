# Fixed-Fractional Position Sizing

ID: `ex-position-sizing`
Family: Execution and Portfolio Construction
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Size each trade so the loss to the stop equals a fixed share of equity, 0.5 to 2 percent.

## Source

1. Source code in `finance/code/`: 1 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

A risk rule; no return claim.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[QuantDinger](../../08-software/quantdinger.md)

## Code

- `QuantDinger: library/strategies/123_quantdinger_alculation_a_position_size_based_on_risk.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
