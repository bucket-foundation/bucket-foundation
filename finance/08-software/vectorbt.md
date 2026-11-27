# vectorbt

https://github.com/polakowo/vectorbt · Apache-2.0 with Commons Clause (no resale) · 9,965 stars · last push 2026-11-11 · Python, Numba, optional Rust engine · checked 2026-11-27

## Architecture
Vectorized research library built as pandas accessors (`vectorbt/root_accessors.py`). Modules: `data`, `indicators`, `signals`, `labels`, `portfolio`, `returns`, `records`, `messaging`. `_engine.py` dispatches between Numba and Rust kernels.

## Data Layer
`vectorbt/data/custom.py`: `YFData`, `BinanceData`, `CCXTData`, `AlpacaData`, `GBMData` and `SyntheticData`. `data/updater.py` refreshes data on a schedule.

## Event Loop
No event loop in the common path: whole arrays of signals are simulated at once in `portfolio/nb.py`. `Portfolio.from_order_func` gives a per-bar callback loop compiled with Numba for stateful logic.

## Execution
Simulated. `Portfolio.from_signals`, `from_orders`, `from_holding`, `from_random_signals`, `from_order_func` in `portfolio/base.py`. Fees, fixed fees, slippage, size types and cash sharing across columns.

## Risk
`sl_stop`, `tp_stop`, trailing stops in `from_signals`. Returns accessor gives Sharpe, Sortino, Calmar, drawdowns. Parameter grids make overfitting easy; walk-forward example in `examples/WalkForwardOptimization.ipynb`.

## Strategies Shipped
- `examples/BitcoinDMAC.ipynb`: dual moving average crossover on BTC, heatmap over windows.
- `examples/MACDVolume.ipynb`: MACD grid with volume.
- `examples/PairsTrading.ipynb`: pairs spread z-score, ported from backtrader.
- `examples/PortfolioOptimization.ipynb`: random and PyPortfolioOpt weights, rebalanced.
- `examples/StopSignals.ipynb`: compare stop-loss, trailing and take-profit exits.
- `examples/TradingSessions.ipynb`: trade within session windows.
- `examples/TelegramSignals.ipynb`: scheduled signal scan pushed to Telegram.
- Indicators in `indicators/basic.py`: MA, MSTD, BBANDS, RSI, STOCH, MACD, ATR, OBV. Random and stop signal generators in `signals/generators.py`.

## AI Components
None.

## Connectors
Data only: Yahoo, Binance, CCXT, Alpaca. `messaging/telegram.py` bot for alerts.

## Fit
Fast screening of parameter grids and the Telegram alert pattern match the notify-first layer. Use for research sweeps, then confirm in an event engine.
