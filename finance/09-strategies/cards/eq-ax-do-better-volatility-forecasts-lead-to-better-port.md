# Do Better Volatility Forecasts Lead to Better Portfolios? Evidence from Graph Neural Networks

ID: `eq-ax-do-better-volatility-forecasts-lead-to-better-port`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: Using weekly realized volatility for 465 S&P 500 equities from 2015-2025, Heterogeneous Autoregressive and Long Short-Term Memory baselines are compared against GraphSAGE models built on rolling correlation, sector, and Granger-causal graphs, with and without macro regime features. Graph volatility models add value only when the portfolio rule can exploit the cross-sectional structure they encode.

## Source

1. Do Better Volatility Forecasts Lead to Better Portfolios? Evidence from Graph Neural Networks. Rylan Wade, 2026, arXiv 2605.19278. https://arxiv.org/abs/2605.19278 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: The empirical finding is that the model with the lowest forecast MSE, the model with the highest cross-sectional ranking accuracy, and the model with the highest portfolio Sharpe ratio are three different models.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
