<!-- voice-ignore-file: transcript-derived digest -->
# How To Actually Build an AI Trading Bot With Claude (3 Hour Course) | AI Pathways | gJLKVsIqiTE | 3.13 h

Teaches: A prompt-by-prompt course (the "Alpha" framework: architecture, logic, proof, harness, adapt) for having Claude build a daily-bar ETF trading system: a QQQ/gold core plus short-term sleeves, a tested backtester, an Alpaca paper-trading bot, risk limits, alerts and review routines. The creator sells prompts and one-on-one work, so the framing is promotional.

Claims:
- A bot is one rule sending orders; a system adds data checks, tests, a risk layer that can block orders, alerts and weekly review. "data coming in here the tests check" [0:06:33]
- Claude is run in the desktop app on a local folder with house rules in CLAUDE.md, API keys typed by hand into a .env file that Claude never reads. "that claude will never touch this file" [0:11:20]
- Daily bars are chosen because data is free (Yahoo via yfinance) and costs are small; his cost assumption is 0.05% each way, and a rule trading every day pays about 25% of profits in costs. "we're counting it as around 0 05%" [0:37:05]
- Testing uses training years 2022 to 2024 and a locked test from 2025 on, run once; seven minimum checks include cost, next-open fills, trade count and neighbor settings that must also work. "to 2024 and then everything from 2025" [1:13:44]
- The backtester is itself tested with fake prices: a planted 1% edge should show 0.6 to 1.2% per trade, pure noise should show about zero, and a look-ahead guard must stop a cheating signal; reported 0.8% per trade after 0.1% cost. "of our 0 6 to 1 2%" [1:19:21]
- The core holds QQQ above its 200-day average and gold below it; reported locked-test result is 24.8% a year with an 11.2% max drawdown. "did qqq with the rsi 2 below" [1:22:11]
- Sleeve funnel: 44 ideas, 25 fit the asset, 20 profitable after costs, 18 with enough trades, 14 with profit factor above 1.3, 11 with profitable neighbors, 7 passed the lock test. "factor above 1 3 11 had profitable" [1:32:37]
- The AI layer reads Fed statements and may only adjust the core, because AI cannot react at intraday speed; dated-call tests have look-ahead risk, so hidden-date replays are less trustworthy. "for example if claude reads a statement" [0:33:29]

Architecture: Data: daily adjusted bars from Yahoo (free); intraday needs paid feeds (Alpaca, Massive, Databento at roughly $29 to $199 a month). Signal: regime classifier (above or below 200-day average, calm or volatile via VIX), core rotation QQQ/gold, sleeves (RSI-2 dip buy above the 200-day, 50-day breakout), 7-part rules. Model: rule-based plus optional Claude reading FOMC statements. Execution: Python bot on the user's computer, scheduler every 30 minutes, runs after 7:00 pm New York time, queues market-on-open orders to Alpaca paper account, morning stops placed at the broker. Risk: reconcile with broker, lock file, idempotent order IDs, 3% daily loss stops new sleeve trades, 5% bad day creates a pause file, borrowing stop, kill line at twice a sleeve's tested drawdown, Telegram alerts, weekly Claude review, quarterly re-pick of sleeves.

Worked:
- These are backtest results, unverified. "account so this includes the core plus" [1:38:15]
- Backtester validation checks and 17 bot tests passed; a first order for about 141 shares of QQQ was queued on paper. "we set fake prices with three checks" [1:18:29]

Failed:
- The full account's worst drop was about 30% in 2022, larger than the market in that year. "the account's worst drop was about 30%" [1:42:54]
- The AI layer cannot be backtested cleanly; the speaker says to trust it less. "ai layer is that you can't backtest" [1:51:21]
- A screener on today's S&P 500 list carries survivorship bias. "from 2022 using today's s p 500" [2:57:39]
- Alpaca rejects orders sent between 9:28 am and 7:00 pm New York time-. Intraday needs a server and more safety checks. "9 28 in the morning and 7" [1:57:48]
