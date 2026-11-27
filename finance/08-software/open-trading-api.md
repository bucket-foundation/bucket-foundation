# KIS Open Trading API

https://github.com/koreainvestment/open-trading-api. License none. Stars 1,682. Last push 2026-11-24. Python. Checked 2026-11-27.

## Architecture
Korea Investment and Securities sample repo: `examples_user` and `examples_llm` per endpoint, `strategy_builder` (backend, frontend, strategy core), `backtester` (`kis_backtest`, `kis_mcp`), `MCP` server, `llms.txt` for agents.

## Data Layer
KIS REST and websocket quotes for Korean and overseas stocks.

## Event Loop
Backtester runs strategies from the builder; live samples poll or stream.

## Execution
Order endpoints for domestic and overseas stocks and futures via `kis_auth.py` tokens.

## Risk
None beyond broker checks.

## Strategies Shipped
`strategy_builder/strategy` templates and a visual builder that exports to the backtester.

## AI Components
MCP server exposes backtest and quote tools to LLM clients.

## Connectors
Korea Investment and Securities.

## Fit
Complete broker SDK sample with a strategy builder and MCP bridge. No license file.
