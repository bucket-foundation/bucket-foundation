# Reinforcement Learning Market Making

ID: `ot-rl-market-making`
Family: Other
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Train a PPO agent to set bid and ask offsets that earn spread under an inventory penalty.

## Source

1. Source code in `finance/code/`: 1 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

Simulation result only.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Small.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[stefan-jansen/machine-learning-for-trading](../../08-software/machine-learning-for-trading.md)

## Code

- `stefan-jansen/machine-learning-for-trading: 21_rl_execution_hedging/03_market_making_ppo.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
