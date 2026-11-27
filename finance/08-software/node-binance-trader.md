# node-binance-trader

https://github.com/herve76/node-binance-trader. License MIT. Stars 1,225. Last push 2024-08-19. TypeScript. Checked 2026-11-27.

## Architecture
Two parts. `src/trader/` is the client: `socket.ts` (Socket.IO listener), `trader.ts` (trade execution), `apis/binance.ts` and `apis/bva.ts`, `notifiers/` (Gmail, Telegram), `env.ts`, `http.ts`. `src/server/` is the legacy signal server (`server.js`, `backtest.js`) on Postgres. Jest tests sit beside the TypeScript files. Docker compose and a systemd unit ship in the root.

## Data Layer
Open trades are fetched from the BVA service over HTTPS (`useropentradedsignals`). The server and backtest read candles from Postgres.

## Event Loop
Event driven. The socket emits `buy_signal`, `sell_signal`, `close_traded_signal`, `stop_traded_signal` and `user_payload`; each handler calls `trade`.

## Execution
`getTradingSequence` builds entry, exit and short sequences with rounded quantity steps. Orders go through the `binance-api-node` client on spot or margin, with borrow and repay calls for shorts.

## Risk
A per-position stopped flag, an `IS_TRADE_MARGIN_ENABLED` switch and market precision checks. No portfolio caps.

## Strategies Shipped
None in code. Signals arrive from bitcoinvsaltcoins.com strategies. `backtest.js` replays a configured pair from Postgres data.

## AI Components
None.

## Connectors
Binance spot and margin, the BVA signal API, Telegram, Gmail.

## Fit
Compact signal-to-order bridge for Binance with notifier hooks. Depends on a third-party signal service whose uptime is unknown.
