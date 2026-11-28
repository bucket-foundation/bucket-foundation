# AI Hedge Fund

https://github.com/virattt/ai-hedge-fund · MIT · 64,872 stars · last push 2026-11-09 · Python · checked 2026-11-27

## Architecture
Rewritten as the `aihf` package with a Textual TUI. `hedge_fund/signals` (alpha models), `fund/spec.py` (fund mandate YAML), `pipeline/` (clock, stages, session, execution), `portfolio/construction.py`, `risk/`, `brokers/` (protocol, sim, paper, costs), `paper/` (runner, hash-chained ledger, tick), `backtesting/`, `scorecard/`, `llm/`, `tui/`.

## Data Layer
`data/client.py` calls Financial Datasets API for prices, fundamentals, earnings; pays per call with x402 USDC on Base when no API key is set (`data/wallet.py`). `data/cached.py` caches; `features/` builds snapshots and intraday features.

## Event Loop
Session-based: each completed market session the pipeline runs signals, blends them, constructs a portfolio, applies risk limits, and executes on the paper broker after a human approval step. Backtest replays the same pipeline over history.

## Execution
`brokers/sim.py` and `brokers/paper.py` with cost model in `brokers/costs.py`. No live broker.

## Risk
`risk/limits.py` `RiskLimits`: max position pct, max gross and net exposure, max drawdown pct with a halve-size threshold, max ADV pct, max beta, max sector pct, max volatility. `risk/exposures.py`. TUI kill switch keys.

## Strategies Shipped
- `strategies/deep-value.yaml`: long-only, Graham double weight plus Buffett and Munger.
- `strategies/earnings-drift.yaml`: long/short PEAD, conviction weighted, gross 1.0.
- `strategies/fundamental-ls.yaml`: five investor agents, dollar neutral, shorts need Druckenmiller support.
- `strategies/inflections.yaml`: Druckenmiller and Lynch on fundamental rate of change, long/short.
- Signals: `signals/pead.py` (post-earnings drift, 45-day staleness cutoff), `buffett.py`, `munger.py`, `graham.py`, `lynch.py`, `druckenmiller.py` (LLM persona agents on `llm_agent.py`).

## AI Components
`signals/llm_agent.py` maps LLM output to bullish 1, neutral 0, bearish minus 1. Providers: Anthropic, OpenAI, DeepSeek, Google, xAI, Kimi. `llm/cache.py` caches responses; `scorecard/` grades analysts.

## Connectors
Financial Datasets (key or x402). Paper and sim brokers.

## Fit
Good template for notify-first: approval gate before every paper trade, hash-chained ledger, explicit risk limits. LLM persona signals cannot be backtested without lookahead in model knowledge.
