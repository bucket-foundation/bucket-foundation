# TradingAgents-astock

https://github.com/simonlin1212/TradingAgents-astock. License Apache-2.0. Stars 4,021. Last push 2026-10-30. Python. Checked 2026-11-27.

## Architecture
Fork of TradingAgents adapted to A-shares. `tradingagents/graph/` builds a LangGraph (`trading_graph.py`, `setup.py`, `conditional_logic.py`, `reflection.py`, `checkpointer.py`). `agents/` holds seven analysts (market, social, news, fundamentals, policy, hot-money tracker, lockup watcher), bull and bear researchers, research and portfolio managers, a trader and three risk debaters. `web/` is a Streamlit-style UI with PDF export.

## Data Layer
`dataflows/a_stock.py` serves A-share data (dragon-tiger list, lockup expiry) next to Alpha Vantage and yfinance fallbacks. Memory and decision logs persist locally.

## Event Loop
Graph run per ticker and date: analysts, then debate, then trader, then risk debate, then portfolio decision.

## Execution
None. Output is a rating and report.

## Risk
Aggressive, conservative and neutral debaters argue the trade. `quality_gate.py` rejects analyst reports shorter than 200 characters or containing failure markers.

## Strategies Shipped
None coded. `performance.py` and `_fetch_returns` score earlier calls against later returns.

## AI Components
LLM clients for OpenAI, Anthropic, Google, Azure and the Claude Agent SDK, with role-specific model assignment.

## Connectors
Alpha Vantage, yfinance, A-share sources.

## Fit
Multi-agent research framework tuned to Chinese market rules. Output is advisory text.
