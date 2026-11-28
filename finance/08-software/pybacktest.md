# pybacktest

https://github.com/ematvey/pybacktest. License MIT. Stars 825. Last push 2021-11-11. Python. Checked 2026-11-27.

## Architecture
Small package: `backtest.py` (`Backtest`), `parts.py` (signal to position to equity helpers), `performance.py`, `optimizer.py`, `verification.py`, `production.py`, `data.py`. The README states the author no longer maintains it.

## Data Layer
pandas OHLC frames passed in by the caller. `data.py` has Yahoo helpers.

## Event Loop
Vectorized. A strategy is a function returning boolean Series named `buy`, `sell`, `short` and `cover`, with optional price Series.

## Execution
Simulated fills at the given price series. `production.check_position_change` reports whether the last bar changed the target position so the caller can send an order.

## Risk
None. `performance.py` reports Sharpe, Sortino, Ulcer index, UPI and a Monte Carlo max drawdown (`mcmdd`).

## Strategies Shipped
None in the package. The tutorial notebook shows a moving average cross.

## AI Components
None.

## Connectors
None.

## Fit
Compact vectorized backtest template. `verification.iter_verify` checks a strategy for lookahead by replaying it on growing windows, which is worth reusing.
