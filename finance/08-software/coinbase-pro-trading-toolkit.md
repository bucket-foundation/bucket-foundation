# coinbase-pro-trading-toolkit

https://github.com/coinbase/coinbase-pro-trading-toolkit. License Apache-2.0. Stars 903. Last push 2020-01-16. TypeScript. Checked 2026-11-27.

## Architecture
Node streams library in `src/`. `core/` holds stream parts: `LiveOrderbook`, `Trader`, `Triggers`, `MessageQueue`, `RateLimiter`, `HFTFilter`, `ProductFilter`, `ProductSplitter` and `ExchangeRateFilter`. `exchanges/` has a feed and API class per venue. `factories/` builds feeds, `FXService/` supplies currency rates, `consoles/` has a Coinbase Pro console and `samples/` has runnable demos. The repo is marked deprecated.

## Data Layer
Websocket feeds normalized to shared message types, REST for snapshots. `LiveOrderbook` rebuilds a full book from feed messages. FX rates from CoinMarketCap, Open Exchange, Yahoo and other providers with failover and robust-median calculators.

## Event Loop
Event and stream driven. Feeds pipe through filters into consumers such as the order book, triggers and `Trader`.

## Execution
`Trader` is a writable stream that places and cancels orders on an authenticated exchange API from commands in the stream. Public and authenticated API interfaces plus a transfer API.

## Risk
`RateLimiter` for API calls, an `HFTFilter` that throttles message volume, and a trigger system for price conditions. No position or loss limits.

## Strategies Shipped
None. Samples show order book streaming, filtered streams, FX rates and authenticated channels.

## AI Components
None.

## Connectors
Coinbase Pro, Bitfinex, BitMEX, Bittrex, Gemini, Poloniex and a CCXT bridge.

## Fit
Historical reference for stream-based bot architecture. The venues and API it targets are gone or changed, so use it for design ideas only.
