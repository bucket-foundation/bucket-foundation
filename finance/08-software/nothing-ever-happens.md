# nothing-ever-happens

https://github.com/sterlingcrispin/nothing-ever-happens. License CC0-1.0. Stars 979. Last push 2026-04-13. Python. Checked 2026-11-27.

## Architecture
`bot/main.py` starts one strategy, `bot/strategy/nothing_happens.py`, beside an exchange layer (`bot/exchange/` with `base.py`, `paper.py`, `polymarket_clob.py`), a risk controller, a redeemer, a reconciler and a small dashboard (`bot/dashboard.py`, `static/dashboard.html`). About 5,100 lines of Python.

## Data Layer
SQLAlchemy store in `bot/db.py` and `store.py`, SQLite locally or Postgres through `DATABASE_URL`. Markets come from Polymarket through `standalone_markets.py`; order books from the CLOB client.

## Event Loop
asyncio with fixed-interval tasks from `config.example.json`: market refresh every 600 s, price poll, position sync and order dispatch every 60 s, redeemer every 1,800 s.

## Execution
Buys the "No" token on eligible markets under a price cap (`max_entry_price` 0.65) with slippage limit and retry with backoff. `paper.py` fills against books without sending orders. `redeemer.py` redeems resolved positions; `proxy_wallet.py` handles the Polymarket proxy wallet.

## Risk
`RiskController`: daily rolling balance high-water mark, drawdown check and a kill switch with a stored reason. Sizing at 2 percent of cash per trade with a minimum amount, and an optional cap on new positions. `live_recovery.py` and `reconcile.py` rebuild state after restarts.

## Strategies Shipped
`nothing_happens`: spreads small buys of "No" across non-sports markets, a favorite-longshot bet that the stated event does not occur.

## AI Components
None.

## Connectors
Polymarket CLOB (chain 137), Polymarket data endpoints, Polygon redemption.

## Fit
Small, readable Polymarket bot with paper mode, kill switch and recovery in place. The README calls it a meme, so treat the strategy as an example and the plumbing as the value.
