# tickdb-unified-realtime-marketdata-api

https://github.com/TickDB/tickdb-unified-realtime-marketdata-api. License MIT. Stars 943. Last push 2026-11-06. Python. Checked 2026-11-27.

## Architecture
An MCP server in `mcp/tickdb_mcp/` built on FastMCP: `server.py`, `client.py`, `http.py` transport, `middleware.py`, `config.py` and an `oauth/` package (provider, consent, store). Tools register from `tools/account.py`, `stock.py`, `fundamentals.py` and `market.py`. A `SKILL/` folder carries a skill file and references for agents. The repo holds only the client side; the market data service is hosted by TickDB.

## Data Layer
Calls the hosted TickDB REST API for quotes, klines, order books, recent trades, intraday series, company profiles, financial statements, valuations, shareholders, dividends and calendars. A contract fixture (`api_contract_v021.json`) pins response shapes in tests.

## Event Loop
Request and response per tool call. Stdio and HTTP transports.

## Execution
None.

## Risk
Auth and transport hardening only: OAuth consent flow, security tests for HTTP, logging and middleware.

## Strategies Shipped
None.

## AI Components
MCP tools and an agent skill for LLM clients. About 45 tools, including `get_kline`, `get_order_book`, `get_ticker`, `get_capital_flow`, `get_financials_ttm` and `get_ipo_calendar`.

## Connectors
TickDB API covering US, HK and CN stocks, forex, futures, crypto, indices and commodities.

## Fit
Market data for agents over MCP. Depends on a commercial hosted API with an API key, so the data is not self-hosted.
