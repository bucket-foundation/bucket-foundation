# gs-quant

https://github.com/goldmansachs/gs-quant. License Apache-2.0. Stars 14,478. Last push 2026-11-27. Python. Checked 2026-11-27.

## Architecture
Goldman Sachs toolkit. `instrument/` and `priceable.py` define derivatives; `risk/` computes greeks and scenarios; `timeseries/` holds analytics functions; `backtests/` has a generic engine, equity vol engine, triggers and actions; `markets/` portfolios; `mcp/` and `skills/` for agents.

## Data Layer
GS Marquee APIs (entitlement required) plus local pandas series.

## Event Loop
`backtests/generic_engine.py` steps dates and fires triggers (periodic, mkt, event) that run actions (add trade, hedge, exit).

## Execution
None live.

## Risk
Pricing and risk through GS services; timeseries functions (vol, correlation, drawdown) run locally.

## Strategies Shipped
`backtests/strategy_systematic.py`: systematic option overlay strategies; trigger and action primitives for delta hedging and periodic rolls.

## AI Components
MCP server and skills for LLM access to the toolkit.

## Connectors
GS Marquee.

## Fit
Timeseries analytics and the trigger-action backtest pattern are useful offline; pricing needs a GS account.
