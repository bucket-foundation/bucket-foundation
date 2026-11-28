# tickflow-stock-panel

https://github.com/hzy1522/tickflow-stock-panel. License MIT. Stars 381. Last push 2026-08-31. Python backend with React frontend. Checked 2026-11-27.

## Architecture
Fork of shy3130/tickflow-stock-panel extended to A-share, Hong Kong and US markets. FastAPI app in `backend/app/`: `api/` (screener, signals, backtest, alerts, regime, RPS, mining, watchlist), `backtest/` (engine, matrix, walk-forward, optimizer, factor mining), `strategy/` (engine, scoring, monitor, builtin strategies), `services/` (sync, analysis, AI reports), `jobs/daily_pipeline.py`, `data_providers/`, `extensions/`. Docker images for amd64 and arm64.

## Data Layer
TickFlow data provider, Parquet storage (`parquet.py`), polars frames, kline, financial and index sync jobs.

## Event Loop
Scheduled daily pipeline plus monitor rules that evaluate intraday signals.

## Execution
None. Alerts through desktop notification and reports.

## Risk
Backtest cost model with commission and price limit rules (`price_limits.py`), walk-forward validation. No live position risk.

## Strategies Shipped
`strategy/builtin/`: Bollinger breakout, MACD golden cross, MA golden cross, trend breakout, oversold bounce, pullback to MA20, N-day low reversal, limit-up momentum, consecutive limit ups, volume-price surge, low volatility leader and others.

## AI Components
`ai_provider.py`, `ai_generator.py` and `custom_signals_ai.py` generate strategies and stock reports through OpenAI or Codex models.

## Connectors
TickFlow, custom data provider registry.

## Fit
Self-hosted A-share screener and backtest workbench with AI strategy generation. No broker path.
