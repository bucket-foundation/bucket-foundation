# Long Strangle

ID `I-opt-strangle`. As of 2026-11-27.

Parent: [stocks](../../stocks.md). Index: [options](README.md).

## Structure
Buy an out-of-the-money call and an out-of-the-money put with the same expiration.

## Payoff Formulas
Per OCC. Grade A.
- Max gain: unlimited.
- Max loss: net premium paid.
- Upside breakeven: call strike plus premiums paid.
- Downside breakeven: put strike minus premiums paid.

## Worked Example
Stock at 100. Premiums in the example are illustrative inputs chosen to show the arithmetic. They are not market quotes. One equity option covers 100 shares.
Buy 110 call at 1.50 and 90 put at 1.30. Cost 2.80, or $280, the max loss. Breakevens 87.20 and 112.80. At 80 at expiry the put is worth 10, for a gain of 7.20, or $720.

## Sources
- [www.optionseducation.org/strategies/all-strategies/long-strangle-long-combination](https://www.optionseducation.org/strategies/all-strategies/long-strangle-long-combination), fetched 2026-11-27.
- [www.cboe.com/insights/posts/trading-options-around-economic-events/](https://www.cboe.com/insights/posts/trading-options-around-economic-events/), fetched 2026-11-27.
