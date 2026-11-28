# Model-Free Reinforcement Learning for Asset Allocation

ID: `etf-ax-model-free-reinforcement-learning-for-asset-alloca`
Family: ETFs and Macro
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: From our analysis, RL agents can perform the task of portfolio management since they by a wide margin outperformed two of the baseline agents (random allocation and uniform allocation). We trained several RL agents on real-world stock prices to learn how to perform asset allocation.

## Source

1. Model-Free Reinforcement Learning for Asset Allocation. Adebayo Oshingbesan and co-authors, 2022, arXiv 2209.10458. https://arxiv.org/abs/2209.10458 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: Four RL agents (A2C, SAC, PPO, and TRPO) outperformed the best baseline, MPT, overall. This shows the abilities of RL agents to uncover more profitable trading strategies.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
