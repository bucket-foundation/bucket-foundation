<!-- voice-ignore-file: transcript-derived digest -->
# I Built an INSANELY Profitable AI Trading Bot (Full Guide) | Trading with DaviddTech | 86AlV6174KI | 0.56 h

Teaches: A workflow for generating, backtesting, optimizing and incubating TradingView strategies with Claude Code connected to the TradingKit (Trader Dev) MCP backtester, then routing alerts to Telegram or a broker through trigger.trade. Includes the speaker's rules from five years of algo trading and promotes his own tools.

Claims:
- Speaker says he backtested over 2,000 strategies, incubated them, and only about 400 still look profitable; he currently trades 7 (unverified, self-reported). "back tested over 2 000 strategies" [0:00:18]
- His strategy template follows the NNFX model: a trend indicator, two non-correlated confluence indicators, a volume or volatility filter, ATR band stop loss and a risk-reward take profit. "you're looking for two non correlated indicators" [0:12:55]
- A boilerplate wrapper adds risk management (max drawdown stop, leverage, position sizing, day-of-week off) to every strategy. "we can set leverage and position sizing" [0:14:23]
- Optimization runs server-side on TradingKit with walk-forward testing, so it does not burn LLM tokens. "some amazing features like walk forward testing" [0:18:47]
- Incubation: hold each strategy aside for a couple of months on live data before trading it; the speaker says 99% of backtests fail in real markets. "it aside for a couple of months" [0:19:34]
- Diversify across non-correlated strategies and one bot per coin pair; avoid multi-timeframe strategies because they repaint or look ahead; always include fees and slippage; read profit factor and drawdown over win rate. "multi timeframe strategies these strategies generally repaint" [0:29:26]

Architecture:
- Data/backtest: TradingKit MCP in Claude Code, Pine Script output for TradingView. "us pine script pinescript is the code" [0:07:35]
- Signal: trend following plus two confluences plus volume or volatility filter; also mean reversion strategies. "especially when you're trading trend following strategies" [0:13:16]
- Model: Claude writes the code; optimizer plus walk-forward validation. "has some amazing features like walk forward" [0:18:47]
- Execution: TradingView alerts (fills only) to trigger.trade, then Telegram or exchange/broker. "alertatron to inbanked into your actual exchanges" [0:22:11]
- Risk: boilerplate max drawdown, leverage, position sizing, ATR stop, small live test account first. "means it's going to optimize on small" [0:18:51]

Worked:
- Example incubated strategy shown with 2,200% net profit, 26% max drawdown, 52% win rate, live since September 2025 (unverified, shown by speaker). "have 2 200% net profit a max" [0:23:03]
- First test backtest produced net profit of -19% on a deliberately simple strategy, showing the pipeline connects. "tested strategy the net profit was 19%" [0:08:21]

Failed:
- Many strategies fall apart in incubation. "lot of them start to fall apart" [0:21:32]
- Example strategy first shown had 35% P&L that might lose to buy and hold, and weak drawdown, so it needed optimization. "strategy had a p l of 35%" [0:16:36]
- Multi-timeframe strategies fail live, entries disappear. "you'll see the entries they'll just disappear" [0:29:53]
- Fees (0.05% per trade) and slippage erode edge. "small a fee will look 0 05%" [0:30:10]
