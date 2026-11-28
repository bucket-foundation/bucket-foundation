# Covered Call

ID `I-opt-covered-call`. As of 2026-11-27.

Parent: [stocks](../../stocks.md). Index: [options](README.md).

## Structure
Own 100 shares and sell one call against them.

## Payoff Formulas
Per OCC. Grade A.
- Max gain: strike minus stock purchase price plus premium received.
- Max loss: stock purchase price minus premium received.
- Breakeven: stock purchase price minus premium received.

## Worked Example
Premiums in the example are illustrative inputs chosen to show the arithmetic. They are not market quotes. One equity option covers 100 shares.
Buy stock at 100, sell 105 call at 2.00. Max gain 105 minus 100 plus 2 is 7, or $700. Max loss 98, or $9,800, if the stock goes to zero. Breakeven 98.

## Sources
- [www.optionseducation.org/strategies/all-strategies/covered-call-buy-write](https://www.optionseducation.org/strategies/all-strategies/covered-call-buy-write), fetched 2026-11-27.
