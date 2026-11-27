# Regime-Based Portfolio Allocation Using Hidden Markov Models and Reinforcement Learning

ID: `fu-ax-regime-based-portfolio-allocation-using-hidden-mar`
Family: Futures and CTA
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: State-conditional analysis shows that SPY dominates in stable regimes, while TLT and GLD provide protection during stressed periods, motivating regime-conditioned allocation rules. We evaluate rule-based rotation and RL-driven strategies using a 30% out-of-sample test window with a one-day execution lag to avoid look-ahead bias.

## Source

1. Regime-Based Portfolio Allocation Using Hidden Markov Models and Reinforcement Learning. Ajay Kumar Verma and co-authors, 2026, arXiv 2605.27848. https://arxiv.org/abs/2605.27848 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: Both HMM-based allocations outperform a passive SPY benchmark, while the RL policy achieves the highest risk-adjusted performance, delivering the strongest Sharpe ratio and materially lower drawdowns, yet remains fully interpretable through discrete regime-dependent actions.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
