# Krypto-trading-bot

https://github.com/ctubio/Krypto-trading-bot. License Other. Stars 3,736. Last push 2024-12-15. C++. Checked 2026-11-27.

## Architecture
C++ header-library bot. `src/lib/` has `Krypto.ninja-apis.h` (exchange gateway classes), `-bots.h` (runtime), `-data.h`, `-lang.h`, `-test.h`. `src/bin/` builds four bots: `trading-bot` (market maker), `scaling-bot`, `stable--bot` and `+portfolios`, plus `hello-world`.

## Data Layer
SQLite file for state, in-memory wallet and order books, websocket market data. `trading-bot.client` serves a web UI.

## Event Loop
libuv-style event loop over websocket and FIX connections; gateway classes `GwApiWs`, `GwApiWsWs` and `GwApiWsFix` differ by transport.

## Execution
Per-exchange gateways for Coinbase, Bitfinex, Kraken and others in `Krypto.ninja-apis.h`, with order replace and cancel.

## Risk
`QuotingSafety` modes Off, PingPong, PingPoing, Boomerang and AK47 limit new quotes against recent trade prices. Wallet tracks position and target base ratio with auto-position modes.

## Strategies Shipped
Quoting modes Top, Mid, Join, InverseJoin, InverseTop, HamelinRat and Depth in `trading-bot.data.h`; fair value on order book or size-weighted midpoints.

## AI Components
None.

## Connectors
Coinbase, Bitfinex, Kraken and further exchanges over websocket and FIX.

## Fit
Compiled low-latency market maker with an explicit safety enum. Reading cost is high because of header-only structure.
