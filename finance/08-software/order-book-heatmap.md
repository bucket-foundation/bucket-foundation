# order-book-heatmap

https://github.com/Elenchev/order-book-heatmap. License BSD-2-Clause. Stars 525. Last push 2021-03-09. JavaScript. Checked 2026-11-27.

## Architecture
Browser app bundled by webpack. `lib/` has `BinanceDataFeed.js`, `BinanceOrderBook.js`, `Tick.js`, utilities. `src/` has `Dashboard.js`, `DashboardManager.js`, `UI.js`. `config/binance/` holds endpoint and exchange info.

## Data Layer
Binance websocket depth and trade streams through a custom client. A local book is rebuilt from a REST snapshot plus diffs.

## Event Loop
Websocket messages update the book. A timer samples the book into heatmap columns at a set update interval.

## Execution
None.

## Risk
None.

## Strategies Shipped
None. Views: liquidity heatmap, resting limit orders graph and a buffered time and sales log.

## AI Components
None.

## Connectors
Binance spot.

## Fit
Small visualization of order book depth. Useful as a pattern for local book maintenance. Dormant since 2021.
