<!-- voice-ignore-file: transcript-derived digest -->
How To Actually Build a Trading Bot With Claude Code (Fully Automated) | AI Pathways | y_bsjZThP0o | 0.57 h

Teaches: A prompt-by-prompt build of a regime-based trading bot with Claude Code in VS Code: hidden Markov model regime detection, volatility-based allocation, walk-forward backtest, hardcoded circuit breakers, Alpaca paper trading and a Streamlit dashboard.

Claims:
- The system has five parts: HMM brain, allocation layer, safety net, broker (Alpaca, or IBKR at larger volume), dashboard. "we'll have the brain allocation safety brokerage" [0:03:44]
- Use the forward algorithm only instead of the library predict function to avoid look-ahead bias; a regime must persist 3 bars before acting and more than 4 flickers in 20 bars flags uncertainty and cuts size. "default predict function inside the hmm library" [0:14:47]
- Example allocation: low volatility means 95% invested at 1.25x leverage; medium volatility stays invested if trend intact (the speaker says to replace this with your own). "95% of your portfolio with 1 25x" [0:17:02]
- Risk layer: down 2% in a day halves size, down 3% closes all, down 5% in a week halves size, 10% drawdown from peak stops the bot and writes a block file to delete manually; 1% max risk per trade; correlation checks before new positions. "3% close everything if it's down 5%" [0:22:20]

Architecture:
- 5 minute bars in the main loop. "bar close default is 5 minute bars" [0:29:57]
- Signal: HMM regime classification with feature engineering, stability filter. "has a stability filter inside this engine" [0:15:30]
- Model: Gaussian HMM (regime classifier, not a price predictor). "as additional methods for predicting getting regimes" [0:15:18]
- Execution: Alpaca order executor and position tracker, startup sequence (config, broker check, market hours, HMM training, risk manager) then loop each bar. "initialize risk manager initialize position tracker start" [0:29:46]
- Risk: independent hardcoded circuit breakers with veto power; credentials in .env, git-ignored. "veto power over everything we'll have circuit" [0:22:10]
- Monitoring: Streamlit dashboard, alerts, logging. "tests pass all our monitoring and logging" [0:31:21]

Worked:
- Skeleton of 31 files across 8 directories built in about 5 minutes. "we have 31 files across eight directories" [0:12:41]
- Alpaca connection and a test NVDA market buy appeared in the paper dashboard (about 100,000 paper equity). "around 100 000 in paper equity market's" [0:28:49]
- Dashboard displayed a bear regime with 100% confidence at demo time. "in a bear regime with 100% confidence" [0:31:56]

Failed:
- No performance results shown; the speaker warns the strategy tuning will take the most iterations and says to paper trade at least a month. "monitor it for at least a month" [0:25:29]
