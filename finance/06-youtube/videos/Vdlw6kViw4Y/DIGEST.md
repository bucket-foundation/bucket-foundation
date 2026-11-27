<!-- voice-ignore-file -->
# Algorithmic Day Trading Strategies [Strategies and Data Analysis] | QuantInsti Quantitative Learning | Vdlw6kViw4Y | 1.20 h

Teaches: A QuantInsti beginner webinar on algorithmic day trading: why retail day traders lose, the plan-then-backtest workflow, and two overnight-gap strategies on Amazon data coded in pandas (buy if today's open beats yesterday's close; then a version using 0.25 of a 90-day standard deviation). Results are one-year in-sample examples.

Claims and warnings. Figures and results are self-reported by the speakers and unverified.

- A SEBI study found 89% of individual traders in the equity F&O segment suffered losses. "89% of the individual traders in the equity f o segment suffered losses" [0:05:59]
- Cited from Brazil: 97% of individuals who persisted in day trading for more than 300 days lost money. "97%" [0:06:13]
- An SEC finding cited: 73% of retail FX accounts lost money in a quarter. "73% of retail fx accounts lost" [0:06:31]
- Behavioral trap: holding a rising stock for a higher target out of greed, then watching it fall. "which is where the greed kicks in" [0:09:16]
- Buy and hold is not safe either: a stock fell from 70 to $7 in about a year and a half and kept declining. "it went from 70 to $7 in a span of a year and a half" [0:13:14]
- Rule-based plan: enter long if today's open exceeds yesterday's close, exit at 2% profit or 1% loss. "if today's open is more than yesterday's close then you will enter" [0:14:17]
- Process: create the algorithm and backtest it first, then execute once satisfied with the results. "and finally you look at execution" [0:17:39]
- Self-reported: Strategy 1 on Amazon from September 2018 to September 2019 returned about 15%, which the speaker calls not exceptional. "that is not too bad it is not exceptional" [0:25:49]
- Signal code: if the open is below yesterday's close, short; the cumulative return compounds the full amount each day using cumprod. "the next day you're going to reinvest the entire amount" [0:37:56]
- Warning: the 2018 to 2019 result is one example; the strategy might not have worked in 2020 and would have lost in declining phases. "if you had tried the strategy in 2020 it might not have worked" [0:39:19]
- Strategy 2 buys when overnight return exceeds 0.25 of a rolling 90-day standard deviation and sells when below its negative. "0 25 of the past values" [0:45:24]
- The rolling 90-day window leaves no signal for the first 90 days, so the backtest starts in February 2019. "for the first 90" [0:52:21]
- Self-reported: Strategy 2 raised the return from 1.15 to 1.2 on the same year, with the 0.25 threshold described as arbitrary for illustration. "previously it was 1 15 but now it is 1 2" [0:52:32]
- Universe building: some traders skip stocks priced below 10 and check liquidity so a 1,000-share order can fill. "you can create your own stock universe" [1:09:16]
- Promotional: course discounts of 75% are offered at the end. "on top of 75% discount that is already there" [0:53:54]
