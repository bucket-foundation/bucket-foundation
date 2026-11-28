# tai

https://github.com/fremantle-industries/tai. License MIT. Stars 499. Last push 2024-12-07. Elixir. Checked 2026-11-27.

## Architecture
Elixir umbrella. `apps/tai` is the core: `advisor.ex`, `advisors/`, `venues/`, `venue_adapters/`, `orders/`, `markets/`, `fleets/`, `commander/`, `trading/`, `events/`, `system_bus.ex`. `apps/examples` has sample advisors and `packages/tai_events` holds event types.

## Data Layer
Market quotes and trades over venue websockets into an ETS-backed store. Orders and transitions persist through Ecto repos.

## Event Loop
OTP supervision trees. Each advisor is a GenServer that receives `handle_market_quote` and order update messages from the system bus.

## Execution
`Tai.Venues.Adapter` behaviour with adapters for binance, bitmex, bybit, deribit, ftx, gdax, huobi, okex, delta_exchange and a `mock`. Order state machine with transitions and callbacks. Commands to enable or disable sending orders.

## Risk
Send-orders switch, order transition failure tracking, fee stores. No portfolio limits module.

## Strategies Shipped
`examples/`: `ping_pong` (passive entry inside the quote, flip on fill), `log_spread`, `log_trade`.

## AI Components
None.

## Connectors
Crypto spot and derivative venues listed above, mostly defunct.

## Fit
Mature actor-model design for order lifecycle and advisor supervision. Venue adapters are dated.
