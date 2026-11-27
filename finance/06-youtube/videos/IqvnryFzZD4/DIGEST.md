<!-- voice-ignore-file: transcript-derived digest -->
# I Built an AI Trading System With Claude + TradingView | Humbled Trader | IqvnryFzZD4 | 0.52 h

Teaches: A day trader with no coding background shows how to connect Claude Code to TradingView through an MCP server, build a pre-market gap scanner and a strategy scanner, backtest it in Pine Script and Python, schedule both scanners and push results to Telegram. The creator promotes a blog with the prompts, a referral link, a newsletter and a conference, so the framing is promotional.

Claims:
- The setup needs a TradingView subscription at the essential plan, about $13 to $15 a month. "about $13 to $15 a month" [0:03:50]
- Scanner criteria: stocks that gap up more than 5% from the previous day, price above $3 and over 50k pre-market volume. "gap up more than 5% from previous day price above $3 per share" [0:08:06]
- Strategy "trend join long": after 10:00, price above yesterday's high, yesterday's close above the 200-day average, above the pre-market high and above the high of day. "run after 10 00 a m market" [0:11:10]
- A Pine Script backtest on one ticker shows a profit factor of 2.48, which he caveats as limited (self-reported). "profit factor is 2 48 that's really good" [0:13:37]
- Magnificent Seven on 15-minute bars gave fewer trades and Tesla had none; he says criteria are strict. "testing on the i think 15 minute" [0:15:18]
- Python backtest on 32 watchlist tickers over 30 days with a $10,000 account showed a 54 percent win rate; unverified. "with $10 000 account 54% win rate" [0:17:41]
- Automation: scanner A every 30 minutes from 8:30 to 2:00 (12 runs), scanner B five minutes later from 10:00; results go to Telegram via a BotFather bot. "run every 30 minutes so 12 runs" [0:20:18]
- TradingView's own AI beta can backtest more but cannot schedule or send Telegram messages; its first batch looked worse than buy and hold. "to see if this trading view ai" [0:29:08]
- He says AI will not make you profitable; trading experience comes first, and he has begun trading the strategy via Interactive Brokers, with no results shown. "need real trading experience first then ai" [0:00:34]

Architecture: Data: Yahoo Finance quotes and Benzinga news, TradingView chart data through MCP. Signal: gap scan then rule-based breakout filter. Model: none, only rules written by the trader. Execution: alerts to Telegram; trades placed by hand (an Interactive Brokers bot is teased). Risk: not covered beyond a $10,000 test account.

Worked:
- Claude building scanners and backtests from plain prompts in minutes. "building the scanner in about two minutes" [0:12:07]
- Python backtesting across more tickers than Pine Script allows. "tested the strategy with a pine script" [0:18:52]

Failed:
- He hit a setup problem and suggests asking the AI to solve it. "just ask your ai to solve it for you" [0:03:17]
- TradingView's Remix AI backtest and scheduling did not work. "can solve that within trading view remix" [0:29:58]
- The 15-minute test produced few trades. "15 minute time frame you are producing" [0:15:20]
