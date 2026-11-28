# CLQT: A Closed-Loop

ID: `eq-ax-clqt-a-closed-loop`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: We validate CLQT on a contamination-controlled, year-long multi-model backtest campaign with a 13-configuration ablation grid and a four-week live broker paper-trading track on post-cutoff data. The diagnosis-first read shows that the capability leader is not the Sharpe leader; that agents' allocations systematically fail to follow their own stated analysis, a stating-versus-doing gap stable across both tracks (+0.30 backtest, +0.23 live); and that module value registers on the capability and behavioral axes when returns alone cannot separate it.

## Source

1. CLQT: A Closed-Loop, Cost-Aware, Strategy-Consistent Benchmark for Diagnostic Evaluation of LLM Portfolio-Management Agents. Bo Qu and co-authors, 2026, arXiv 2606.29771. https://arxiv.org/abs/2606.29771 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: LLM agents are increasingly cast as autonomous portfolio managers, yet the dominant evaluation idiom, a leaderboard of returns over a fixed window, certifies neither the soundness of an agent's process nor the durability of its edge: one period's return is dominated by the market path, and apparent alpha can dissolve once look-ahead bias and trading costs are controlled. Net of realistic costs, agents clear defensive baselines but do not cleanly beat the index.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
