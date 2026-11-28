# zeus-options-terminal

https://github.com/jackson-cmd/zeus-options-terminal. License Other (PolyForm Noncommercial 1.0.0). Stars 351. Last push 2026-11-26. Python. Checked 2026-11-27.

## Architecture
Self-hosted web app in `zeus/`. `zeus_routes.py` serves the HTTP routes and `zeus_mcp.py` an MCP server. Feature packages: `trade_journal`, `journal_review`, `pre_trade_checkup`, `sr_alert`, `stock_picker`, `ta_screener`, `ai_picks`, `benzinga_*`, `sec_filings`, `eod_crawler`, `ema_pop_backtest`.

## Data Layer
Broker feeds through `zeus_brokers.py`, Yahoo via `zeus_yf.py`, Barchart and Benzinga scrapers, SEC filings. Journal data is stored locally.

## Event Loop
Server routes plus background workers and schedulers; no event engine.

## Execution
`local_broker.py` is a paper broker with option and stock legs, OCC symbol builders and option symbol parsing. Live brokers are read-only account sources.

## Risk
`pre_trade_checkup` runs four layers (trend, touch, IV and earnings, macro). `heatmap/risk_stats.py` and the P/L grid cover position risk. `sr_alert` flags support and resistance zones.

## Strategies Shipped
`ema_pop_backtest` backtest config; `pre_trade_checkup` layers; `stock_picker` selection.

## AI Components
`ai_picks/haiku_picks.py` calls the Claude CLI to sort tickers into five groups. `zeus_ai.py` and `narratives/` use the same subprocess pattern.

## Connectors
tastytrade, Alpaca, Yahoo, Benzinga, Barchart, SEC.

## Fit
Complete options desk for one trader. Noncommercial license blocks reuse in a product.
