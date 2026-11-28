# 3S-Trader: A Multi-LLM Framework for Adaptive Stock Scoring

ID: `eq-ax-3s-trader-a-multi-llm-framework-for-adaptive-stock`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: The scoring module summarizes each stock's recent signals into a concise report covering multiple scoring dimensions, enabling efficient comparison across candidates.

## Source

1. 3S-Trader: A Multi-LLM Framework for Adaptive Stock Scoring, Strategy, and Selection in Portfolio Optimization. Kefan Chen and co-authors, 2025, arXiv 2510.17393. https://arxiv.org/abs/2510.17393 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: Compared with existing multi-LLM frameworks and time-series-based baselines, 3S-Trader achieves the highest accumulated return of 131.83% on DJIA constituents with a Sharpe ratio of 0.31 and Calmar ratio of 11.84, while also delivering strong results across other sectors.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
