# kalshi-ai-trading-bot

https://github.com/ryanfrigo/kalshi-ai-trading-bot. License MIT. Stars 664. Last push 2026-11-09. Python. Checked 2026-11-27.

## Architecture
Job pipeline in `src/jobs/`: ingest, decide, execute, track, evaluate, plus performance analyzers. `src/agent/` is an edge-measurement layer (edge, jev, journal, learnings, policy, settle, verify, report). Also ships a CLI, an MCP server (`src/mcp_server.py`) and a Claude skill.

## Data Layer
Kalshi REST and websocket (`clients/kalshi_ws.py`), news aggregator and sentiment analyzer, SQLite database.

## Event Loop
Scheduled jobs and an event bus (`events/event_bus.py`); `beast_mode_bot.py` runs the full loop.

## Execution
Maker limit orders through the Kalshi client; `paper_trader.py` and `paper/` simulate fills.

## Risk
`risk/risk_governor.py` persists state, writes a `TRADING_HALTED` flag file that stops all trading until a human removes it, and audits to JSONL. Position limits, cash reserves, stop-loss calculator, Kelly-based sizing, category scorer that blocks low-scoring categories.

## Strategies Shipped
`strategies/`: safe_compounder (NO side only on near-certain outcomes, NO ask above 80 cents, edge above 3 cents, maker order one cent under the ask, 10% cap per position), market_making (spread capture with fixed capital base), portfolio_optimization, unified_trading_system, category_scorer allocation tiers.

## AI Components
Grok (xAI) and OpenRouter LLMs estimate probabilities from news; `agent/edge.py` refuses to claim edge below a minimum count of forward-settled trades.

## Connectors
Kalshi.

## Fit
Closest open match to a notify-first Kalshi agent: MCP tools, a stop flag file, and an edge checker that measures calibration before money moves.
