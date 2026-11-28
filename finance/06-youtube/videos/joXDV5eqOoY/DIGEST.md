<!-- voice-ignore-file: transcript-derived digest -->
# QuantConnect LEAN Algorithmic Trading Engine - Getting Started | Part Time Larry | joXDV5eqOoY | 0.77 h

Teaches: Setup of the open source LEAN engine and CLI (Docker, lean init, lean backtest, lean cloud push and backtest), then a test of a published "buy the close, sell the open" SPY strategy to see whether the article's results hold.

Claims:
- LEAN is the open source engine behind QuantConnect. "if i open my quant connect lean" [0:05:21]
- Full historical US equity data is free only in the cloud. "it has data for 27 500 equities" [0:17:47]
- The article claimed overnight holding of SPY beat buy and hold (610% versus 560%, max drawdown about -20% versus -50%, 1993 to 2020). "is back tested from 1993 through 2020" [0:08:54]
- His LEAN test with the Interactive Brokers fee model returned only about 22% with about $50,000 in fees for a 1,000 share version; the percent-of-portfolio version doubled the money with about $450,000 in fees. "into account the interactive brokers fee model" [0:35:47]

Architecture: Not a trading system. Tooling: lean CLI, Docker image, local data folder in LEAN zip format, QCAlgorithm class with Initialize and OnData, brokerage model, fee model, scheduled events, market-on-close and market-on-open orders, cloud backtest nodes.

Worked:
- Cloud backtest of buy and hold returned 622%. "you see my net profit of 622" [0:21:00]

Failed:
- The overnight strategy underperformed buy and hold once fees were modeled. "into account the interactive brokers fee model" [0:35:47]
- The free plan stopped at 10,000 orders and runs on a slower node with a 20 second delay. "maximum number of orders at 10 000" [0:34:19]
- Local backtest over 20 years used sample data only and gave near-zero returns. "we don't have 20 years of data" [0:17:35]
