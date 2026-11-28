# godzilla-community

https://github.com/godzilla-foundation/godzilla-community. License Apache-2.0. Stars 393. Last push 2026-10-25. C++ and Python. Checked 2026-11-27.

## Architecture
Fork lineage of the Kungfu trading system. `core/cpp/yijinjing` (journal, nanomsg sockets, master, hero and apprentice processes), `core/cpp/wingchun` (strategy context and runner, book, ledger, bar service, broker market data and trader interfaces, algo service, pybind), `core/extensions` (Binance C++ API, mock replay) and `core/python/extensions` (Binance portfolio margin, OKX, Gate, XTC). `strategies/` and `scripts/` hold examples.

## Data Layer
Memory-mapped journals written by yijinjing; ledger and book services; CSV replay server for mock market data.

## Event Loop
Event driven. Each strategy process gets callbacks (`on_depth`, `on_ticker`, `on_transaction`, `on_order`, `on_trade`, `on_position`) from journal readers. The README states a median tick-to-trade latency of about 125 microseconds.

## Execution
`context.insert_order`, `cancel_order` and `query_order` route to venue trader extensions. `startup.py` generates pm2 start scripts per strategy.

## Risk
Account book tracks active orders and positions. `metric_controller` in wingchun. No separate risk engine found.

## Strategies Shipped
`strategies/triangular_arbitrage`, `binance_delisting_monitor`, `trap_screener` (Binance perp universe, funding, open interest and market cap scan), `demo_future.py`, `demo_spot.py`, benchmark strategies.

## AI Components
None.

## Connectors
Binance spot and futures, Binance portfolio margin, OKX, Gate, XTC.

## Fit
Low-latency C++ core for funding rate arbitrage and market making on crypto venues. Heavy to build; the journal design is the useful reference.
