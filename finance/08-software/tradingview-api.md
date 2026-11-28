# TradingView-API

https://github.com/Mathieu2301/TradingView-API. License None stated. Stars 5,961. Last push 2026-11-14. TypeScript. Checked 2026-11-27.

## Architecture
Unofficial TypeScript client in `src/`: `client/` (websocket, proxy, transport), `protocol/` (framing, compression), `chart/` (sessions, studies, strategy reports), `quote/`, `data/` (candles, history, symbols, indicators), `http/` (account, screener, watchlists, layouts), `indicators/` and `backtest/`.

## Data Layer
Pulls from TradingView websockets and HTTP endpoints. A session cookie unlocks private indicators and layouts.

## Event Loop
Event-driven websocket sessions; callbacks fire on candle and quote updates.

## Execution
None.

## Risk
None.

## Strategies Shipped
`src/backtest/` runs signal functions over history with fees, no look-ahead and a random-entry baseline. `signals.ts` holds a reference RSI divergence signal with an EMA trend filter; `exits.ts` and `simulate.ts` apply stops and targets.

## AI Components
None.

## Connectors
TradingView websocket and web API.

## Fit
Access to TradingView quotes, Pine indicator values and strategy reports from Node. The protocol is private, so breakage and terms risk apply.
