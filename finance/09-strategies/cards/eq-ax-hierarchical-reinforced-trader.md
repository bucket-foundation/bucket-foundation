# Hierarchical Reinforced Trader

ID: `eq-ax-hierarchical-reinforced-trader`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: HRT separates trading into two coordinated decisions: a factorized sparse High-Level Controller (HLC) selects asset-level increase, reduce, or hold directions from compact market and text-derived signals, while a risk-aware Low-Level Controller (LLC) converts these directions into feasible portfolio weight adjustments under turnover, drawdown, and text-risk penalties. Across market-proxy, same-universe portfolio, alpha-only, flat-RL, and hierarchical ablation baselines, HRT delivers the strongest learning-based return--risk--cost trade-off.

## Source

1. Hierarchical Reinforced Trader (HRT): A Bi-Level Approach for Optimizing Stock Selection and Execution. Zijie Zhao and co-authors, 2024, arXiv 2410.14927. https://arxiv.org/abs/2410.14927 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: The full model improves Sharpe from 1.06 for HRT-Base to 1.24, reduces daily turnover from 0.112 to 0.090, and remains stable under transaction-cost stress.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
