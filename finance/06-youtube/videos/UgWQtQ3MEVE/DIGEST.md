<!-- voice-ignore-file: transcript-derived digest -->
Claude + IBKR API: Complete AI Trading Bot Guide | Humbled Trader | UgWQtQ3MEVE | 0.39 h

Teaches: How to connect Claude Code to the Interactive Brokers TWS API (paper account) and build a bot that scans gappers, applies a rules file, places orders on a 30 minute cycle, and sends Telegram alerts. Presents the build as step-by-step prompts copied from the author's blog.

Claims:
- Claude can build the Python connection, report positions and buying power, and place a test limit order (1 share NVDA at $100) that the speaker then cancelled. "nvidia with a limit price of $100" [0:09:46]
- The Trend Join Long strategy is encoded in rules.json: long only, 5 minute chart, price above prior day high, prior close above the 200 day, initial stop 1% below low of day, partial at 0.75R, break-even at 1R, trail under 5 minute swing lows, 1% account risk per trade, 10% max position size. "1% account size per trade maximum 10%" [0:12:51]
- The pre-filter screened 503 S&P 500 tickers in 14 seconds and returned the top 20 that gapped up more than 3%. "20 stocks um that have gapped up" [0:17:39]
- Prior TradingView backtest of the strategy: 64% win rate, profit factor 2.48, max drawdown 7%, total P&L 12% (unverified, from an earlier video). "is 2 48 and the max drawdown" [0:11:11]
- TWS paper trading uses socket port 7497, which the speaker identifies as the paper port. "labeled as 7497 this is the paper port" [0:03:43]

Architecture:
- Data: S&P 500 ticker list (503), IBKR market data via TWS API. "503 tickers from the s p 500" [0:17:34]
- Signal: morning pre-filter (top 20 gappers above 3%) then rules.json entry filters on a 30 minute cycle with a watchlist file. "the pre filtered stocks every 30 minutes" [0:17:56]
- Execution: Python bot over IBKR TWS API on a paper account; partials, break-even, trailing stops, force close before market close. "partials trails the winners and force closes" [0:01:24]
- Monitoring: Telegram alerts and an R multiple dashboard. "dashboard music that tracks the r multiples" [0:00:53]

Worked:
- API connection, position and buying power query, and test order placement worked. "and also give me my buying power" [0:08:49]
- Pre-filter test returned 20 stocks and Telegram sample messages arrived. "see the top 20 list of stocks" [0:21:06]

Failed:
- Live API results were "very meh" compared with the TradingView backtest; the speaker says her manual trading still beats the bots. "backtested numbers don't perfectly translate to live" [0:22:30]
- Causes she names: backtest limited in timeframe, and she has not yet encoded her manual execution as code. "translate all the executions i do manually" [0:22:12]
- Warns that a bot without a strategy edge only loses money faster. "two building the interactive brokers api bot" [0:10:52]
- Paper account starts with 1 million; she advises resetting to about 10,000. "1% account size per trade maximum 10%" [0:12:51]
- Sponsored by BetaPro ETFs (promotional segment on leveraged ETFs). "that sector betapro offers a 3x leveraged" [0:07:32]
