# Calendar Spread

ID `I-opt-calendar`. As of 2026-11-27.

Parent: [stocks](../../stocks.md). Index: [options](README.md).

## Structure
Sell a near-dated option and buy a later-dated option of the same type and strike. Long call calendar per OCC.

## Payoff Formulas
- Max loss: net debit paid, reached when the two options trade at parity. Grade A.
- Max gain: reached when the stock sits at the strike at near-term expiration. It depends on the far option's remaining time value and implied volatility, so OCC gives no closed form. Grade A.
- Breakeven: a function of the stock price and the far option's value at near expiry. If the near option expires worthless, the far call alone breaks even at strike plus premium paid. Grade A.

## Worked Example
Stock at 100. Premiums in the example are illustrative inputs chosen to show the arithmetic. They are not market quotes. One equity option covers 100 shares.
Sell 30-day 100 call at 2.00, buy 90-day 100 call at 4.50. Debit 2.50, or $250, which is the max loss. If the stock is at 100 on day 30 and the 60-day call is worth 3.50, the position is worth 3.50 for a gain of 1.00, or $100. If the short call expires worthless and the spread is held, the long call breaks even at 102.50.

## Sources
- [www.optionseducation.org/strategies/all-strategies/long-call-calendar-spread-call-horizontal](https://www.optionseducation.org/strategies/all-strategies/long-call-calendar-spread-call-horizontal), fetched 2026-11-27.
