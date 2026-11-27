# Adaptive Limit Execution

ID: `ex-adaptive-limit`
Family: Execution and Portfolio Construction
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Rest a passive limit order and switch to aggressive when price moves away or a timer expires; fill only when price is better than its mean by a band.

## Source

1. Source code in `finance/code/`: 3 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

Execution logic; saves spread when fills come.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[QuantConnect/Lean](../../08-software/lean.md), [microsoft/qlib](../../08-software/qlib.md), [pysystemtrade](../../08-software/pysystemtrade.md)

## Code

- `microsoft/qlib: qlib/contrib/strategy/rule_strategy.py SBBStrategyEMA`
- `QuantConnect/Lean: Algorithm.Framework/Execution/StandardDeviationExecutionModel.py`
- `pysystemtrade: sysexecution/algos/algo_original_best.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
