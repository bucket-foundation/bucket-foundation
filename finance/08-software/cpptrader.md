# CppTrader

https://github.com/chronoxor/CppTrader. License MIT. Stars 1,102. Last push 2026-11-05. C++. Checked 2026-11-27.

## Architecture
Header and source library under `include/trader` and `source/trader`. `matching/` holds `MarketManager`, `OrderBook`, `Level`, `Order`, `Symbol` and a `MarketHandler` callback interface. `providers/nasdaq/itch_handler` parses NASDAQ ITCH feeds. `examples/`, `performance/` and `tests/` (Catch2) sit beside it.

## Data Layer
In-memory order books with price levels held in intrusive trees. ITCH replay input from `tools/itch/sample.itch`. No database.

## Event Loop
Synchronous and single-threaded. Callers feed add, reduce, modify, replace and delete calls; the manager fires handler callbacks for each book, level and order change.

## Execution
A matching engine. Order types: market, limit, stop, stop-limit, trailing stop and trailing stop-limit. Time in force: GTC, IOC, FOK, AON. Matching can run automatically or in manual mode, and `MitigateOrder` changes price and quantity of a resting order.

## Risk
None. Errors return an `ErrorCode` for invalid orders and symbols.

## Strategies Shipped
None.

## AI Components
None.

## Connectors
NASDAQ ITCH handler only.

## Fit
Reference for exchange-side components: matching engine, order book processor and ITCH decoding. Use it to build a simulated venue for backtests or to study price-time priority. It places no orders on a live market.
