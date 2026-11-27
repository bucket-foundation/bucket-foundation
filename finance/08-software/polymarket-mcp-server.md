# polymarket-mcp-server

https://github.com/caiovicentino/polymarket-mcp-server. License MIT. Stars 755. Last push 2026-11-25. Python 3.10+. Checked 2026-11-27.

## Architecture
MCP server in `src/polymarket_mcp/` with `server.py`, tool modules (`trading`, `market_discovery`, `market_analysis`, `portfolio`, `realtime`), `auth/` for key signing and the CLOB client, `utils/` (rate limiter, safety limits, websocket manager) and a Flask-style web dashboard in `web/`. Docker and k8s manifests included.

## Data Layer
Gamma, Data and CLOB REST endpoints plus market and user websockets. No local database.

## Event Loop
Async tool handlers on request from the MCP client. Websocket subscriptions for prices, order book, user orders and trades, and resolution.

## Execution
Limit, market and batch orders, cancel by order, market or all, and `execute_smart_trade` which picks limit, market or split orders. Orders sign through `py_clob_client`.

## Risk
`SafetyLimits.validate_order` enforces max order size, total exposure, per-market position size, minimum liquidity and spread tolerance, with a confirmation threshold and optional auto-cancel on wide spread.

## Strategies Shipped
None as a fixed strategy. The model decides from tools such as `analyze_market_opportunity`, `compare_markets` and `rebalance_position`.

## AI Components
Built to let Claude call 45 tools and trade autonomously.

## Connectors
Polymarket CLOB, Gamma and Data APIs, Polygon wallet.

## Fit
Concrete MCP surface for agent-driven Polymarket trading with limits in code. Autonomous order tools need tight limit settings before any live key is used.
