# BBGO

https://github.com/c9s/bbgo. License AGPL-3.0. Stars 1,682. Last push 2026-11-27. Go. Checked 2026-11-27.

## Architecture
Go framework. `pkg/strategy/` holds about 60 strategy packages registered by name, `pkg/exchange/` one adapter per venue behind a shared `types.Exchange` interface, plus `pkg/bbgo` for the session, order executor, position and profit tracking. Apps: web frontend, backtest report, desktop.

## Data Layer
Exchange stream plus a MySQL or SQLite store of klines and trades for backtests; a shared market data store is synced per symbol.

## Event Loop
Per-session stream callbacks (kline closed, book update, order update) feed each strategy; a backtest exchange replays stored klines through the same callbacks.

## Execution
GeneralOrderExecutor with order-store, position and trade-collector; active order book reconciles open orders.

## Risk
Position stop-loss and take-profit helpers, max loss limits, a `sentinel` strategy and `xbalance` for inventory moves.

## Strategies Shipped
`grid`, `grid2`, `bollgrid`, `bollmaker`, `liquiditymaker`, `xmaker` (cross-exchange maker), `xfunding`, `dca`, `dca2`, `supertrend`, `emacross`, `rebalance`, `tri` (triangular arbitrage), `harmonic`, `elliottwave`, `pivotshort`, `drift`, `trendtrader`, `rsmaker`, `scmaker`.

## AI Components
None.

## Connectors
Binance, Bitget, Bybit, Coinbase, KuCoin, MAX, OKX, Backpack and others.

## Fit
One of the largest open Go bot frameworks and a good model for a strategy registry plus exchange interface with backtest parity.
