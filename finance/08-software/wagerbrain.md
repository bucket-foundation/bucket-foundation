# WagerBrain

https://github.com/sedemmler/WagerBrain. License MIT. Stars 322. Last push 2020-05-02. Python. Checked 2026-11-27.

## Architecture
Small math package `WagerBrain/`: `odds.py`, `probs.py`, `payouts.py`, `bankroll.py`, `strats/arb.py`, `strats/value.py`, `utils.py`, and `data/scraper.py` with four bundled SQLite team databases (MLB, NBA, NFL, NHL).

## Data Layer
Pure functions on odds values and DataFrames. Historical team data in `.db` files, refreshed with the scraper.

## Event Loop
None.

## Execution
None.

## Risk
Bankroll sizing in `bankroll.py`: `basic_kelly_criterion`, `fibonacci_bankroll`, `five_bet_labouchere_bankroll`.

## Strategies Shipped
`strats/arb.py` (`arb_percentage`, `arb_profit`, `basic_arbitrage`) and `strats/value.py` (spread helpers for home dog and favorite).

## AI Components
None.

## Connectors
None.

## Fit
Odds conversion, implied probability and Kelly sizing helpers that port directly to prediction-market contracts.
