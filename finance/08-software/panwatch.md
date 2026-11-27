# PanWatch

https://github.com/TNT-Likely/PanWatch. License MIT. Stars 2,576. Last push 2026-11-26. Python backend, TypeScript frontend. Checked 2026-11-27.

## Architecture
FastAPI app (`server.py`, `src/bootstrap/application.py`) with modules under `src/modules/`: `strategy`, `automation`, `paper_trading`, `portfolio`, `market`, `assistant`, `research`, `notifications`, `mobile`. Platform layer in `src/platform/` (ai, marketdata, scheduling, persistence, events). Packages `pan-agent-runtime` and `pan-investment-research`.

## Data Layer
Collectors for klines, news, capital flow, events and discovery covering A-shares, HK and US. SQLAlchemy models with a large migrations file.

## Event Loop
Scheduler registry and cron-style agent scheduler run watch agents (intraday monitor, premarket outlook, daily report); API requests run on the web loop.

## Execution
Paper trading only: `paper_trading_engine.py` sizes positions from rank score, allocates cash per market, blocks sells by holding rules and settles. No live broker.

## Risk
Per-market cash allocation, sell-block rules, intraday event gate. No portfolio risk model.

## Strategies Shipped
`strategy_engine.py` scores factors; `entry_candidates.py` ranks entry candidates; `factor_calibration.py`, `factor_eval.py` and `factor_weights.py` tune weights; `strategy/backtest` has engine, cost model and metrics.

## AI Components
`platform/ai` client with failover across providers; `automation/tradingagents` adapts the TradingAgents multi-agent framework; assistant module has tool calling over portfolio data.

## Connectors
Telegram and other notifiers, market data HTTP sources, LLM providers.

## Fit
Monitoring and alerting product for retail A-share holders. Useful as a reference for LLM agent scheduling and paper accounts; no execution path.
