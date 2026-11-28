# PAC and Support Tranches

ID `I-mbs-pac`. As of 2026-11-27.

Parent: [mbs](../../mbs.md). Index: [mbs instruments](README.md).

## Structure
A Planned Amortization Class tranche follows a fixed principal schedule that holds across a band of prepayment speeds. Support, or companion, tranches absorb the excess or shortfall so the PAC stays on schedule. Ginnie Mae describes PAC bonds as built for stable principal repayment across a range of prepayment environments, and names insurers as large buyers for liability matching. Grade A.

## Band Rule
The Ginnie Mae multiclass guide sets a minimum PAC band in PSA terms. The guide returned an HTML page on fetch, so the band width is not fetched. Grade C.

## Who Holds What
PAC buyers trade yield for predictable duration. Support buyers take the extension and contraction risk for a higher yield.

## Worked Example
Balances and rates in the example are illustrative inputs chosen to show the arithmetic. A PAC schedules $5M of principal this month. Collateral pays $8M: PAC gets $5M, support gets $3M. Next month collateral pays $4M: PAC gets $4M and is $1M behind, support gets $0 and pays the shortfall from later cash. Once the support tranche is retired, the PAC behaves like a pass-through and the schedule breaks.

## Sources
- [Ginnie Mae Global Markets Analysis, April 2026](https://www.ginniemae.gov/s3/sites/default/files/assets/redirects/global_market_analysis_apr26.pdf), fetched 2026-11-27.
- [Fannie Mae, Basics of Structured Transactions](https://capitalmarkets.fanniemae.com/media/4396/display): HTTP 403; status: not fetched.
