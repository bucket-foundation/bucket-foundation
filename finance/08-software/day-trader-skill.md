# day-trader-skill

https://github.com/Jakeschincariol/day-trader-skill. License MIT. Stars 9,864. Last push 2026-10-20. Python. Checked 2026-11-27.

## Architecture
Eleven Claude skills, each a folder with `SKILL.md` and one stdlib Python script: `trader-scanner/scan.py`, `trader-news`, `trader-entry/entry.py`, `trader-exit/exit.py`, `trader-timemachine`, `trader-budget/size.py`, `trader-risk/check.py`, `trader-broker/ticket.py`, `trader-alerts`, `trader-analyst`, `trader-pelosi`. Skills pass state through JSON files under `trader/`.

## Data Layer
Yahoo Finance charts, Nasdaq Trader symbol lists, SEC EDGAR and House Clerk filings. State is `watchlist.json`, `entry.json`, `plan.json`, `orders.json` and a verdict log.

## Event Loop
None. Each script runs once per prompt; entry timing re-reads 1-minute or 5-minute bars.

## Execution
`ticket.py` renders a plain-language ticket, waits for a typed yes word, and emits the JSON shape of Alpaca's `place_stock_order` for the official Alpaca MCP server. Paper keys are the default.

## Risk
`check.py` is a hard gate: stop required, loss at stop within max per trade, minimum reward to risk, daily loss cap, trades per day, entry window, blocked tickers, position and cash limits. A BLOCK cannot be overridden.

## Strategies Shipped
Daily setups (20-day high breakout, bull flag, reclaimed 20-day average, oversold bounce) and 15-minute opening-range breakout with a 2R target.

## AI Components
The skills are the product: Claude orchestrates the chain and a Monte Carlo replay (10,000 sessions) scores a plan.

## Connectors
Yahoo, EDGAR, Alpaca MCP.

## Fit
Clean example of a human-approval gate and a risk check before any order object exists.
