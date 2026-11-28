# Deep Reinforcement Learning Trading

ID: `ot-rl-trading`
Family: Other
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Train RL agents such as PPO or SAC to allocate across stocks.

## Source

1. FinRL: A Deep Reinforcement Learning Library for Automated Stock Trading in Quantitative Finance. arXiv. https://arxiv.org/abs/2011.09607 (arXiv abstract page, fetched 2026-11-27)

## Claimed Edge

FinRL reports agents beating index benchmarks in backtests.

## Post-Publication Decay

RL backtests overfit; no live audited record.

Decay source: FinRL: A Deep Reinforcement Learning Library for Automated Stock Trading in Quantitative Finance. arXiv. https://arxiv.org/abs/2011.09607 (arXiv abstract page, fetched 2026-11-27)

## Capacity

Small.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[finrl](../../08-software/finrl.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- code FinRL: finrl/agents/portfolio_optimization/
- code FinRL: finrl/applications/stock_trading/ensemble_stock_trading.py
- code FinRL: finrl/applications/stock_trading/stock_trading.py
- code FinRL: finrl/meta/env_portfolio_allocation/env_portfolio.py

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
