# DNN-ForwardTesting: A New Trading Strategy Validation using Statistical Timeseries Analysis and Deep Neural Networks

ID: `eq-ax-dnn-forwardtesting-a-new-trading-strategy-validati`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: In this paper, we propose a new trading strategy, called DNN-forwardtesting, that determines the strategy to apply by testing it on the possible future predicted by a deep neural network that has been designed to perform stock price forecasts and trained with the market historical data. Finally, our trading system calculates the most effective technical indicator by applying it to the DNNs predictions and uses such indicator to guide its trades.

## Source

1. DNN-ForwardTesting: A New Trading Strategy Validation using Statistical Timeseries Analysis and Deep Neural Networks. Ivan Letteri and co-authors, 2022, arXiv 2210.11532. https://arxiv.org/abs/2210.11532 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: In general, traders test their trading strategies by applying them on the historical market data (backtesting), and then apply to the future trades the strategy that achieved the maximum profit on such past data. The results confirm that neural networks outperform classical statistical techniques when performing such forecasts, and their predictions allow to select a trading strategy that, when applied to the real future, increases Expectancy, Sharpe, Sortino, and Calmar ratios with respect to the strategy selected through traditional backtesting.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
