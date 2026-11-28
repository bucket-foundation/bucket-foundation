# Treasury Yields and Curve

ID `M-treasury-yields-curve`. As of 2026-11-27. Section: indicators.

## What It Is
Constant maturity Treasury yields from the Treasury's daily par curve, published by the Fed in H.15.

## Current State
24 Nov 2026 unless noted. Grade A.
| Tenor | Series | Yield |
|---|---|---|
| 3-month | DGS3MO | 4.36% |
| 2-year | DGS2 | 4.63% |
| 10-year | DGS10 | 4.91% |
| 10y minus 2y, 25 Nov | T10Y2Y | 0.24 |
| 10y minus 3m, 25 Nov | T10Y3M | 0.51 |

The 10-year peaked at 5.31% on 5 Oct 2026 per [2026-STATE](../../02-assets/2026-STATE.md). Bills and 2-years sit above the 3.75% to 4.00% target range.

## Data
FRED `DGS1MO` through `DGS30` in [lab](../../lab/data/raw/fred/), `DTB3` ([lab](../../lab/data/raw/fred/DTB3.csv)).

## Sources
- [FRED](https://fred.stlouisfed.org/), series pages for the ids above, fetched 2026-11-27. Grade A.
