# Final-Period Momentum

ID: `pm-late-momentum`
Family: Prediction Markets
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

In the last minutes before a contract closes, follow the direction of the recent price move.

## Source

1. Source code in `finance/code/`: 1 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

The backtest framework ships it with no claim.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Small.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[prediction-market-backtesting](../../08-software/prediction-market-backtesting.md)

## Code

- `prediction-market-backtesting: strategies/final_period_momentum.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
