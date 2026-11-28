# Probability Threshold Cross

ID: `pm-threshold-cross`
Family: Prediction Markets
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Buy a contract when its price crosses a fixed probability level, betting the move continues.

## Source

1. Source code in `finance/code/`: 2 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

The backtest framework ships it with no claim.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Small.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[lumibot](../../08-software/lumibot.md), [prediction-market-backtesting](../../08-software/prediction-market-backtesting.md)

## Code

- `prediction-market-backtesting: strategies/threshold_momentum.py`
- `lumibot: lumibot/example_strategies/polymarket_prediction_contract.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
