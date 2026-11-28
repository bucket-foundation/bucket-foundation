# IO and PO Strips

ID `I-mbs-strips`. As of 2026-11-27.

Parent: [mbs](../../mbs.md). Index: [mbs instruments](README.md).

## Structure
A strip splits pool cash flow into an interest-only class and a principal-only class. Freddie Mac forms strips from Supers, Gold PCs, Giant MBS or XSIO cash flows, and Gold MACS let holders exchange a fixed-rate Giant PC for IO, PO or synthetic coupon PCs. An IO REMIC bond pays interest on a declining notional balance. Grade A.

## Prepayment Exposure
Faster prepayments shrink the notional, so IO value falls when rates fall. A PO is bought at a discount and returns par as principal arrives, so faster prepayments raise its value. Ginnie Mae names IO and PO as the tools hedge funds use for capital-efficient views on prepayment and convexity. Grade A.

## Worked Example
Balances and rates in the example are illustrative inputs chosen to show the arithmetic. $100M pool, 6.0% coupon. PO bought at 70, cost $70M; IO bought at 30, cost $30M. If the whole pool prepays in year one, the PO gets $100M for a $30M gain and the IO gets about one year of interest, near $6M, for a $24M loss. If the pool pays slowly over ten years, the IO collects far more interest and the PO waits years for par.

## Sources
- [Freddie Mac Capital Markets product FAQ](https://capitalmarkets.freddiemac.com/mbs/products/faq), fetched 2026-11-27.
- [Ginnie Mae Global Markets Analysis, April 2026](https://www.ginniemae.gov/s3/sites/default/files/assets/redirects/global_market_analysis_apr26.pdf), fetched 2026-11-27.
- [Fannie Mae, Basics of Structured Transactions](https://capitalmarkets.fanniemae.com/media/4396/display): HTTP 403; status: not fetched.
