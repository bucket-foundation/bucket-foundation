# ai-hedge-fund-crypto

https://github.com/51bitquant/ai-hedge-fund-crypto. License MIT License. Stars 631. Last Push 2025-09-05. Python. Checked 2026-11-27.

## Architecture
LangGraph pipeline in `src/graph/` (`start_node`, `data_node`, strategy nodes, `risk_management_node`, `portfolio_management_node`) built by `src/agent/workflow.py`. `src/backtest/backtester.py` replays it. `main.py` and `backtest.py` are entry points; `config.yaml` sets mode, tickers, intervals, strategies and model.

## Data Layer
`binance_data_provider.py` pulls klines from a vendored Binance client (REST, async and websocket depth cache). Indicators in `src/indicators`.

## Event Loop
Batch graph run per bar interval, in `backtest` or `live` mode.

## Execution
The portfolio node asks an LLM for a trading decision per ticker with retry logic and a JSON parser. Order placement through the vendored Binance gateway is the live path.

## Risk
`RiskManagementNode` caps each ticker at 20 percent of portfolio value and at available cash, then passes the remaining limit to the portfolio node.

## Strategies Shipped
`MacdStrategy` (weighted blend of trend, mean reversion, momentum, volatility and stat-arb signals across 30m, 1h and 4h), `RSIStrategy`, and a `MyStrategy` template.

## AI Components
LangChain model factory for OpenAI, Groq, Anthropic, Gemini and Ollama; the LLM only turns signals and risk limits into a decision.

## Connectors
Binance.

## Fit
Compact crypto adaptation of the ai-hedge-fund pattern with a real data gateway. Sizing rests on a flat 20 percent cap and the code is untested on live funds.
