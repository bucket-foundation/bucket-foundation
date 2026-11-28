# btrader

https://github.com/gabriel-milan/btrader. License GPL-3.0. Stars 331. Last push 2021-05-30. Rust. Checked 2026-11-27.

## Architecture
Single crate in `src/`: `trader.rs` (struct `bTrader`, built from a config file), `depth_cache.rs`, `calculation_cluster.rs`, `triangular_relationship.rs`, `trading_pair.rs`, `config.rs`, `telegram.rs`. Docker build scripts included.

## Data Layer
`DepthCache` keeps a local order book per symbol from a Binance snapshot plus depth diff stream.

## Event Loop
Threads fed by depth events. `CalculationCluster` workers evaluate each triangular relationship and call `execute_deal` on a hit. Built on tokio 0.2.

## Execution
Three legs per cycle on Binance through the `binance` crate. Quantities are rounded to exchange step size.

## Risk
`trading_profit_threshold` gates deals, `trading_age_threshold` rejects stale depth, and investment min, max and step bound the size. The taker fee is applied cubed in the profit calculation.

## Strategies Shipped
Triangular arbitrage: `calculate_relationship` sweeps investment sizes and keeps the best fee-adjusted result.

## AI Components
None.

## Connectors
Binance REST and WebSocket, Telegram alerts.

## Fit
Compact triangular arbitrage reference. Unmaintained since 2021.
