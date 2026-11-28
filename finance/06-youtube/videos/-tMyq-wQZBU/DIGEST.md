<!-- voice-ignore-file: transcript-derived digest -->
# Building a GPT-6 Kalshi AI Trading Bot From Scratch (full guide) | All About AI | -tMyq-wQZBU | 0.59 h

Teaches: A walkthrough of building a bot for Kalshi's New York City daily high-temperature markets using Google DeepMind's Weather Next 3 forecasts, a coding agent, and an AWS VPS, including a short backtest and a first paper/live run.

Claims:
- Target is the Kalshi NYC daily temperature market, entering at 16:01 Oslo time, one minute after a new event opens; the contract settles on the Central Park weather station, and he says to confirm the settlement station because JFK versus Central Park can differ by a couple of degrees. "these events uh settling on central park" [0:11:36]
- Data comes from Weather Next 3 via BigQuery and Earth Engine, with Google Cloud OAuth credentials and Kalshi API key plus private key stored in a .env and a text file. "weather next 3 data for this plus" [0:07:01]
- His standard backtest prompt asks for point-in-time data, separate forecast horizons, no leakage, and execution tested only on supported data; the run took about 40 minutes. "in time data evaluate separate forecast horizons" [0:11:48]
- Backtest result: the model scored about 13% better (64 versus 74, lower is better) than Kalshi prices at opening plus 1 minute, but he says there is not enough data to establish an edge. "is better of course 64 versus 74" [0:15:36]
- Bot logic: freeze the prediction 15 minutes before 16:01, check prices at open, require enough contract depth to avoid slippage, enter only when edge after fees and a buffer is at least 5 cents, one order attempt; example 65% probability at 50 cents with 2 cent fee and 1 cent buffer leaves 12 cents of edge. "fee 1 cent buffer leaves 12 cents" [0:23:37]
- A t-micro VPS costs about $16 per month, which must be counted with fees. "is around $16 per month" [0:32:46]

Architecture: Data: Weather Next 3 forecasts through Earth Engine and BigQuery; Kalshi market data and rules. Signal: bucket probabilities from the forecast, frozen 15 minutes before open. Model: forecast-derived probability per temperature bucket, compared with price. Execution: single order at 16:01 via Kalshi API, paper mode first then live, on an AWS T3 micro VPS in Ohio. Risk: minimum 5 cent edge after fees and a buffer, liquidity check, uncertainty stress test.

Worked:
- A manual test position at 56 cents moved to 63 cents, about 12% up on the trade. "63 cents and we are about 12%" [0:13:07]
- Forecast freeze test passed and live mode armed. "we have uh live mode is armed" [0:25:42]
- Credentials confirmed by fetching a $100 account balance. "fetch our balance yeah we have 100" [0:20:41]

Failed:
- The bot did not enter: it replaced the 67% estimate with 37% from a stress scenario assuming a one degree warmer forecast, which produced a negative stress-test edge. "replaced the 67 estimate with 37" [0:33:11]
- He entered manually at about 51 cents for $17 just to test, and states this does not show the model is correct. "we bought at like 51 for $17" [0:30:02]
- Context compaction interrupted the agent session. "think we actually ran into context compacting" [0:28:46]
- He says some of his bots lose money and he cuts those that stop performing. "right and some of them lose money" [0:33:46]
- Backtest sample too small to establish an edge. "we don't have enough data to establish an edge" [0:14:59]
