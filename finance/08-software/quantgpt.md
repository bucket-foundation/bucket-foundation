# QuantGPT

https://github.com/Miasyster/QuantGPT. License MIT. Stars 522. Last push 2026-11-23. Python, Rust. Checked 2026-11-27.

## Architecture
FastAPI service `quantgpt/` with Celery tasks, a React `frontend/` and a Rust `engine/` (PyO3 bridge in `rust_bridge.py`) that parses factor expressions and runs backtests. Pipeline modules: `llm_service`, `iteration`, `mutation_engine`, `crossover_engine`, `meta_evolution`, `backtest`, `anti_overfit`, `adversarial_validator`, `rolling_validator`, `neutralize`, `attribution`, `mcp_server`.

## Data Layer
China A-share universes and prices from baostock, rqdatac, akshare and adata (`market_data.py`, `adata_backend.py`). SQL via Alembic `migrations/`.

## Event Loop
Batch jobs. A scheduler and Celery workers run mining iterations.

## Execution
None. `run_factor_backtest` groups stocks by factor value and reports IC, turnover, monotonicity and drawdown. `wq_brain_client.py` submits expressions to WorldQuant BRAIN.

## Risk
Overfitting controls: `anti_overfit`, rolling and walk-forward validation, industry neutralization, `market_regime`.

## Strategies Shipped
Factor expressions evolve in `example_factor/` and the library. No order-level strategies.

## AI Components
An LLM (DeepSeek-style client through `llm_service`) writes, fixes and interprets factor expressions. Mutation and crossover refine them. An MCP server exposes tasks.

## Connectors
baostock, rqdatac, akshare, adata, WorldQuant BRAIN.

## Fit
LLM-driven alpha factor mining loop with validation stages. Data sources serve Chinese equities.
