# Short Iron Butterfly

ID `I-opt-iron-butterfly`. As of 2026-11-27.

Parent: [stocks](../../stocks.md). Index: [options](README.md).

## Structure
Buy a low put, sell a put and a call at the middle strike, buy a high call. Wings equidistant from the body; one expiration.

## Payoff Formulas
Per OCC. Grade A.
- Max gain: net premium received.
- Max loss: high strike minus middle strike minus net premium received.
- Breakevens: middle strike plus and minus premium received.

## Worked Example
Stock at 100. Premiums in the example are illustrative inputs chosen to show the arithmetic. They are not market quotes. One equity option covers 100 shares.
Sell 100 call at 4.00 and 100 put at 3.60, buy 110 call at 1.50 and 90 put at 1.30. Credit 4.80, or $480, the max gain at 100. Max loss 10 minus 4.80 is 5.20, or $520. Breakevens 95.20 and 104.80.

## Sources
- [www.optionseducation.org/strategies/all-strategies/short-iron-butterfly](https://www.optionseducation.org/strategies/all-strategies/short-iron-butterfly), fetched 2026-11-27.
- [www.optionseducation.org/news/october-webinar-key-takeaways](https://www.optionseducation.org/news/october-webinar-key-takeaways), fetched 2026-11-27.
