# AutoHedge

https://github.com/The-Swarm-Corporation/AutoHedge. License MIT. Stars 6,743. Last push 2026-05-11. Python. Checked 2026-11-27.

## Architecture
Small package `autohedge/`: `main.py` class `AutoHedge` passes a task to a director agent, `workers.py` defines five `swarms` agents (Sentiment, Risk-Manager, Execution, Quant-Analyst, Trading-Director), `prompts.py` holds their system prompts, `tools/` holds data tools, `cli.py` the command line. `experimental/` has `btc_agent.py` and `market_making.py`.

## Data Layer
Tool calls fetch data on demand: Exa search, Polygon, Yahoo, Jupiter price and search. Output is a conversation log saved to `outputs/`.

## Event Loop
None. One director call runs a single cycle.

## Execution
The execution agent writes an order recommendation in text. The main path places no orders; `experimental/market_making.py` is an async script with a config dataclass.

## Risk
Risk-Manager agent prompts for position size, drawdown risk and a risk score. Output is advisory text.

## Strategies Shipped
`experimental/market_making.py`: spread, order size and max inventory parameters for a BTC/USDT quoting loop.

## AI Components
LLM agents on `gpt-4.1` and `gpt-4o-mini` through the `swarms` framework. The director delegates to the other four.

## Connectors
Exa, Polygon, Yahoo Finance, Jupiter.

## Fit
Minimal template for a multi-agent research chain. No tests on decisions and no enforced limits.
