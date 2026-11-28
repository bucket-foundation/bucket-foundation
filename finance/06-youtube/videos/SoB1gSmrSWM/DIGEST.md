<!-- voice-ignore-file: transcript-derived digest -->
# Ciamac Moallemi (Columbia): "Liquidity Provision and Automated Market Making" | Cornell Financial Engineering Manhattan CFEM | SoB1gSmrSWM | 1.27 h

Teaches: An academic seminar on constant-product automated market makers: why order books fail for long-tail tokens, how an AMM prices from reserves, a closed-form cost of adverse selection (a "Black-Scholes for AMMs"), and an empirical test against Binance prices on a large Uniswap pool. Some terms in the transcript are garbled by captioning, such as "lever" for the loss-versus-rebalancing term.

- Treat the AMM pool as a trading strategy and compare it with a rebalancing strategy that trades the same quantities on a central exchange; the gap is the cost paid to arbitrageurs, and it scales with variance. "going to trade on the centralized exchange" [0:46:16]

Claims:
- Limit order books need constant updating and market makers, so a token created in five minutes will not get quotes. "5 minutes create your own new token" [0:07:03]
- An AMM prices off pool reserves, inspired by earlier prediction market work, and needs only passive liquidity providers earning fees. "inspired by early work in the prediction" [0:08:18]
- The cost to LPs is adverse selection, paid to arbitrageurs when the pool price lags the market. "spend 39k on this adverse selection cost" [0:14:45]
- A constant product pool keeps X times Y constant; the pool's value is 2L times root P, with equal dollar value in each asset. "we need something called the pool value" [0:39:24]
- The instantaneous cost is sigma squared over eight times pool value, which he calls the Black-Scholes formula for AMMs. "like a spot price or an instantaneous" [0:33:38]
- His live example is a pool worth about $124 million that generated about $65,000 in fees, with $66,000 in the last 24 hours as the basis for a return estimate. "$65 000 in fees have been generated" [0:13:17]
- Empirically, a pool of roughly $200 million swung from up $80 million to down $40 million unhedged, while the Binance-hedged P&L oscillated around zero and matched the formula. "point the pool was up 80 million" [1:02:14]
- Hedged returns are not guaranteed profits because of trading and financing costs, and perpetual futures carry funding costs for the short. "perpetual futures so there's futures instruments which" [1:09:00]
- For the long tail with no exchange market, the hedge assumption fails. "exchange right so for the long tail" [0:57:15]

Worked:
- The closed-form formula tracked realised hedged P&L on the sample pool. "able to use that closed form formula" [1:03:07]
- Variance swaps are a way to price the cost. "um uh so on variance swaps are" [1:00:12]

Failed:
- The model assumes continuous time and ignores reinvested fees and block discreteness. "the the blockchain is discrete time continuous" [0:39:11]
