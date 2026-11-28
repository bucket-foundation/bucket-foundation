# CCXT

https://github.com/ccxt/ccxt. License MIT. Stars 45,005. Last push 2026-11-27. Python, TypeScript, PHP, C#, Go, Java, Rust from one TypeScript source. Checked 2026-11-27.

## Architecture
One base `Exchange` class with a unified method set (`fetch_ohlcv`, `fetch_order_book`, `create_order`, `fetch_balance`, `watch_*` for websockets in ccxt.pro). Each venue is a subclass generated from TypeScript into every language. `exchanges.json` lists 105 venues.

## Data Layer
REST and websocket market data normalized to unified structures: OHLCV arrays, order books, trades, tickers, funding rates.

## Event Loop
None in the library. Async variants (`ccxt.async_support`, `ccxt.pro`) plug into the caller's asyncio loop.

## Execution
Unified order placement, cancel, edit, and query across all venues. Market, limit, stop, and venue-specific params pass through `params`.

## Risk
Built-in rate limiter (`enableRateLimit`). No position risk.

## Strategies Shipped
None.

## AI Components
None in code. Repo ships `AGENTS.md` and `CLAUDE.md` for coding agents.

## Connectors
105 venues: Binance, Bybit, OKX, Coinbase, Kraken, Hyperliquid, dYdX and others. `polymarket.py` adds a prediction-market venue.

## Fit
Standard crypto connector. Freqtrade, Jesse, OctoBot, Superalgos, Lumibot and Haehnchen's bot all sit on it. Use it directly for any crypto leg of the system.
