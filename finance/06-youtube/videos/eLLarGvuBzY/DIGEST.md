<!-- voice-ignore-file: transcript-derived digest -->
# Market microstructure - Orderbook fundamentals, spread/slippage, order types | AlgoTrade | eLLarGvuBzY | 0.96 h

Teaches: A crypto market maker explains fair price, order books, maker versus taker flow, order types and the spread, depth and slippage metrics, then what an HFT firm needs to win and an example of a failure.

Claims:
- A market maker earns money by buying below and selling above a fair price; on competitive markets fair price is close to the mid price, and the quant's job is to estimate it well on average. "buying below fur price and selling above" [0:04:57]
- Toxic flow (traders who know more, such as someone who sees an interest rate change before the quote updates) should be avoided, and random flow caught. "someone actively watches uh interest rate changes" [0:13:34]
- Makers on crypto exchanges often get negative fees (paid to quote). "even like negative fees so they're paid" [0:20:24]
- Weighted mid price carries a weak signal, too weak to trade after fees. "and uh this weighted mid price" [0:24:07]
- Tick size matters: with a large tick (for example half a percent) quoting at the best bid and ask is safer, with a small tick and uncertain fair price you risk adverse selection. "uncertain about your fair price you won't" [0:26:36]
- Slippage is the average fill price minus the first fill price; depth is the max fill price minus the min fill price. "slippage is u the average fill price" [0:30:46]
- Perpetual futures are more liquid than spot and capital efficient through leverage, and are used to hedge directional risk from spot inventory. "like this this futures markets and perpetual" [0:41:38]

Architecture: Market making stack as described: fair price model, quotes on the book, hedging with perpetuals, speed to update quotes across exchanges, management of exchange rate limits, alpha research for new signals [0:50:00]-[0:53:00].

Worked: none stated (no profit figures given).

Failed:
- Knight Capital: a wrong software version took both sides repeatedly and lost about $40 million in 35 minutes (the speaker said "40 million"). "money and in 35 minutes they lost" [0:48:11]
- Adverse selection when fair price is wrong or slow. "well well you will get adversely selected" [0:45:45]
- Running out of exchange rate limits blocks reaction to price moves. "those um those um those rate limits" [0:49:50]
