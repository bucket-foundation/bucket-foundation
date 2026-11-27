# Kalshi Starter Code Python

https://github.com/Kalshi/kalshi-starter-code-python · no license file · 102 stars · last push 2025-03-07 · Python · checked 2026-11-27

## Architecture
Two files. `clients.py` (233 lines): `KalshiBaseClient` signs requests with RSA-PSS over timestamp, method and path; `KalshiHttpClient` wraps GET, POST, DELETE with a simple rate limiter; `KalshiWebSocketClient` connects and subscribes to the ticker channel. `main.py` loads keys from `.env`, prints balance, opens the websocket.

## Data Layer
REST `get_trades`, `get_balance`, `get_exchange_status`; websocket ticker stream. Demo base `https://demo-api.kalshi.co`, production `https://api.elections.kalshi.com`.

## Event Loop
asyncio websocket handler printing each message.

## Execution
Generic `post` and `delete` only; no order helpers.

## Risk
None.

## Strategies Shipped
None.

## AI Components
None.

## Connectors
Kalshi REST and websocket.

## Fit
Copy the signing code into a Kalshi adapter for the event-contract leg. No license means reuse is legally unclear; the signing scheme is documented by Kalshi, so a clean rewrite is safe.
