# roq-api

https://github.com/roq-trading/roq-api. License MIT. Stars 518. Last push 2026-11-27. C++. Checked 2026-11-27.

## Architecture
Header-only C++ API in `include/roq/` (about 150 headers) plus `schema/` definitions and `test/`. The README states the closed source implementation of the interfaces is not included.

## Data Layer
Message types: `market_by_price_update`, `market_by_order_update`, `top_of_book`, `trade_summary`, `reference_data`, `funds_update`, `bar`, custom metrics and matrices. Decimal type in `decimal.hpp`.

## Event Loop
`client/handler.hpp` defines `Handler`, a set of `operator()(Event<T> const &)` overloads (Start, Stop, Timer, Connected, Disconnected, DownloadBegin, Ready, and market and order events). `client/dispatcher.hpp` sends orders back.

## Execution
Order messages: `create_order`, `cancel_order`, `cancel_all_orders`, `mass_quote`, `cancel_quotes`, with acks and execution instructions.

## Risk
`limits.hpp` and gateway status types. No logic in this repo.

## Strategies Shipped
None here. Samples live in a separate repo.

## AI Components
None.

## Connectors
Interface definitions for Roq gateways. Implementations are commercial.

## Fit
Interface reference for an event-driven HFT client API. The binary runtime needs a Roq license.
