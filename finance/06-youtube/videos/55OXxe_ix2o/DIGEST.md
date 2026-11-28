<!-- voice-ignore-file: transcript-derived digest -->
# 23. Quanto Credit Hedging | MIT OpenCourseWare | 55OXxe_ix2o | 1.63 h

Teaches: A guest lecture by Stefan Andreev (Morgan Stanley) on credit and FX hybrid models: FX forward parity, why the same borrower's bonds in two currencies carry different spreads, and a jump-to-default FX model with zero interest rates that gives hedge ratios between dollar and euro bonds.

Claims:
- FX forward interest rate parity: invest $5 million at the dollar rate or convert, invest at the euro rate and convert back; no arbitrage ties the forward to spot and the rate gap. "example $5 million and i can invest" [0:06:19]
- In the Black-Scholes FX model the drift is the interest rate differential. "to as the black scholes fx model" [0:12:51]
- Game: a bet on dollar/euro above 1 paid in dollars versus paid in euros; at 1.25 or 0.75 the dollar-paid bet is $25 better either way, because the unit's value moves with the outcome. "case if dollar euro is 0 75" [0:19:04]
- Market fact quoted: Italy's dollar bond spreads are lower than its euro bond spreads. "dollar versus euro spreads from the marketplace" [0:26:03]
- Default time is Poisson with hazard rate h, survival probability e^(-hT); FX jumps by e^J on default. "simple assumption let's say constant hazard rate" [0:36:08]
- The compensator drift h(1-e^J) before default keeps E[S_T] = S_0; the lecture verifies it by integrating over the default density. "less than t so default happened before" [0:45:38]
- Zero-recovery bond prices: dollar bond e^(-hT), euro bond in dollars e^(-hT) e^J; the hedge ratio depends on h and J and must be rebalanced. "later what happens to our bond prices" [1:03:27]
- Answer to the Italy question: buy bonds in the currency that appreciates if no default occurs, since payment arrives only without default. "does not happen the currency would appreciate" [1:31:17]


Worked:
- Hazard rates are backed out of benchmark bond prices to form a curve for pricing other instruments. "benchmark bonds which i know the price" [1:35:23]

Failed:
- A naive bond-plus-forward arbitrage fails because after default the forward remains exposed to FX. "000 you just have an fx forward" [0:31:40]
- Argentina 2001: the peso fell sharply on default, a naked forward lost heavily. "argentina 2001 and when it defaulted the" [0:32:33]
- Recovery cannot be fitted with default probability from one price, so conventions are used: 25 percent for sovereigns, 40 percent for corporates; Greece paid about 15 cents. "25% and for corporates we use 40%" [1:33:00]
