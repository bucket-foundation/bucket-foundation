# Financially Guided Deep Portfolio Optimization

ID: `eq-ax-financially-guided-deep-portfolio-optimization`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: Our expanding-window walk-forward procedure, applied to 50 S&P 500 stocks from 2007 to 2023, incorporates realistic bid-ask spread costs and rebalances quarterly.

## Source

1. Financially Guided Deep Portfolio Optimization. Rahul Fernandes and co-authors, 2026, arXiv 2605.28853. https://arxiv.org/abs/2605.28853 (arXiv API, fetched 2026-11-27)
2. Published version: https://doi.org/10.1109/CIFEr67845.2026.11692398 (DOI listed by the arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: We propose an end-to-end framework that directly optimizes differentiable surrogates of key financial metrics (Sharpe ratio, Omega ratio, Conditional Value-at-Risk, and risk parity), allowing neural networks to learn portfolio weights via backpropagation. On the challenging out-of-sample test period (2022-2023), the best model, an AttentionLSTM with the Omega-CVaR-RiskParity loss, achieves an annualized Sharpe of 0.29 and a total compounded return of +7.86%, while the S&P 500 delivers -4.52% total compounded return and an annualized Sharpe of -0.02.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
