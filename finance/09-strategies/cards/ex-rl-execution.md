# Reinforcement Learning Execution

ID: `ex-rl-execution`
Family: Execution and Portfolio Construction
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Train a PPO or DQN policy on order book states to choose child order sizes and beat TWAP.

## Source

1. Source code in `finance/code/`: 1 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

Qlib reports policies that beat TWAP in backtests; no live record.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[microsoft/qlib](../../08-software/qlib.md)

## Code

- `microsoft/qlib: qlib/rl/order_execution`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
