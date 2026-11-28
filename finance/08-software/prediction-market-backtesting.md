# prediction-market-backtesting

https://github.com/evan-kolberg/prediction-market-backtesting. License LGPL-3.0 plus MIT parts (GitHub reports NOASSERTION). Stars 1,276. Last push 2026-05-16. Python with Rust crates. Checked 2026-11-27.

## Architecture
Extension for NautilusTrader. `prediction_market_extensions/` adds Kalshi and Polymarket adapters and binary-contract instruments; `strategies/` hold Nautilus `Strategy` subclasses on a `LongOnlyPredictionMarketStrategy` base; `backtests/` hold runners and optimizers (grid and TPE).

## Data Layer
Order-book replays from PMXT and Telonex archives, trade replays, bar data.

## Event Loop
NautilusTrader event engine.

## Execution
Nautilus simulated matching with book depth; `live/` sandboxes for BTC snapshot models.

## Risk
Long-only base with position size configs; Nautilus risk engine.

## Strategies Shipped
`strategies/`: binary_pair_arbitrage, breakout, deep_value hold, ema_crossover, final_period_momentum, late_favorite_limit_hold, mean_reversion, microprice_imbalance, panic_fade, passive_pair_accumulation, rsi_reversion, threshold_momentum, vwap_reversion, account_trade_replay. Runners: BTC 5-minute late favorite taker hold, BTC 5-minute pair arbitrage, book EMA optimizer.

## AI Components
None.

## Connectors
Kalshi and Polymarket data; Nautilus adapters for live.

## Fit
Ready backtest bench for the late-favorite and pair-arbitrage edges in `06-youtube/SYNTHESIS.md`.
