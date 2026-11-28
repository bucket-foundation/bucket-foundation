# Hyper-Alpha-Arena

https://github.com/HammerGPT/Hyper-Alpha-Arena. License Apache-2.0. Stars 1,211. Last push 2026-11-03. Python backend, TypeScript frontend. Checked 2026-11-27.

## Architecture
FastAPI backend in `backend/` (`api/` with about 30 route modules, `services/`, `backtest/`, `factors/`, `program_trader/`, `skills/`, `repositories/`) and a pnpm frontend. Docker compose runs the app with Postgres. Services cover market data, signal detection, factor computation, order execution and LLM agents.

## Data Layer
Postgres through `database/`. Kline collectors, market flow indicators, news collectors and an AI news classifier feed it. Hyperliquid and Binance adapters under `services/exchanges`.

## Event Loop
APScheduler interval jobs plus websocket streams. Signal detection publishes triggers to subscribers, and the scheduler fires AI decision cycles per account.

## Execution
`order_executor.py`, `hyperliquid_trading_client.py` and `binance_trading_client.py` place perp orders, with a testnet and mainnet switch. The AI response schema includes leverage from 1 to 20, a max price, take profit and stop loss prices.

## Risk
Leverage cap placeholder in the prompt, stop and take profit fields, a `market_regime_service`, and an AST validator plus sandbox executor for generated strategy code.

## Strategies Shipped
Program Trader runs user or AI written Python strategies under `program_trader/`; `factors/` has momentum and support factors; `backtest/` includes a virtual account and execution simulator.

## AI Components
LLM trader decisions, prompt backtests, a Hyper AI agent with memory, skills, tool registry and subagents, and provider presets for OpenAI, Anthropic and DeepSeek.

## Connectors
Hyperliquid, Binance Futures, Discord, news feeds.

## Fit
Most complete open LLM perp trading stack here, with sandboxed strategy code and prompt backtests. Needs scrutiny of LLM spend and leverage defaults.
