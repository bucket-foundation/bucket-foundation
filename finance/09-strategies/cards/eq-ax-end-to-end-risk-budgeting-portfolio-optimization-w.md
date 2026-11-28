# End-to-End Risk Budgeting Portfolio Optimization with Neural Networks

ID: `eq-ax-end-to-end-risk-budgeting-portfolio-optimization-w`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: Yet, the two-step procedure sometimes encounter the "error maximization" problem where inaccuracy in parameter estimation translates to unwise allocation decisions. In this paper, we combine the prediction and optimization tasks in a single feed-forward neural network and implement an end-to-end approach, where we learn the portfolio allocation directly from the input features.

## Source

1. End-to-End Risk Budgeting Portfolio Optimization with Neural Networks. Ayse Sinem Uysal and co-authors, 2021, arXiv 2107.04636. https://arxiv.org/abs/2107.04636 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: The model-based end-to-end framework provides stable performance in the out-of-sample (2017-2021) tests when maximizing Sharpe ratio is used as the training objective function, achieving a Sharpe ratio of 1.16 when nominal risk parity yields 0.79 and equal-weight fix-mix yields 0.83. The gated end-to-end with filter outperforms the nominal risk-parity benchmarks with naive filtering mechanism, boosting the Sharpe ratio of the out-of-sample period (2017-2021) to 1.24 in the market data. <!-- voice-ignore-line -->

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
