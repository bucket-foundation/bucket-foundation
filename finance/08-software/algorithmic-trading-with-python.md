# algorithmic-trading-with-python

https://github.com/chrisconlan/algorithmic-trading-with-python. License NOASSERTION. Stars 3,535. Last push 2021-06-01. Python. Checked 2026-11-27.

## Architecture
Book companion. `src/pypm/` is a small library (`data_io.py`, `indicators.py`, `signals.py`, `portfolio.py`, `simulation.py`, `metrics.py`, `optimization.py`, `weights.py`, `labels.py`, `filters.py`, `ml_model/`) driven by top-level scripts such as `simulate_portfolio.py`, `optimize_portfolio.py` and `bootstrap_portfolio.py`. `listings/` holds chapter code from type hints to a machine-learning pipeline.

## Data Layer
CSV files in `data/` (end-of-day prices, SPY, alternative data), read through `data_io.py` into pandas.

## Event Loop
Vectorized pandas simulation stepping day by day in `simulation.py`.

## Execution
None. A `Position` class in chapter 4 tracks simulated trades.

## Risk
`metrics.py` computes maximum drawdown, Calmar ratio, Sharpe, downside volatility and Jensen's alpha. Position sizing is a weights module.

## Strategies Shipped
SMA, MACD, Bollinger and Chaikin money flow signal examples; grid-search parameter optimizer; white-noise and bootstrap preference matrices as significance tests; triple-barrier labels with a CUSUM filter and a classifier simulation.

## AI Components
Scikit-learn pipeline in `ml_model/` with cross-validation.

## Connectors
None; local files.

## Fit
Teaching code for backtest hygiene, with null-model checks for parameter searches.
