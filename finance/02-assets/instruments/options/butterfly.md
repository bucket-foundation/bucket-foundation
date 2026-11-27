# Long Call Butterfly

ID `I-opt-butterfly`. As of 2026-11-27.

Parent: [stocks](../../stocks.md). Index: [options](README.md).

## Structure
Buy one low-strike call, sell two middle-strike calls, buy one high-strike call. Wings equidistant; one expiration.

## Payoff Formulas
Per OCC. Grade A.
- Max gain: high strike minus middle strike minus net premium paid, at the middle strike.
- Max loss: net premium paid, outside the wings.
- Breakevens: lower strike plus premium paid, upper strike minus premium paid.

## Worked Example
OCC strikes: 55, 60, 65. Premiums in the example are illustrative inputs chosen to show the arithmetic. They are not market quotes. One equity option covers 100 shares.
Buy 55 call at 6.20, sell two 60 calls at 3.00, buy 65 call at 1.20. Debit 1.40, or $140, the max loss. Max gain 5 minus 1.40 is 3.60, or $360, at 60. Breakevens 56.40 and 63.60.

## Sources
- [www.optionseducation.org/strategies/all-strategies/long-call-butterfly](https://www.optionseducation.org/strategies/all-strategies/long-call-butterfly), fetched 2026-11-27.
