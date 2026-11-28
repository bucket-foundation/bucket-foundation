# AlphaSift

https://github.com/ZhuLinsen/alphasift. License Apache License 2.0. Stars 599. Last Push 2026-11-27. Python 3.10+. Checked 2026-11-27.

## Architecture
Package `alphasift/` of about 40,000 lines: `pipeline.py`, `filter.py`, `scorer.py`, `ranker.py`, `risk.py`, `evaluate.py`, `daily.py`, `mcp.py`, `server.py`, `cli.py`. Strategies and chart patterns are YAML in `strategies/` and `alphasift/patterns/`.

## Data Layer
Market snapshots for 7 markets from akshare, efinance, baostock and yfinance, with source guards and history files. Run history and a public ledger are stored as JSON.

## Event Loop
Daily batch after the close, started by CLI or Docker. Also a stdio MCP server and an HTTP server.

## Execution
None. Output is a ranked list and a paper benchmark.

## Risk
`risk.py` adds a rule overlay to each shortlisted pick: chase on large daily gain, breakdown, abnormal volume ratio, high turnover, invalid PE, weak signal, bearish MACD, overbought RSI. Portfolio profile caps same-bucket picks.

## Strategies Shipped
12 YAML screens such as `momentum_quality`, `dual_low`, `oversold_reversal`, `volume_breakout`, `shrink_pullback`, `blue_chip_income`, plus 9 candle patterns.

## AI Components
`llm_client.py` routes to multiple providers for red-flag filtering from announcements and news; `evaluate.py` scores `next_open` T+N returns against a benchmark.

## Connectors
Free data libraries; MCP; notification hooks.

## Fit
Best reference here for combining a rules screen with an LLM veto and a public forward track record. Documentation leads in Chinese.
