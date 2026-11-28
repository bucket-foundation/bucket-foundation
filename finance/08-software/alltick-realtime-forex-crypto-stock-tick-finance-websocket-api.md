# alltick-realtime-forex-crypto-stock-tick-finance-websocket-api

https://github.com/AllTick-Official/alltick-realtime-forex-crypto-stock-tick-finance-websocket-api. License None stated. Stars 630. Last Push 2026-09-28. Java. Checked 2026-11-27.

## Architecture
Documentation and client samples for the AllTick market data service. `http_interface/` and `rest_interface/` describe endpoints, `example/` has Python, Go, Java and PHP clients, and the root holds product code lists for A shares, Hong Kong and US stocks, forex, crypto, metals and indices.

## Data Layer
Hosted service: K-line, batch K-line, tick trades, order book depth and static info over REST, plus a websocket push feed on separate stock and non-stock URLs.

## Event Loop
Sample clients open a websocket, subscribe by product code, run a heartbeat thread and handle pushed ticks.

## Execution
None.

## Risk
Rate limits by plan, from 1 request per 10 seconds on the free tier to 20 per second on professional tiers. Error code table in `error_code_description.md`.

## Strategies Shipped
None.

## AI Components
`llms.txt` lets agents discover the docs.

## Connectors
AllTick REST and websocket with a token. The repo contains no server code.

## Fit
Candidate paid tick source for A shares, Hong Kong and forex that ccxt and yfinance do not cover. Free tier is too slow for live use.
