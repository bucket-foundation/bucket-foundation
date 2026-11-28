# Long Straddle

ID `I-opt-straddle`. As of 2026-11-27.

Parent: [stocks](../../stocks.md). Index: [options](README.md).

## Structure
Buy a call and a put at the same strike and expiration.

## Payoff Formulas
Per OCC. Grade A.
- Max gain: unlimited above; strike minus premiums below.
- Max loss: both premiums paid.
- Upside breakeven: strike plus premiums paid.
- Downside breakeven: strike minus premiums paid.

## Worked Example
Stock at 100. Premiums in the example are illustrative inputs chosen to show the arithmetic. They are not market quotes. One equity option covers 100 shares.
Buy 100 call at 4.00 and 100 put at 3.60. Cost 7.60, or $760, the max loss. Breakevens 92.40 and 107.60. At 120 at expiry the call is worth 20, for a gain of 12.40, or $1,240.

## Short Side
The short straddle reverses every sign: max gain is the premium and loss is open-ended. Cboe calls uncovered short straddles potentially undefined risk. Grade A.

## Sources
- [www.optionseducation.org/strategies/all-strategies/long-straddle](https://www.optionseducation.org/strategies/all-strategies/long-straddle), fetched 2026-11-27.
- [www.cboe.com/insights/posts/trading-options-around-economic-events/](https://www.cboe.com/insights/posts/trading-options-around-economic-events/), fetched 2026-11-27.
