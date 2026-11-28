<!-- voice-ignore-file: transcript-derived digest -->
# Building a Profitable Trading Bot (Kalshi & Polymarket) | Victor Sha | sAONff8XU80 | 0.34 h

Teaches: A prediction-market bot for 15-minute BTC up/down markets on Kalshi and Polymarket, with the math for treating the cointegrated price difference as a mean-reverting process, plus maker/taker mechanics and Kelly sizing.

Claims:
- The challenge account restarted at $200 and reached about $350, a $150 gain of about 80%, in roughly 11 days. "$350 a $150 of profit about 80%" [0:00:06]
- He spent 2 to 3 weeks rebuilding the machine learning model; the model price is compared with the market price and a yes contract is bought when the model probability exceeds the market price. "i spent about 2 to 3 weeks" [0:00:59]
- The Kalshi minus Polymarket price differential is stable for roughly the first 10 minutes of each 15-minute window, so it can be traded for round trips. "polymarket price on a single 15 minute" [0:04:06]
- An augmented Dickey-Fuller test on 194 cointegrated market series rejected the random walk hypothesis in 93% of them, with a half-life of about 1.5 seconds. "this test to what 194 market series" [0:11:14]
- Maker orders are typically free (sometimes with a small incentive) and taker orders pay fees; selling a no contract equals buying a yes contract. "selling a no contract equals to buying" [0:15:06]
- 50% per round is decimated by a bad streak in simulation. "an aggressively say 50% every single round" [0:19:13]
- He says engineering is about 90% of the effort. "all is engineering which is about 90%" [0:20:01]

Architecture: Data: Kalshi and Polymarket prices for 15-minute BTC markets. Signal: model-implied probability versus market price, and the cointegrated Kalshi/Polymarket differential. Model: machine learning probability model plus mean-reversion statistics (ADF test, half-life). Execution: maker versus taker orders, round trips every few seconds in the first 10 minutes. Risk: Kelly or sub-Kelly sizing. Not an arbitrage, since settlement rules differ.

Worked:
- Reported $200 to about $350 in 11 days (unverified). "at $200 right now it's about $350" [0:00:03]
- 93% of 194 series passed the mean-reversion test. "this test to what 194 market series" [0:11:14]

Failed:
- Differentials in the last 5 minutes sometimes diverge because the two markets settle differently, so they are not arbitrage. "last 5 minutes sometimes the the differential" [0:05:01]
- Momentum trading is too competitive on speed. "than anybody else and it's incredibly competitive" [0:02:48]
