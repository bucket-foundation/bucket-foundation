# QuantPy

https://github.com/jsmidt/QuantPy. License BSD-4-Clause. Stars 1,086. Last push 2023-05-25. Python. Checked 2026-11-27.

## Architecture
Small analysis library of four modules in `quantpy/`: `portfolio.py` (a `Portfolio` class), `technical_indicators.py`, `event_profiler.py` and `fundamental_indicators.py` (a stub with `peg`). `quantpy/gui/` holds a small app. Examples in `examples/`, one unit test file in `tests/unit`.

## Data Layer
Pandas DataFrames. `Portfolio` pulls prices through `pandas.io.data.DataReader`, a module removed from current pandas, so data loading needs porting.

## Event Loop
None. Scripts call the functions directly.

## Execution
None.

## Risk
Mean-variance tools in `Portfolio`: betas against a benchmark (`^GSPC` default), covariance, Sharpe-optimal weights, minimum-variance weights for a target return, and an efficient frontier plot.

## Strategies Shipped
None. The event profiler measures average asset behavior around boolean event dates.

## AI Components
None.

## Connectors
Yahoo through the legacy pandas reader.

## Fit
Dated teaching code. Indicators (SMA, EMA, MACD, full stochastic) and the frontier math are covered better by PyPortfolioOpt and pandas-ta-classic. Last push in 2023 and the legacy data import make it a reading reference only.
