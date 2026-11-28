# Diverse Approaches to Optimal Execution Schedule Generation

ID: `etf-ax-diverse-approaches-to-optimal-execution-schedule-g`
Family: ETFs and Macro
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: Rather than searching for a single optimal policy, MAP-Elites generates a diverse portfolio of regime-specialist strategies indexed by liquidity and volatility conditions.

## Source

1. Diverse Approaches to Optimal Execution Schedule Generation. Robert de Witt and co-authors, 2026, arXiv 2601.22113. https://arxiv.org/abs/2601.22113 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: Within this environment, two Proximal Policy Optimization architectures - both MLP and CNN feature extractors - demonstrate large improvements over industry baselines, with the CNN variant achieving 2.13 bps arrival slippage versus 5.23 bps for VWAP on 4,900 out-of-sample orders ($21B notional).

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
