# Fed Balance Sheet, H.4.1

ID `M-h41-balance-sheet`. As of 2026-11-27. Section: central bank operations.

## What It Is
The H.4.1 release, "Factors Affecting Reserve Balances", published each Thursday at 4:30 p.m. ET for the week ending Wednesday. It lists Fed assets, the liabilities that absorb reserves (currency, TGA, ON RRP) and the residual: reserve balances.

## Mechanism
Reserves = Fed assets minus non-reserve liabilities. A rise in the TGA, currency or ON RRP drains reserves even when assets are flat.

## Current State
Week ending 18 Nov 2026. Grade A.
| Line | $ billions |
|---|---|
| Total assets, WALCL | 6,741.5 |
| Treasury securities, TREAST | 4,587.1 |
| Agency MBS, WSHOMCB | 1,883.5 |
| Central bank swaps, SWPT | 0.146 |
| TGA, WTREGEN | 916.6 |
| Reserve balances, WRESBAL | 2,979.7 |

Reserves rose $19.1B on the week and $91.0B on the year; total factors absorbing reserves stood at $3,824.5B. The 28 Oct 2026 directive tells the Desk to buy bills "to maintain an ample level of reserves" and to reinvest all agency principal into bills.

## Market Reaction
Reserve drops toward the ample threshold have preceded repo stress: Sept 2019. Rising bill purchases add reserves and cap bill yields.

## Data
FRED `WALCL` ([lab](../../lab/data/raw/fred/WALCL.csv)), `TREAST`, `WSHOMCB`, `WRESBAL` ([lab](../../lab/data/raw/fred/WRESBAL.csv)), `WTREGEN` ([lab](../../lab/data/raw/fred/WTREGEN.csv)), `SWPT`.

## Sources
- [H.4.1 current release](https://www.federalreserve.gov/releases/h41/current/), fetched 2026-11-27. Grade A.
- [Implementation note 28 Oct 2026](https://www.federalreserve.gov/newsevents/pressreleases/monetary20261028a1.htm), fetched 2026-11-27. Grade A.
- FRED series above, fetched 2026-11-27. Grade A.
