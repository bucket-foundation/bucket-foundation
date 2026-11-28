# hftbacktest

https://github.com/nkaz001/hftbacktest. License MIT. Stars 5,146. Last push 2025-12-23. Rust core with Python bindings (`py-hftbacktest`, Numba). Checked 2026-11-27.

## Architecture
`hftbacktest/src/backtest`: exchange and local processors with separate latency paths, depth books, order state, recorder. `models/` holds fee, latency and queue-position models. `live/` reuses the same bot trait for live trading through `connector/`.

## Data Layer
Full tick data: L2 depth diffs and trades, L3 order-by-order. `collector/` records Binance, Bybit and Hyperliquid feeds to files.

## Event Loop
Event-driven over every feed and order-response timestamp; strategies call `elapse` or `wait_next_feed`.

## Execution
Limit and market orders with queue position estimation (probability queue models), feed and order latency, maker and taker fees.

## Risk
Strategy-level position limits in examples.

## Strategies Shipped
`examples/` notebooks: GLFT market making, high-frequency grid trading, grid across exchanges, market making with alpha from order-book imbalance, basis, and APT; queue-based market making in large-tick assets; multi-market making.

## AI Components
None.

## Connectors
Live: Binance Futures, Binance Spot, Bybit; examples for Hyperliquid and MEXC.

## Fit
Only open backtester here with realistic queue and latency for market making. Relevant if the system ever quotes on crypto or prediction-market books.
