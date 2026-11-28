# Live-Sports-Arbitrage-Bet-Finder

https://github.com/personal-coding/Live-Sports-Arbitrage-Bet-Finder. License not stated. Stars 298. Last push 2023-11-25. Python. Checked 2026-11-27.

## Architecture
Five flat scripts: `F & D - Arb_Website.py` (FanDuel and DraftKings), `F & W - Arb_Website - Two Person.py` (FanDuel and William Hill), a two-person variant of the first, and `payoff_matrix.py`. No package structure.

## Data Layer
Scrapes live odds from sportsbook sites about every 10 ms, per the README. Nothing is stored.

## Event Loop
Polling loop per script that compares the two books on each pass.

## Execution
None. The script prints the stake split and the profit; the user places bets by hand. The two-person scripts split one leg per operator.

## Risk
Stake split sized to equalize payoff across both outcomes. No limit or account checks.

## Strategies Shipped
Two-way live arbitrage across a pair of sportsbooks, with `payoff_matrix.py` for the outcome table.

## AI Components
None.

## Connectors
FanDuel, DraftKings and William Hill web pages.

## Fit
Shows the arbitrage test and stake split for two-outcome markets. Scraping targets are fragile and the code carries no license.
