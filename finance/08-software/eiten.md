# eiten

https://github.com/tradytics/eiten. License GPL-3.0. Stars 3,332. Last push 2026-11-24. Python. Checked 2026-11-27.

## Architecture
Command-line portfolio construction tool. `eiten.py` entry, `argchecker.py` options, `strategy_manager.py` selects a strategy, `strategies/` holds four weight generators, `portfolio_manager.py` and `backtester.py` evaluate, `simulator.py` runs Monte Carlo paths, `data_loader.py` fetches prices.

## Data Layer
Downloads daily history through the Yahoo chart endpoint (urllib) for a list in `stocks/`. Returns and covariance matrices are computed in memory.

## Event Loop
None. One batch run per invocation.

## Execution
None. Output is weight tables and plots.

## Risk
Variance-based: minimum variance and maximum Sharpe weights; long-only flag in `portfolio_weight_manager`. Backtest and forward test compare weights against later prices.

## Strategies Shipped
`eigen_portfolio_strategy.py` weights from principal eigenvectors of the covariance matrix, `minimum_variance_strategy.py`, `maximum_sharpe_ratio_strategy.py`, `genetic_algo_strategy.py` which mutates weight vectors for 50 iterations toward the best Sharpe ratio.

## AI Components
None. The genetic search is a numeric optimizer.

## Connectors
Yahoo Finance.

## Fit
Compact reference for four allocation methods and a backtest against held-out days.
