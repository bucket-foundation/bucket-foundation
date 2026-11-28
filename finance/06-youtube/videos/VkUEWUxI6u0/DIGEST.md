<!-- voice-ignore-file: transcript-derived digest -->
# 17. Options Markets | YaleCourses | VkUEWUxI6u0 | 1.20 h

Teaches: Robert Shiller's lecture on calls and puts: payoff at expiry, put-call parity, no-arbitrage binomial pricing, the Black-Scholes formula, implied volatility and the VIX, and why options matter for sharing risk. The market data shown is from 2011 and a 2002 newspaper page.

Claims:
- A call is the right to buy at the strike and a put is the right to sell; American options can be exercised any time, European only at expiry, and an early exercise of a call throws away option value, so sell instead. "because the american option can be exercised" [0:03:28]
- Ross (1976) argued options complete the state space. "stock price and this is why ross" [0:28:30]
- Put-call parity: stock = call - put + present value of the strike, plus present value of dividends; the AOL Time Warner example (strike $25, call $0.45, put $3.50, stock $21.85) held approximately. "00 plus $0 45 minus $3 50" [0:33:47]
- Binomial no-arbitrage derivation: write one call and buy H shares with H = (Cu - Cd) / ((u - d) S) to make a riskless portfolio, then C = [((1 + r - d)/(u - d)) Cu + ((u - 1 - r)/(u - d)) Cd] / (1 + r). "write one call and buy h shares" [0:43:01]
- The pricing formula contains no probability of going up or down; the price follows from the no-arbitrage condition alone. "it out of pure no arbitrage conditions" [0:50:54]
- Black-Scholes: call = S N(d1) - e^(-rT) E N(d2) with sigma as the standard deviation of price changes; it can be inverted numerically to give implied volatility. "of the standard deviation of the change" [0:55:38]
- Actual volatility from 1871 stays stable except for the Great Depression decade; the 2008 crisis had the second highest. "second highest volatility after the great depression" [1:06:11]

- Define call, put, strike and exercise date -> purposes of options (theoretical: complete markets. "if it's a call $25 00 strike" [0:21:13]

Worked:
- Implied volatility gives a forward-looking read that past standard deviation cannot, as in the 1987 spike. "went up because of the 1987 volatility" [1:01:39]
- Incentive options work through attention and salience; insurance acts like a put that buys peace of mind. "also give you peace of mind insurance" [0:15:27]

Failed:
- Black-Scholes assumes normal distributions and is "not a black swan theory", so it is unreliable under fat tails and sudden shocks. "swan theory it assumes normality of distributions" [1:08:50]
- Shiller's CME options on home prices (2006) never took off. "mercantile exchange we launched options in 2006" [1:09:58]
- The Obama Home Price Protection Program did not produce a put-option market. "obama proposed something called home price protection" [1:10:39]
- Put-call parity holds only approximately because of timing and transaction costs. "so because of the put call parity" [0:34:19]
