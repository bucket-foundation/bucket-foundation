# Backtesting.py

https://github.com/kernc/backtesting.py · AGPL-3.0 · 9,308 stars · last push 2026-08-05 · Python · checked 2026-11-27

## Architecture
One-asset backtester in a single module, `backtesting/backtesting.py` (classes `Strategy`, `Backtest`, `_Broker`, `Order`, `Trade`, `Position`). Helpers in `backtesting/lib.py` (`crossover`, `resample_apply`, `SignalStrategy`, `TrailingStrategy`, `FractionalBacktest`, `MultiBacktest`). Stats in `_stats.py`, Bokeh plots in `_plotting.py`.

## Data Layer
A pandas DataFrame with Open, High, Low, Close, Volume columns. No downloader; bundled sample data `GOOG`, `EURUSD`, `BTCUSD`.

## Event Loop
`init()` precomputes indicators via `self.I()`, then `next()` runs per bar. Orders fill on next bar open, or at close with `trade_on_close=True`.

## Execution
Simulated only: market, limit, stop, stop-limit, SL and TP on orders, commission (fixed or callable), spread, margin and hedging flags, exclusive orders. No live broker.

## Risk
Per-order SL and TP, `TrailingStrategy` ATR trailing stop, position sizing by fraction of equity. Stats include max drawdown, Sharpe, Sortino, Calmar, SQN, Kelly criterion, alpha and beta.

## Strategies Shipped
- `doc/examples/Quick Start User Guide.py`: SmaCross, 10 and 20 SMA crossover.
- `doc/examples/Strategies Library.py`: SmaCross via `SignalStrategy` with `TrailingStrategy` stop.
- `doc/examples/Parameter Heatmap & Optimization.py`: Sma4Cross, two fast SMAs for entry and two for exit, optimized on a grid.
- `doc/examples/Multiple Time Frames.py`: long when daily RSI and weekly RSI exceed 70 with 10>20>50>100 SMA stack, 8% stop.
- `doc/examples/Trading with Machine Learning.py`: MLTrainOnceStrategy, kNN classifier predicts next move with SL and TP; MLWalkForwardStrategy retrains every 20 bars.

## AI Components
None built in; ML example only.

## Connectors
None.

## Fit
Fastest way to test a single-asset rule. Optimizer uses grid or SAMBO search, which invites overfitting; pair with deflated Sharpe from mlfinlab. AGPL-3.0 matters if served over a network.
