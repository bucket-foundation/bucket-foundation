# tradingview-mcp

https://github.com/atilaahmettaner/tradingview-mcp. License MIT. Stars 5,346. Last push 2026-11-20. Python. Checked 2026-11-27.

## Architecture
FastMCP server (`src/tradingview_mcp/server.py`) exposing 39 tools; services in `core/services/` for screeners, multi-timeframe analysis, backtests, sentiment.

## Data Layer
TradingView screener and technical-analysis endpoints, yfinance history, Reddit and news sentiment.

## Event Loop
None; tool calls.

## Execution
None.

## Risk
None.

## Strategies Shipped
`core/services/backtest_service.py`: rsi, bollinger, macd, ema_cross, supertrend, donchian, each with plain and walk-forward backtest.

## AI Components
The whole tool is an MCP surface for an LLM assistant.

## Connectors
Data only.

## Fit
Drop-in screener and quick backtest tools for a Claude research agent; walk-forward tool supports the overfitting check.
