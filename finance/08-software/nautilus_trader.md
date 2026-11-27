# NautilusTrader

https://github.com/nautechsystems/nautilus_trader · LGPL-3.0 · 31,860 stars · last push 2026-11-27 · Rust core with Python bindings · checked 2026-11-27

## Architecture
Event-driven engine with the same code path for backtest and live. Rust crates in `crates/`: `model`, `core`, `data`, `execution`, `risk`, `portfolio`, `trading`, `backtest`, `live`, `persistence`, `indicators`, `network`, `adapters`. Python package in `python/nautilus_trader` built through `crates/pyo3`. A `NautilusKernel` wires a message bus, cache, data engine, execution engine and risk engine.

## Data Layer
Typed market data: quote ticks, trade ticks, bars, L1 to L3 order book deltas, instrument status, custom data. Parquet data catalog in `crates/persistence`. Historical feeds through Databento, Tardis, CoinAPI, FinFeed adapters. Information-driven bars (value, volume, tick) supported.

## Event Loop
Single-threaded message bus with deterministic clock in backtest and real clock in live. Strategies subscribe and react through `on_quote_tick`, `on_trade_tick`, `on_bar`, `on_order_book_deltas`, `on_order_filled` handlers (`crates/trading/src/strategy`).

## Execution
`crates/execution` holds order management, emulated order types (trailing stop, OCO, OTO, bracket), and per-venue execution clients. Backtest matching engine simulates queue position and L2/L3 fills.

## Risk
`crates/risk/src/engine`: pre-trade checks on every order, `max_order_submit` and `max_order_modify` rate limits, `max_notional_per_order` per instrument, trading state switch (ACTIVE, REDUCING, HALTED), `bypass` flag. Position sizing helpers in `crates/risk/src/sizing.rs`.

## Strategies Shipped
- `crates/trading/src/examples/strategies/ema_cross/strategy.rs`: dual EMA crossover.
- `.../grid_mm/strategy.rs`: symmetric limit-order grid around mid with inventory skew, requote on bps threshold.
- `.../composite_market_maker/strategy.rs`: one bid and one ask around mid, skewed by a synthetic-instrument signal residual and inventory.
- `.../orderbook_imbalance/strategy.rs`: take the thinner best quote when book imbalance exceeds a ratio.
- `.../delta_neutral_vol/strategy.rs`: short OTM strangle, delta hedged with the perpetual on threshold or timer.
- `.../hurst_vpin_directional/strategy.rs`: Hurst regime filter on dollar bars plus VPIN flow signal, entries gated by quotes.
- `examples/live/architect_ax/strategies.py`: Bollinger Band mean reversion.
- `examples/backtest/`: Kalshi NFL EMA cross, Polymarket book imbalance, FX market maker, crypto EMA cross and book imbalance, Tardis option chain.

## AI Components
None in the engine. Repo ships `AGENTS.md`, `CLAUDE.md`, `AI_POLICY.md` for coding agents.

## Connectors
`crates/adapters/`: Interactive Brokers, Binance, Bybit, OKX, Kraken, Coinbase, Deribit, dYdX, Hyperliquid, Lighter, Derive, Architect AX, Betfair, Polymarket, Kalshi, Databento, Tardis, CoinAPI, FinFeed, blockchain, sandbox.

## Fit
Best candidate for the live execution core once a strategy clears paper: one engine covers IBKR, crypto venues, Polymarket and Kalshi with a hard pre-trade risk engine. Steep learning curve.
