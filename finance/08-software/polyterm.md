# polyterm

https://github.com/NYTEMODEONLY/polyterm. License MIT. Stars 370. Last push 2026-10-14. Python. Checked 2026-11-27.

## Architecture
Terminal app for Polymarket and Kalshi. `polyterm/api/` clients (CLOB, Gamma, Data API, subgraph, aggregator), `core/` (scanner, arbitrage, negrisk, whale tracker, wash trade detector, wallet intelligence, alert engine, cross venue monitor, risk score, fees, rewards, UMA tracker), `cli/commands/` (over 100 commands), `agent/` (registry, contracts, MCP servers with tools for alerts, analytics, market, scan, wallet and watch), `db/`, `tui/`.

## Data Layer
Polymarket CLOB, Gamma, Data API and subgraph over REST; local SQLite through `db/database.py`; an archive collector for market snapshots.

## Event Loop
Watch and monitor loops poll markets and fire alert rules. Live book freshness checks over websocket.

## Execution
Mostly read-only. `trade.py` and `quicktrade.py` commands exist; a demo strategy simulator (`demo_strategy_sim.py`) runs seeded paper runs.

## Risk
`risk_score.py`, `risk.py` and `size.py` commands, fees and rewards calculators.

## Strategies Shipped
`arbitrage.py` scans Polymarket and Kalshi for mispriced pairs and negative-risk sets; whale and print scanners; volume spike detection.

## AI Components
MCP servers in `agent/mcp` and `llms.txt` for agent use. No model inference in the app.

## Connectors
Polymarket, Kalshi, UMA, news feeds.

## Fit
Wide analytics terminal and MCP surface for prediction markets. Strong for monitoring and arbitrage screens.
