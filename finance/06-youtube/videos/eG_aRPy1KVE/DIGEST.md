<!-- voice-ignore-file: transcript-derived digest -->
# 20. Option Price and Probability Duality | MIT OpenCourseWare | eG_aRPy1KVE | 1.34 h

Teaches: A guest lecture by Stephen Blyth (Harvard Management) on option-probability duality: call prices determine the risk-neutral density and the density determines every European payoff price, with call spreads, butterflies and replication by calls.

Claims:
- A call spread of lambda long calls at strike K and lambda short calls at K+1/lambda tends in the limit to a digital; the digital price equals minus the derivative of call price in strike. "digital must equal just the partial derivative" [0:22:04]
- Fundamental theorem of asset pricing assumed: the price divided by the zero coupon bond is a martingale; prices are discounted expected payouts under the risk-neutral measure. "little t divided by zero coupon bond" [0:25:41]
- CDF of S_T is 1 plus (1/Z) dC/dK and the density is the second derivative of the call price in strike. "equal to 1 plus dc by dk" [0:28:22]
- A call butterfly (lambda calls at K-1/lambda, minus 2 lambda at K, lambda at K+1/lambda) approximates the second derivative; rates butterflies 10 basis points wide trade. "butterfly or equivalent 10 basis points wide" [0:33:31]
- Knowing calls at all strikes and maturities does not fix the stochastic process; Derman and Dupire showed a diffusion assumption fixes it. "strikes can i determine the stochastic process" [1:12:27]
- Calls span all European payoffs; for a piecewise linear payoff the replicating call portfolio follows the slope changes. "if the piecewise linear g replicating portfolio" [0:57:55]

- Define call, bond and digital payoffs; call spread limit gives digital; no-arbitrage pricing gives CDF and density; butterfly as tradable density; limits of what calls determine. "comes in with this call payout gives" [1:16:54]

Worked:
- These relations hold with no model for the option price; inserting Black-Scholes gives a log-normal density. "model for the option price to hold" [0:39:20]
- Digitals and Arrow-Debreu securities are alternative spanning sets. "same and in fact arrow debreu securities" [1:17:07]

Failed:
- Real strikes cannot shrink to zero width, so the density is only approximated. "real world you cannot really the strike" [0:33:04]
- The no-arbitrage equality of option and replicating portfolio has broken down since 2008, and the gap can grow for long maturities. "been interesting in finance especially since 2008" [0:59:44]
- Some exotic payoffs are not pinned down by any finite set of calls because the process is not determined. "determined by that set of calls because" [1:15:18]
