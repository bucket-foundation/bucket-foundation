# Overnight Reverse Repo Facility

ID `M-on-rrp`. As of 2026-11-27. Section: central bank operations.

## What It Is
The New York Fed borrows cash overnight from money market funds, GSEs and dealers against Treasury collateral from the SOMA portfolio. It sets a floor under money market rates for firms that cannot earn IORB.

## Current State
- Offering rate 3.75%, the bottom of the target range, with a per-counterparty limit of $160 billion per day, per the 28 Oct 2026 directive. Grade A.
- Take-up $0.3 billion on 25 Nov 2026, FRED RRPONTSYD. The facility peaked above $2 trillion in 2022 and 2023; at near zero it no longer buffers reserves, so further balance sheet shrinkage or TGA rises drain bank reserves one for one. Grade A.

## Market Reaction
When ON RRP was large, Treasury bill issuance pulled cash out of the facility and left reserves untouched. With the facility empty, bill supply competes with bank reserves and shows up in SOFR above IORB.

## Data
FRED `RRPONTSYD` ([lab](../../lab/data/raw/fred/RRPONTSYD.csv)), `RRPONTSYAWARD`.

## Sources
- [Implementation note 28 Oct 2026](https://www.federalreserve.gov/newsevents/pressreleases/monetary20261028a1.htm), fetched 2026-11-27. Grade A.
- [FRED RRPONTSYD](https://fred.stlouisfed.org/series/RRPONTSYD), fetched 2026-11-27. Grade A.
