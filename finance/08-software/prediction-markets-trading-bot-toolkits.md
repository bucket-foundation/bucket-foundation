# Prediction-Markets-Trading-Bot-Toolkits

https://github.com/tarpboi/Prediction-Markets-Trading-Bot-Toolkits. License MIT. Stars 540. Last push 2026-11-24. Rust. Checked 2026-11-27.

## Architecture
Crate `polymarket-toolkits`. `src/bot/` has ten bots selected by `BotKind` and a shared `runtime.rs` (1,597 lines). `src/service/` holds `clob`, `venue` (`OrderVenue` and `LimitVenue` traits), `order_executor`, `risk_guard`, `position_monitor`, `position_store`, `market_cache`, `spot`, `onchain`, `predict_fun`, `polymarket_read`.

## Data Layer
Order books over websocket and REST, spot price feed, on-chain reads, wallet trade feeds. Positions persist through `position_store`.

## Event Loop
Tokio async tasks per bot; each bot has a `run(cfg)` entry that reacts to book or wallet events.

## Execution
Venue-agnostic adapter traits. Predict.fun is the main venue, Polymarket supports copy trading and cross-venue legs. Cargo description states live orders are untested.

## Risk
`risk_guard.rs`: circuit breaker on consecutive large trades per token plus an order book depth check. Config gate `live_trading_allowed` separates paper from live. Per-wallet spending buckets in the whale bot.

## Strategies Shipped
Copy trading, BTC up/down arbitrage, cross-venue arbitrage, directional arbitrage, spread farming, sports execution, resolution sniper, order book imbalance, market making, whale signal.

## AI Components
None.

## Connectors
Predict.fun and Polymarket.

## Fit
Compact Rust bot set with a clean venue trait. Treat performance claims in the README with caution.
