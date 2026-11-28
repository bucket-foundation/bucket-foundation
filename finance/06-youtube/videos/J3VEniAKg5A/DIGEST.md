<!-- voice-ignore-file -->
# Build a Python Trading Bot for Algorithmic Trading Using AI | Full Tutorial | Ryan O'Connell, CFA, FRM | J3VEniAKg5A | 0.64 h

Teaches: A prompt-driven build of an Interactive Brokers paper-trading bot with an AI coding assistant: connection test, buy and sell of one SPY share, 300 days of history, a 20/50 moving average crossover, then a 20/50 second version on live Polygon data. The sponsor promotes a cloud IDE.

Claims and warnings. Figures and results are self-reported by the speakers and unverified.

- Paper trading is a simulated portfolio, so no real money is at risk while implementing a strategy. "you're not risking your own real money" [0:02:22]
- The IBKR socket port must be 7497 for paper trading. "socket port right here is 7497 which is uh what we'll use for paper trading" [0:06:39]
- The first test buys one SPY share and moves the paper account from 92 to 93 shares, then sells one to return to 92. "we should be up to 93 shares of spy" [0:11:39]
- Interactive Brokers gives 300 days of daily SPY history as free data, which he says is less useful than paid data. "300 days of daily price history for spy from interactive brokers" [0:13:53]
- The daily strategy buys when the 20-day moving average crosses above the 50-day and sells when it falls below. "when the 20 day becomes larger than the 50 day that's a buy signal" [0:15:47]
- The crossover chart shows buy and sell triangles and a small profit on the first round trip, with no formal results reported. "you would have captured i don't know a small amount of profit at that point" [0:17:12]
- The AI chose to run the live system for 600 seconds, or 10 minutes, on its own. "it's just going to run this system for 600 seconds" [0:19:37]
- Live Polygon data costs about $200 a month, which he pays for. "like $200 a month" [0:21:34]
- The live version applies the same crossover on 20-second and 50-second moving averages to capture very short-term moves. "instead of doing it in days" [0:26:03]
- Warning: the speaker says he has not backtested the strategies. "i have not back uh back tested these strategies" [0:26:30]
- Risk limits set in the prompt: one share per trade, at most 10 positions, and a 10 second cooldown between trades. "a cool down period of 10 seconds between trades" [0:30:27]
- In the run the bot sold on consecutive signals, taking the paper position from 92 to 91 to 90. "it went from 92 down to 91" [0:34:22]
- Warning: at about a dollar lost per quick trade on a $559 stock, he says this fast strategy is guaranteed to lose money at small size. "this would be basically guaranteed to lose money" [0:35:47]
