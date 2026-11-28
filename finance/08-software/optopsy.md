# optopsy

https://github.com/goldspanlabs/optopsy. License AGPL-3.0. Stars 1,528. Last push 2026-11-27. Python. Checked 2026-11-27.

## Architecture
Package `optopsy/` with `core.py` (strategy engine), `strategies/` (singles, spreads, butterflies, condors, calendars, iron strategies), `rules.py` (strike and expiration constraints), `filters.py`, `exits.py`, `signals/` (momentum, trend, volatility, IV, volume, calendar), `simulator.py` and `metrics.py`. `ui/` holds a chat agent.

## Data Layer
`datafeeds.py` loads CSV option chains; `data/providers/` adds EODHD, a disk cache and a Postgres store (`pg_store.py`); cached stock history comes from yfinance helpers.

## Event Loop
None. Vectorized pandas evaluation; `simulate` replays trades chronologically.

## Execution
Simulated only. `SimulationResult` carries trade log, equity curve and summary with capital tracking and commissions.

## Risk
Position limits and capital checks in the simulator; early exits by DTE, profit target and stop loss in `exits.py`; Sharpe, drawdown and win rate in the summary.

## Strategies Shipped
About 40 option structures: long and short calls and puts, straddles, strangles, vertical spreads, butterflies, condors, iron condor and butterfly, calendars, diagonals, covered call, collar, cash-secured put, back and front spreads.

## AI Components
`ui/agent.py` runs an LLM through litellm with tools for data inspection, signal building, strategy runs and charts, served in Chainlit.

## Connectors
EODHD, yfinance, Postgres, litellm.

## Fit
Most complete open options backtester here. AGPL licensing constrains reuse.
