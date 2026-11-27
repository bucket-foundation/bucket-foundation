# FinQuant

https://github.com/fmilthaler/FinQuant. License MIT. Stars 1,849. Last push 2023-11-04. Python. Checked 2026-11-27.

## Architecture
Library `finquant/`: `portfolio.py` (Portfolio and stock containers), `efficient_frontier.py` (scipy minimization), `monte_carlo.py`, `moving_average.py`, `quants.py` (return, volatility, Sharpe, Sortino, VaR), `market.py`.

## Data Layer
Fetches prices through yfinance or reads CSVs into pandas.

## Event Loop
None; batch computation.

## Execution
None.

## Risk
Value at risk, Sortino, Treynor and Sharpe ratios computed on a portfolio.

## Strategies Shipped
Monte Carlo and efficient-frontier optimizers; moving-average band plots.

## AI Components
None.

## Connectors
yfinance.

## Fit
Small portfolio analytics library; last push 2023.
