# QuantResearch

https://github.com/letianzj/QuantResearch. License MIT. Stars 3,079. Last push 2023-08-26. Jupyter Notebook. Checked 2026-11-27.

## Architecture
Notebook and script collection. `backtest/` holds strategy scripts that run on the author's `quanttrader` event engine (`on_tick`, `on_fill` handlers); `notebooks/` covers portfolio optimization, VaR, Kalman filters, cointegration pairs, hidden Markov models and RNN prediction; `ml/` holds reinforcement learning notebooks; `dash/` is a Plotly Dash futures app; `market/` has a market profile module.

## Data Layer
CSV end-of-day files in `eod/` and `data/`; `hist_downloader.py` fetches history.

## Event Loop
Event-driven tick handlers in the strategy scripts through the external quanttrader package; notebooks are batch.

## Execution
`ghost_trader.py` is a live-trading demo script; no broker adapter lives in this repo.

## Risk
Value at Risk notebook. Turtle script sizes units by ATR with 2 ATR stops.

## Strategies Shipped
`turtle.py`, `r_breaker.py`, `dual_thrust.py`, `dynamic_breakout_ii.py`, `bollinger_bands.py`, `ma_cross.py`, `ma_double_cross.py`, `mebane_faber_taa.py`, `comdty_roll.py`, `comdty_spread_roll.py`, `portfolio_optimization.py`.

## AI Components
Reinforcement learning notebooks (A3C, Atari example) and an RNN stock predictor.

## Connectors
None in-repo.

## Fit
Readable implementations of classic futures and trend rules with matching blog write-ups.
