# PortBench: A Correlation-Aware

ID: `etf-ax-portbench-a-correlation-aware`
Family: ETFs and Macro
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: Dynamic evaluation uses a class-level correlation score for allocation and CEPS to summarize reference-based stage scores. <!-- voice-ignore-line -->

## Source

1. PortBench: A Correlation-Aware, Full-Pipeline Benchmark for LLM-Driven Portfolio Management. Yuxuan Zhao and co-authors, 2026, arXiv 2605.27887. https://arxiv.org/abs/2605.27887 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: Evaluating ten LLMs reveals a disconnect: high financial QA scores do not ensure consistent portfolio outperformance. LLMs concentrate exposure in correlated assets, and their portfolios achieve higher Sharpe than equal weighting in 54.2\% of 120 evaluations across four market periods.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
