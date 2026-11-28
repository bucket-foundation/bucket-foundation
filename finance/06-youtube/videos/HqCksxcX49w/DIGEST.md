<!-- voice-ignore-file: transcript-derived digest -->
# Jeff Yan - High Frequency Crypto Market Making & the Hyperliquid Exchange (S6E2) | Flirting with Models | HqCksxcX49w | 1.21 h

Teaches: Jeff Yan (Chameleon Trading, later Hyperliquid) on crypto high frequency market making: making versus taking, fair price, data hygiene, toxic flow and spoofing, an unusual finding that his own HFT P&L predicts mid-frequency returns, and why he built an order-book perps exchange on its own L1.

Claims:
- Making is infrastructure heavy and taking is model heavy; a maker that is slow 1% of the time can lose the P&L from the other 99%. "the other 99 that's the fundamental infrastructure" [0:07:35]
- Fair price splits the problem into price prediction and order execution; using the most liquid venue (Binance) as fair is a good first approximation but breaks when an exchange suspends wallets and the arb cannot close. "fair is a really good first approximation" [0:15:04]
- Look at raw data constantly: one exchange flipped price and size fields, and timestamps should be studied to separate latency from garbage. "and flip the price and size fields" [0:11:11]
- Performance is a product of infrastructure times model, so work on the smallest factor and take the 80/20 route; he fell into the trap of fancy ML when basics still paid. "the lowest hanging fruit the 80 20" [0:19:39]
- Avoid the middle exchanges (ranks two to seven): competition and toxic flow match Binance with less retail padding; either trade Binance or pick a long-tail exchange with quirky infrastructure. "same level of competitiveness and toxic flow" [0:21:03]
- Bump and dump circles existed; he joined a few as a lurker and never participated. "bump and dump circles for fun" [0:28:56]
- His HFT P&L, maker or taker, was negatively correlated with returns over about an hour, with effects of tens of basis points; but the signal only said to short, funding rates priced it in, and the best symbols were hard to short. Use it by biasing inventory instead. "actually matter is negatively correlated with returns" [0:41:37]
- RFQ in DeFi is a free option because the requester does not have to wait for the price to move. "it's basically a free option" [0:48:15]
- Perps need funding payments every eight hours, which are hard to run as smart contract calls with 100,000 positions, so he built an L1 with order book and funding in consensus; target 100 ms to 300 ms latency and tens of thousands of orders per second. "an l1 let's say like 100 000" [0:57:35]

- Fair price oracle first, then execution around it; products of factors so fix the weakest; avoid the crowded middle; shut off patterns that lose; treat own flow P&L as a data source. "we lose money in a specific pattern" [0:31:15]

Worked:
- Small unpopular exchange infrastructure edge as a first live strategy. "a lot of how smaller centralized exchanges" [0:22:18]
- The RFQ exploit until makers reacted. "we were but the market makers react" [0:48:28]

Failed:
- His 2018 L2 prediction-market protocol, shut down after a few months for regulatory uncertainty and no users. "shut it down after a few months" [0:03:23]
- Spoofing losses before countermeasures. "a lot of these laws are country" [0:27:40]
- The negative-P&L signal as a stand-alone short: not compelling enough to build a strategy. "i think it was not compelling enough" [0:43:28]
- AMM liquidity pools, which he calls negative EV for retail providers over time. "just like this negative ev over time" [1:01:12]
