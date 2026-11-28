# Bank Reserves

ID `M-bank-reserves`. As of 2026-11-27. Section: money market plumbing.

## What It Is
Deposits that banks hold at Federal Reserve Banks. Only banks and a few institutions hold them. They settle interbank payments and meet liquidity rules; they are the base layer of the dollar.

## Mechanism
Reserves change when the Fed buys or sells assets, lends, or when non-reserve liabilities move. A $100B TGA rise drains $100B of reserves unless ON RRP falls by the same amount. Banks lend to customers by creating deposits, so reserves are a settlement asset and a constraint on liquidity, a point the Bank of England made in 2014; see [boe-2014-money-creation](boe-2014-money-creation.md).

## Current State
- Reserve balances $2,979.7B, week of 18 Nov 2026, up $91.0B year on year. Grade A.
- Monthly total reserves $2,974.0B in Oct 2026, FRED TOTRESNS. Grade A.

## Market Reaction
Falling reserves widen SOFR over IORB and push repo usage; rising reserves compress funding spreads and support risk assets through dealer balance sheets.

## Data
FRED `WRESBAL` ([lab](../../lab/data/raw/fred/WRESBAL.csv)), `TOTRESNS` ([lab](../../lab/data/raw/fred/TOTRESNS.csv)).

## Sources
- [H.4.1 current release](https://www.federalreserve.gov/releases/h41/current/), fetched 2026-11-27. Grade A.
- [FRED WRESBAL](https://fred.stlouisfed.org/series/WRESBAL), fetched 2026-11-27. Grade A.
