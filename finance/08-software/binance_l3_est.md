# binance_l3_est

https://github.com/OctopusTakopi/binance_l3_est. License MIT. Stars 304. Last push 2026-07-12. Rust. Checked 2026-11-27.

## Architecture
Rust desktop app. `src/network/` (WebSocket and REST client, SBE decoding), `src/engine/` (`order_book.rs`, `fast_order_book.rs`, `simd_queue.rs`, `feature_engine.rs`, `kmeans.rs`, `twap.rs`, `heatmap.rs`, `metrics.rs`), `src/ui/` with heatmap, liquidity, metrics, order book and TWAP windows. Criterion benches in `benches/`.

## Data Layer
Binance spot and futures depth snapshot plus the SBE depth stream, held as tick-indexed levels.

## Event Loop
Background network task feeding an order book update path, drawn by an immediate-mode UI.

## Execution
None.

## Risk
None. Microstructure indicators: order-to-trade and cancel-to-trade ratios.

## Strategies Shipped
None. Analysis tools: L3 queue estimate from L2 changes, K-Means clustering of participants, TWAP detector.

## AI Components
K-Means clustering only.

## Connectors
Binance WebSocket SBE stream and REST depth.

## Fit
Order book analytics for crypto venues. The L3 estimate method applies to any L2 feed.
