<!-- voice-ignore-file: transcript-derived digest -->
Lecture 3, part 2: Glosten-Milgrom Model (Financial Markets Microstructure) | economification | W58yBI7owRs | 1.16 h

Teaches: The Glosten-Milgrom sequential trade model: how a competitive, risk neutral dealer facing a mix of informed speculators and noise traders sets bid and ask prices, and why adverse selection creates a spread.

Claims:
- Each period a dealer trades one unit with a trader who is a speculator (probability pi, knows fundamental value v) or a noise trader (1 minus pi, buys with probability beta_b, sells with beta_s). "traders are noise traders now each trader" [0:03:31]
- Competition drives dealer profit to zero, so the ask equals expected v given a buy order and the bid equals expected v given a sell order; ask is above the prior expectation and bid below, so the spread is positive. "getting some positive profit with their expected" [0:09:55]
- Speculators buy when v exceeds the ask, sell when v is below the bid, and do nothing inside the spread. "is inside the spread then the speculator" [0:25:56]
- Prices are semi-strong efficient because dealers are competitive; monopolistic dealers would push prices away from fair value. "dealers imperfectly competitive say oligopoly or monopoly" [0:43:14]
- In the binary value example, the spread rises with pi (informed share), falls with the noise trade probabilities, and rises with prior uncertainty theta(1-theta) and with the gap between high and low value. "spread is increasing in theta times 1" [0:56:54]
- With persistent v, prices converge to v over many trades; more informed traders speed discovery but hurt liquidity, a regulatory trade-off such as insider trading rules. "trade off between price discovery and liquidity" [1:01:02]

Architecture: none (theoretical model; Bayes updating of dealer expectation after each order).

Worked:
- Simulation of 100 orders shows price paths converging to the true value vH. "represents our few simulations of 100 orders" [1:02:17]
- Nasdaq and Nasdaq Helsinki rules (continuous two sided quotes, spread at most 4% 85% of the time) are cited as support for the dealer assumption. "at least 85 percent of the time" [0:12:58]

Failed:
- Model drawbacks: centralized competitive dealer, no market clearing, no speculation or resale motive. "dealer model so we have a centralized" [1:03:43]
- Quotes the "all models are wrong" caveat from George Box. "by george box saying that all models" [0:00:36]
