# Short Iron Condor

ID `I-opt-iron-condor`. As of 2026-11-27.

Parent: [stocks](../../stocks.md). Index: [options](README.md).

## Structure
Buy a low put, sell a higher put, sell a call, buy a higher call. Same expiration. OCC lists it as Short Condor.

## Payoff Formulas
Per OCC. Grade A.
- Max gain: net premium received.
- Max loss: width of the call spread or the put spread, minus net premium received.
- Upper breakeven: short call strike plus premium received.
- Lower breakeven: short put strike minus premium received.

## Worked Example
Strikes from the Cboe SPX example with S&P at 5,515: buy 5,400 put, sell 5,450 put, sell 5,600 call, buy 5,650 call. The SPX multiplier is $100. Premiums in the example are illustrative inputs chosen to show the arithmetic. They are not market quotes.
Assume a net credit of 18.00. Max gain $1,800 between 5,450 and 5,600. Max loss 50 minus 18 is 32, or $3,200, below 5,400 or above 5,650. Breakevens 5,432 and 5,618.

## Sources
- [www.optionseducation.org/strategies/all-strategies/short-condor](https://www.optionseducation.org/strategies/all-strategies/short-condor), fetched 2026-11-27.
- [go.cboe.com/0DTE](https://go.cboe.com/0DTE), fetched 2026-11-27.
- [Cboe, Common Options Trading Strategies](https://cdn.cboe.com/resources/options/Trading_Strategies.pdf), fetched 2026-11-27.
