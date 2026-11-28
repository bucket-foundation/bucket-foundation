# pmxt

https://github.com/pmxt-dev/pmxt. License MIT. Stars 2,221. Last push 2026-09-30. TypeScript core, Python and TypeScript SDKs. Checked 2026-11-27.

## Architecture
"CCXT for prediction markets." `core/src/BaseExchange.ts` defines unified methods; `core/src/exchanges/` implements each venue; a local server (`router`, `server`) lets the Python SDK call the TypeScript core.

## Data Layer
Unified markets, events, order books, trades and positions; `feeds/` for streams.

## Event Loop
None; caller-driven, with websocket subscriber.

## Execution
Unified create and cancel order across venues.

## Risk
None.

## Strategies Shipped
None.

## AI Components
None.

## Connectors
Kalshi (plus demo), Polymarket, Polymarket US, Limitless, Myriad, Opinion, Probable, Rain, Smarkets, Hyperliquid, Gemini, Metaculus, Hunch, Baozi, SuiBets.

## Fit
One client for Kalshi and Polymarket reads in the alert layer and for cross-venue price comparison.
