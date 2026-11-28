# Collar

ID `I-opt-collar`. As of 2026-11-27.

Parent: [stocks](../../stocks.md). Index: [options](README.md).

## Structure
Own 100 shares, buy a lower-strike put, sell a higher-strike call. Same expiration.

## Payoff Formulas
Let N be the net option cost, positive for a debit and negative for a credit. Grade A for the debit forms on the OCC page.
- Max gain: call strike minus stock purchase price minus N.
- Max loss: stock purchase price minus put strike plus N.
- Breakeven: stock purchase price plus N.

The OCC page prints the credit case of max loss as "stock purchase minus put strike plus net credit received". With the sign convention above, a credit lowers the loss, so the credit term subtracts. Grade B on that line.

## Worked Example
Premiums in the example are illustrative inputs chosen to show the arithmetic. They are not market quotes. One equity option covers 100 shares.
Buy stock at 100, buy 95 put at 2.50, sell 110 call at 1.50. Net debit 1.00. Max gain 110 minus 100 minus 1 is 9, or $900. Max loss 100 minus 95 plus 1 is 6, or $600. Breakeven 101.

## Sources
- [www.optionseducation.org/strategies/all-strategies/collar-protective-collar](https://www.optionseducation.org/strategies/all-strategies/collar-protective-collar), fetched 2026-11-27.
