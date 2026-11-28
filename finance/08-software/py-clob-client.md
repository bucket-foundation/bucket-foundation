# py-clob-client

https://github.com/Polymarket/py-clob-client · MIT · 1,223 stars · last push 2026-05-25 · Python · checked 2026-11-27

## Architecture
Official Python SDK for the Polymarket central limit order book. `py_clob_client/client.py` (`ClobClient`, 70 methods), `order_builder/`, `signing/` (EIP-712), `signer.py`, `headers/` (L1 and L2 auth), `rfq/`, `endpoints.py`.

## Data Layer
REST reads: `get_order_book(s)`, `get_midpoint(s)`, `get_price(s)`, `get_spread(s)`, `get_last_trade_price(s)`, `get_tick_size`, `get_neg_risk`, `get_fee_rate_bps`, `get_trades`, `get_orders`, `get_notifications`, `get_balance_allowance`. Order book hash for change detection.

## Event Loop
None. Caller drives it. Websocket feeds live in other Polymarket repos.

## Execution
`create_order`, `create_market_order`, `post_order` with `OrderType` GTC, FOK, GTD and `post_only`, `post_orders` batch, `cancel`, `cancel_orders`, `cancel_all`, `cancel_market_orders`, `post_heartbeat` (dead-man cancel). Auth levels: L0 public, L1 wallet key, L2 API creds; builder headers for attribution. Read-only API keys supported.

## Risk
None beyond tick size and fee resolution. Heartbeat gives a server-side cancel when the client dies.

## Strategies Shipped
None. `examples/` shows order placement and book reads.

## AI Components
None.

## Connectors
Polymarket CLOB on Polygon.

## Fit
Required connector for any Polymarket alert or execution path. Read-only key fits the notify-first stage.
