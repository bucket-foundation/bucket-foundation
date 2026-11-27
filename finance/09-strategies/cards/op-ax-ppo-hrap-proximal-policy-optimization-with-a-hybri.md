# PPO-HRAP: Proximal Policy Optimization with a Hybrid Regime-Aware Policy for Risk-Controlled Trading

ID: `op-ax-ppo-hrap-proximal-policy-optimization-with-a-hybri`
Family: Options and Volatility
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: Profit-only policies can collapse toward passive long exposure on upward-drifting assets, while aggressively risk-penalized rewards can become too defensive during volatile periods. On the held-out 2020-2022 SPY test window, PPO-HRAP achieves 27.62% total return, 8.48% annualized return, 0.6447 Sharpe ratio, 0.8588 Sortino ratio, and 0.4592 Calmar ratio, while reducing maximum drawdown from 34.10% for Buy and Hold to 18.47%.

## Source

1. PPO-HRAP: Proximal Policy Optimization with a Hybrid Regime-Aware Policy for Risk-Controlled Trading. Duong Hien Chi Kien and co-authors, 2026, arXiv 2610.01325. https://arxiv.org/abs/2610.01325 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: Across five SPY seeds, PPO-HRAP remains stable with mean total return $0.2725 \pm 0.0109$ and mean Sharpe ratio $0.6219 \pm 0.0565$. Single-run cross-asset tests on QQQ and DIA further show that the proposed method ranks first on total return and Sharpe ratio for all three reported assets.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
