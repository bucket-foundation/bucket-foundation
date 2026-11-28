# Order Types

ID: `MS-orders`
As of: 2026-11-27
Bead: `bkt-q5moa.6`

## What It Is

An order tells the broker what to buy or sell, at what price and for how long. Market, limit and stop orders are the base set; time-in-force flags set lifetime.

## Key Numbers and Dates

- Market order: executes at once at the prevailing price; in fast markets the fill can be worse than the quote. **B**
- Limit order: buy fills at the limit or lower, sell at the limit or higher; no fill guarantee. **B**
- Stop order: becomes a market order when the stop price trades. **B**
- Stop-limit: becomes a limit order at the stop, so it may never fill. **B**
- Time in force: Day is the default; GTC and IOC set lifetime. **B**

## 2026 State

Nasdaq's Night Session permits limit orders only: unpriced orders are not permitted, pegged orders are unavailable and M-ELO orders are rejected. **A** Blue Ocean ATS overnight trading through Alpaca supports limit orders only. **B** See `trading-hours.md`.

## Sources

1. Investor.gov, Types of Orders. https://www.investor.gov/introduction-investing/investing-basics/how-stock-markets-work/types-orders (search snippet (fetched 2026-11-27), page returned 403)
2. Investor.gov, Investor Bulletin: Stop, Stop-Limit and Trailing Stop Orders. https://www.investor.gov/additional-resources/news-alerts/alerts-bulletins/investor-bulletin-stop-stop-limit-trailing-stop (fetched 2026-11-27)
3. FINRA, Order Up: Six Common Types of Stock Orders. https://www.finra.org/investors/insights/order-six-common-types-stock-orders (fetched 2026-11-27)
4. Federal Register, Nasdaq Night Session notice, 2026-04-15. https://www.govinfo.gov/content/pkg/FR-2026-04-15/html/2026-07259.htm (fetched 2026-11-27)
5. Alpaca, 24/5 Trading. https://docs.alpaca.markets/docs/245-trading (fetched 2026-11-27)

Grades: A primary data or statute, B reputable secondary, C single source or unfetched.
