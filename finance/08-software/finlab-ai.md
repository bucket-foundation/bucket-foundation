# finlab-ai

https://github.com/koreal6803/finlab-ai. License not stated. Stars 427. Last push 2026-11-27. Markdown skill files and Python tests. Checked 2026-11-27.

## Architecture
A Claude Code and Codex plugin. `skills/finlab/SKILL.md` is the entry point; reference files cover `backtesting-reference.md` (the `sim()` API and Report class), `dataframe-reference.md` (FinLabDataFrame methods), `factor-analysis-reference.md`, `factor-examples.md`, `machine-learning-reference.md`, `cloud-reference.md`, `us-market.md` and `data-reproducibility.md`. `tests/` check skill discovery, auth guides and plugin updates.

## Data Layer
Defers to the external `finlab` Python package: Taiwan adjusted prices, monthly revenue, financial statements, institutional flows, plus US, KR, JP and HK equities. Login through `python -m finlab login`.

## Event Loop
None. Vectorized dataframe backtests through `sim()`.

## Execution
None in the repo. Backtest only.

## Risk
Lookahead bias check through `verify_strategy()`, filing-date alignment for US fundamentals, and a Report object with drawdown and return metrics.

## Strategies Shipped
`factor-examples.md` lists technical indicators (ADX, RSI, MACD, momentum, rate of change) and fundamental factor recipes as code snippets. No strategy files.

## AI Components
The repo is agent instructions. `machine-learning-reference.md` documents feature engineering and label generation (`label.return_percentage`, excess over mean and median).

## Connectors
FinLab data service and FinLab Studio.

## Fit
Instruction set for agent-driven Taiwan and US equity backtests. Needs a FinLab account; the engine is closed to this repo.
