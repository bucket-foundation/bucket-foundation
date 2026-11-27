# basana

https://github.com/gbeced/basana. License Apache-2.0 (listed as Other). Stars 878. Last push 2026-11-06. Python. Checked 2026-11-27.

## Architecture
`basana/core/` holds the event model: `event.py`, `event_sources/` (CSV and trading signal), `bar.py`, `pair.py`, `token_bucket.py`, `websockets.py` and a `dispatcher/` package with `BacktestingDispatcher` and `RealtimeDispatcher` on one base class. `basana/backtesting/` is a simulated exchange with order manager, account balances, fees, liquidity limits, margin lending, loan manager and charts. `basana/external/` has adapters for Binance, Bitstamp, CCXT and Yahoo. `samples/strategies/` holds strategy classes.

## Data Layer
Bars, order books, trades and user data from exchange websockets and REST. CSV bar files, with downloader tools for Binance and Bitstamp. Yahoo for equities.

## Event Loop
Async and event driven. The same strategy code runs under the backtesting dispatcher (events in time order from sources) or the realtime dispatcher on asyncio.

## Execution
Exchange adapters create spot and margin orders on Binance (cross and isolated margin) and Bitstamp. The backtesting exchange fills orders against bar data with fee, slippage-like liquidity and margin loan models.

## Risk
Position managers in samples size trades and set stop-loss and target levels. Backtesting enforces balances, liquidity and margin interest. A token bucket limits API rate.

## Strategies Shipped
`samples/strategies/`: SMA, dual moving average crossover (`dmac`), RSI, Bollinger bands and pairs trading.

## AI Components
None.

## Connectors
Binance, Bitstamp, CCXT venues and Yahoo.

## Fit
Clean async framework where one strategy runs in both backtest and live mode. Smaller venue list than Hummingbot or Nautilus, and the code is readable.
