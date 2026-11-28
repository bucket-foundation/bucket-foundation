# barter-rs

https://github.com/barter-rs/barter-rs. License MIT. Stars 2,379. Last push 2026-08-24. Rust. Checked 2026-11-27.

## Architecture
Workspace of crates: `barter` (engine, strategy, risk, statistics, backtest, system builder), `barter-data` (market streams), `barter-execution` (order clients), `barter-instrument` (indexed exchange, asset, instrument), `barter-integration`, `barter-macro`.

## Data Layer
`barter-data` normalizes websocket trades and L1 and L2 books for Binance, Bitfinex, Bitmex, Bybit, Coinbase, Gate.io, Kraken and OKX. `books/` maintains local order books. Historic data for backtests loads from files.

## Event Loop
Synchronous `Engine` consuming an event feed, with an async system wrapper running data, execution and engine on tokio tasks. The same engine runs live and backtest, with audit streams and replica state.

## Execution
`barter/src/execution/manager.rs` routes order requests to per-exchange clients in `barter-execution`; a mock exchange simulates fills.

## Risk
`RiskManager` trait checks each generated order before dispatch; examples show open-order checks. `OnDisconnect` and `OnTradingDisabled` strategy hooks.

## Strategies Shipped
Traits `AlgoStrategy` and `ClosePositionsStrategy`; examples only, no tuned strategy.

## AI Components
None.

## Connectors
Eight exchanges for data, mock execution; real execution clients are limited.

## Fit
Best Rust reference for event-driven engine design with state replication and live-backtest parity. Real order routing is thin.
