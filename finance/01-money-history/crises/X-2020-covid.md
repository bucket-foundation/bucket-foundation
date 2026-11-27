# X-2020-covid: COVID Crash

Event card, February to March 2020. Grades: A primary or lab-computed, B secondary, C snippet or single unchecked source.

## What Happened
The S&P 500 fell 34% in 23 trading days from 19 February 2020. Even Treasuries sold off as dealers clogged. The Fed cut to zero on 15 March, bought Treasuries and MBS without limit, and reopened swap lines; stocks bottomed on 23 March.

## Causes and Mechanics
A sudden stop in activity met a market where everyone needed dollars at once. Funds sold Treasuries for cash; dealer balance sheets filled and the reuse of Treasury collateral fell. Offshore dollar borrowers paid up. Fed buying and swap lines restored function.

## Dates and Numbers
| Claim | Grade | Source |
|---|---|---|
| 15 Mar 2020: fed funds to 0 to 1/4%; at least $500B of Treasuries and $200B of agency MBS | A | [link](https://www.federalreserve.gov/newsevents/pressreleases/monetary20200315a.htm) |
| Treasury collateral multiplier averaged 7.5 in 2019; "The multiplier fell to 5.5 in the second week of March." | A | [link](https://www.federalreserve.gov/econres/notes/feds-notes/treasury-market-functioning-during-the-covid-19-outbreak-evidence-from-collateral-re-use-20201204.html) | <!-- voice-ignore-line -->
| "indicators of dollar funding costs in foreign exchange markets have risen sharply" | A | [link](https://www.bis.org/publ/bisbull01.pdf) | <!-- voice-ignore-line -->

## Lab Data
SPY daily: 19 Feb to 23 Mar 2020, down 33.7%; 16 Mar down 10.94% (worst day since 1993), 12 Mar down 9.57%, 9 Mar down 7.81%. TLT down 15.7% from 9 to 18 Mar; GLD down 12.5%. 10y yield 0.54% on 9 Mar, 1.18% on 18 Mar. BTC down 37.2% on 12 Mar. 10y minus 3m inverted from Jun 2019. Grade A, lab.

## Systematic Trader View
In a dash for cash, bonds, gold and bitcoin all fell with stocks; only cash hedged. Rising Treasury yields during an equity crash marked market dysfunction and preceded the Fed's biggest moves. Trend rules lost on the V-shaped rebound; mean-reversion buying after the Fed's 23 March pledge paid.

## Primary Sources
- Federal Reserve FOMC statement 15 Mar 2020, fetched or computed 2026-11-27.
- FEDS Notes, 4 Dec 2020, fetched or computed 2026-11-27.
- BIS Bulletin No. 1, fetched or computed 2026-11-27.
- Yahoo SPY, TLT, GLD, BTC-USD; FRED DGS10, fetched or computed 2026-11-27.

Lab method: Computed 2026-11-27 from `finance/lab/data/raw/` by `finance/lab/crisis_stats.py`: Shiller `ie_data.xls` monthly averages, FRED CSVs, Yahoo daily adjusted closes.
