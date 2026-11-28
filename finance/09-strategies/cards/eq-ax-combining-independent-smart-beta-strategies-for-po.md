# Combining Independent Smart Beta Strategies for Portfolio Optimization

ID: `eq-ax-combining-independent-smart-beta-strategies-for-po`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: We explore the idea of applying a smart strategy in reverse, yielding a "bad beta" portfolio which can be shorted, thus allowing long and short positions on independent smart beta strategies to generate beta neutral returns. In this article we detail the construction of a monthly reweighted portfolio involving two independent smart beta strategies; the first component is a long-short beta-neutral strategy derived from running an adaptive boosting classifier on a suite of momentum indicators. <!-- voice-ignore-line -->

## Source

1. Combining Independent Smart Beta Strategies for Portfolio Optimization. Phil Maguire and co-authors, 2018, arXiv 1808.02505. https://arxiv.org/abs/1808.02505 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: Working off a market benchmark Sharpe Ratio of 0.42, we find that the market neutral component achieves a ratio of 0.61, the low volatility approach achieves a ratio of 0.90, while the combined leveraged strategy achieves a ratio of 0.96. In six months of live trading, the combined strategy achieved a Sharpe Ratio of 1.35.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
