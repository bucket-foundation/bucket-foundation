# TWAP Execution

ID: `ex-twap`
Family: Execution and Portfolio Construction
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Split a parent order into equal child orders across the trading window.

## Source

1. Source code in `finance/code/`: 1 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

Execution benchmark; no return claim.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[microsoft/qlib](../../08-software/qlib.md)

## Code

- `microsoft/qlib: qlib/contrib/strategy/rule_strategy.py TWAPStrategy`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
