# spectre

https://github.com/Heerozh/spectre. License GPL-3.0. Stars 970. Last push 2026-11-05. Python. Checked 2026-11-27.

## Architecture
Two packages. `spectre/factors/` is a factor engine (`FactorEngine` in `engine.py`) with `basic`, `technical`, `statistical`, `filter`, `label` and `datafactor` modules, built on PyTorch tensors. `spectre/trading/` is an event-driven backtester: `CustomAlgorithm` in `algorithm.py`, `SimulationBlotter` and `ManualBlotter` in `blotter.py`, `portfolio.py`, `position.py`, `stopmodel.py`, `calendar.py` and `event.py`. `spectre/data/` has loaders and `spectre/plotting/` has charts.

## Data Layer
Loaders: Arrow files, CSV, in-memory frames, Yahoo, Quandl and an S&P 500 list. Results come back as pandas frames indexed by date and asset.

## Event Loop
Event-driven. `EventManager` dispatches `MarketOpen`, `MarketClose`, `EveryBarData` and `Always` events to scheduled callbacks on the algorithm. The factor engine computes all assets in batch, optionally on CUDA through `to_cuda()`.

## Execution
`SimulationBlotter` fills orders with commission, slippage and daily price-limit (curb) models, and supports `batch_order_target_percent`. `ManualBlotter` records orders for hand execution. No live broker adapter.

## Risk
Stop models: fixed, trailing, PnL-decay trailing and time-decay trailing stops. Commission and slippage models. No account-level kill switch.

## Strategies Shipped
`examples/dual_ema_on_apple.py` and `examples/smart_beta.py` (weight by dollar volume, rebalanced before close).

## AI Components
None.

## Connectors
Yahoo and Quandl downloaders. No brokers.

## Fit
Fast cross-sectional factor research and daily-bar backtests with GPU support. GPL-3.0 limits reuse in closed code. Benchmarks against Zipline ship as notebooks.
