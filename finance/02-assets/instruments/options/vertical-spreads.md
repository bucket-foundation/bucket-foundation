# Vertical Spreads

ID `I-opt-vertical`. As of 2026-11-27.

Parent: [stocks](../../stocks.md). Index: [options](README.md).

## Structure
Two options of the same type and expiration at different strikes. Four forms: bull call and bear put are debit spreads; bull put and bear call are credit spreads.

## Payoff Formulas
Per OCC, with W = high strike minus low strike. Grade A.

| Spread | Max gain | Max loss | Breakeven |
|---|---|---|---|
| Bull call | W minus net debit | Net debit | Long call strike plus net debit |
| Bear put | W minus net debit | Net debit | Long put strike minus net debit |
| Bull put | Net credit | W minus net credit | Short put strike minus net credit |
| Bear call | Net credit | W minus net credit | Short call strike plus net credit |

## Worked Example
Stock at 100. Premiums in the example are illustrative inputs chosen to show the arithmetic. They are not market quotes. One equity option covers 100 shares.
- Bull call: buy 100 call at 4.00, sell 110 call at 1.50. Debit 2.50. Max gain 10 minus 2.50 is 7.50, or $750. Max loss $250. Breakeven 102.50.
- Bear put: buy 100 put at 3.80, sell 90 put at 1.20. Debit 2.60. Max gain $740. Max loss $260. Breakeven 97.40.
- Bull put: sell 95 put at 2.00, buy 90 put at 0.80. Credit 1.20. Max gain $120. Max loss 5 minus 1.20 is 3.80, or $380. Breakeven 93.80.
- Bear call: sell 105 call at 2.10, buy 110 call at 0.90. Credit 1.20. Max gain $120. Max loss $380. Breakeven 106.20.

Cboe shows the same shapes on SPX: a 5,530/5,580 bull call and a 5,500/5,450 bear put with S&P at 5,515. Grade A.

## Sources
- [www.optionseducation.org/strategies/all-strategies/bull-call-spread-debit-call-spread](https://www.optionseducation.org/strategies/all-strategies/bull-call-spread-debit-call-spread), fetched 2026-11-27.
- [www.optionseducation.org/strategies/all-strategies/bear-put-spread](https://www.optionseducation.org/strategies/all-strategies/bear-put-spread), fetched 2026-11-27.
- [www.optionseducation.org/strategies/all-strategies/bull-put-spread-credit-put-spread](https://www.optionseducation.org/strategies/all-strategies/bull-put-spread-credit-put-spread), fetched 2026-11-27.
- [www.optionseducation.org/strategies/all-strategies/bear-call-spread-credit-call-spread](https://www.optionseducation.org/strategies/all-strategies/bear-call-spread-credit-call-spread), fetched 2026-11-27.
- [Cboe, Common Options Trading Strategies](https://cdn.cboe.com/resources/options/Trading_Strategies.pdf), fetched 2026-11-27.
