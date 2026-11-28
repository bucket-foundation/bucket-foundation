# tribeca

https://github.com/michaelgrosner/tribeca. License Other. Stars 4,115. Last push 2021-12-08. TypeScript. Checked 2026-11-27.

## Architecture
Node service in `src/service/` with an Angular admin UI in `src/admin/`. `main.ts` wires `broker.ts`, `market-filtration.ts`, `fair-value.ts`, `quoting-engine.ts`, `quote-sender.ts`, `position-management.ts`, `safety.ts`, `active-state.ts` and a websocket publisher. `common/models.ts` holds the shared types.

## Data Layer
MongoDB through `persister.ts` for trades, parameters and fair value history. Market data arrives from exchange gateways.

## Event Loop
Event emitters: market book change triggers fair value recalculation, which triggers quote generation and sending.

## Execution
Gateways in `gateways/`: Coinbase, Bitfinex, HitBTC, OKCoin and a null gateway. `quote-sender.ts` replaces resting orders. `backtest.ts` replays recorded data.

## Risk
`SafetyCalculator` counts recent buys and sells against limits; `active-state.ts` toggles quoting; target base position and trade-safety controls in the UI. `AutoPositionMode` uses an EWMA of price to set target inventory.

## Strategies Shipped
Quoting modes Top, Mid, Join, InverseJoin, InverseTop, PingPong and Depth. Fair value is best bid and offer or size-weighted BBO.

## AI Components
None.

## Connectors
Four exchange gateways, MongoDB, websocket UI.

## Fit
Compact market-making reference with clear separation of fair value, quoting and safety. The exchanges are long out of date.
