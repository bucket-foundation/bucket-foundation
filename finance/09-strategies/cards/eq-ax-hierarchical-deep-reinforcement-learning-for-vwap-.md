# Hierarchical Deep Reinforcement Learning for VWAP Strategy Optimization

ID: `eq-ax-hierarchical-deep-reinforcement-learning-for-vwap-`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: The Macro Trader first allocates a parent order into tranches based on volume profiles as the traditional VWAP strategy does, but a long short-term memory neural network is used to improve the forecasting accuracy. Many studies have tried to minimize the cost via reinforcement learning, but there are bottlenecks in improvement, for long-duration strategies such as the VWAP strategy.

## Source

1. Hierarchical Deep Reinforcement Learning for VWAP Strategy Optimization. Xiaodong Li and co-authors, 2022, arXiv 2212.14670. https://arxiv.org/abs/2212.14670 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: Our experiments over stocks listed on the Shanghai stock exchange demonstrate that our approach outperforms baselines in terms of VWAP slippage, with an average cost saving of 1.16 base points compared to the optimal baseline.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
