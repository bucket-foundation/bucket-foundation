# FriesTrader

https://github.com/YizhiSong/FriesTrader. License MIT. Stars 322. Last push 2026-11-07. Python. Checked 2026-11-27.

## Architecture
Prompt-driven agent. `PHASE_A_TASK.md` (screen and write theses) and `PHASE_B_TASK.md` (review and place orders) are the two scheduled Claude Code sessions. `risk_rules.json` holds hard limits. `scripts/` has seven pure functions: `entry_gate`, `rank_candidates`, `position_sizing`, `stop_loss`, `take_profit`, `conviction_trim`, `pnl_pct`.

## Data Layer
Robinhood MCP for quotes, watchlists and scans. Decisions append to `trade_log_template.jsonl`.

## Event Loop
Two scheduled sessions per weekday. No process stays running.

## Execution
Orders go through the Robinhood Agentic Trading MCP (`review_equity_order`). `execution.mode` starts at `dry_run`; a human flips it to `live` after at least 10 dry-run cycles.

## Risk
Universe filters (volume, market cap band, penny stocks, leveraged and inverse ETFs, trend), a concurrent position cap, fixed or volatility-scaled stop, tiered take-profit, overweight trim and an entry pause flag. The model cannot override the JSON.

## Strategies Shipped
LLM thesis screening over a watchlist plus a scan; sizing, stop, take-profit and trim scripts apply the rules.

## AI Components
Claude Code sessions write the thesis and conviction rating for each candidate.

## Connectors
Robinhood Agentic Trading MCP.

## Fit
Template for an LLM agent with mechanical risk gates. Shows dry-run-first promotion to live.
