# SOFR

ID `M-sofr`. As of 2026-11-27. Section: money market plumbing.

## What It Is
The Secured Overnight Financing Rate, "a broad measure of the cost of borrowing cash overnight collateralized by Treasury securities." It covers all Broad General Collateral Rate trades plus bilateral Treasury repo cleared through FICC's DVP service, filtered to remove part of the specials. Published each business day near 8:00 a.m. ET. Grade A.

## Current State
NY Fed Markets API, fetched 2026-11-27. Grade A.
| Date | Rate | 1st pct | 25th | 75th | 99th | Volume |
|---|---|---|---|---|---|---|
| 25 Nov 2026 | 3.95 | 3.89 | 3.93 | 4.01 | 4.03 | $3,145B |
| 24 Nov 2026 | 3.94 | 3.87 | 3.92 | 3.99 | 4.02 | $3,158B |
| 23 Nov 2026 | 3.92 | 3.87 | 3.90 | 3.97 | 3.99 | $3,173B |
Tri-party general collateral rate TGCR 3.93% on 25 Nov, $1,214B.

The 75th and 99th percentiles sit above the 4.0% standing repo rate while facility usage was zero, so some borrowers pay above the cap rather than use the Fed.

## Data
FRED `SOFR` ([lab](../../lab/data/raw/fred/SOFR.csv)); [NY Fed API](https://markets.newyorkfed.org/api/rates/secured/sofr/last/3.json).

## Sources
- [NY Fed SOFR page](https://www.newyorkfed.org/markets/reference-rates/sofr), fetched 2026-11-27. Grade A.
- NY Fed Markets API SOFR and TGCR, fetched 2026-11-27. Grade A.
