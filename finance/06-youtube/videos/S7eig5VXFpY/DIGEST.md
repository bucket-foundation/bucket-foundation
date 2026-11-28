<!-- voice-ignore-file: transcript-derived digest -->
# Where market making meets market microstructure | Sasha Stoikov | S7eig5VXFpY | 1.33 h

Teaches: Sasha Stoikov presents the Avellaneda-Stoikov market making model (reservation price tilted by inventory, spread premium around it), then shows a paper-trading test of it in Hummingbot on BTC that lost money, and microstructure ideas (imbalance, micro price, a volume adjusted mid price) as a better fair price.

Claims:
- A market maker quotes around a reservation price r = mid minus gamma-style factor times inventory, plus and minus a premium; the model assumes Brownian mid price and Poisson order arrivals with intensity decaying exponentially in distance from the mid. "the mid price and it's decays exponentially" [0:19:12]
- Many practitioners replace the time-to-end factor with a constant. "replace t minus t by a constant" [0:35:28]
- The model fits crypto better than stocks or futures because crypto tick sizes are tiny, leaving empty price levels to quote into; large-tick assets have large queues at each price. "futures or more liquid assets specifically because" [0:43:16]
- On large-tick assets, order book imbalance (bid size over bid plus ask size) is a persistent signal, with buy volume concentrated on the side with the least quoted size. "large tick sites uh assets is that" [1:01:34]
- The micro price adjusts the mid by an imbalance-dependent amount, and for multi-tick spreads the top-of-book imbalance loses meaning. "essentially the mid price plus an adjustment" [1:10:30]

Architecture: Quoting loop (Hummingbot with the Avellaneda-Stoikov strategy): trade size, risk aversion, order refresh every 10 seconds, inventory target 50/50 BTC/USD, volatility estimated in real time, spreads widen with volatility. Fills in paper trading assumed when trades cross the quote. Improvement tried: quote around a volume adjusted mid price (VAMP) built from book depth for a target dollar size, reported by Cornell students [1:12:00]-[1:16:00].

Worked:
- Inventory stayed within about plus or minus 5 trades of 0.1 BTC. "size in in bitcoin was 0 1" [0:49:07]
- VAMP-based quoting looked strong for the first half day versus mid-based quoting; students showed VAMP minus mid predicted direction at 1 to 60 second horizons. "scales ranging from one second to 60" [1:15:18]

Failed:
- The VAMP strategy suffered a catastrophic plunge three or four hours into the full day. "you know there was a catastrophic plunge" [1:16:56]
- Spreads that widen with volatility may react too late; he describes this business as picking pennies in front of a tractor. "picking pennies in front of a tractor" [1:18:52]
- Crypto exchanges generally give no maker rebates, unlike stocks. "pay for for trading these cryptocurrency exchanges" [0:52:13]
