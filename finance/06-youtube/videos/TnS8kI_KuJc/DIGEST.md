<!-- voice-ignore-file: transcript-derived digest -->
# 19. Black-Scholes Formula, Risk-neutral Valuation | MIT OpenCourseWare | TnS8kI_KuJc | 0.83 h

Teaches: A lecture by Vasily Strela on risk-neutral pricing: a bookie example, forward pricing by replication, one-step binomial replication, the Black-Scholes PDE from Ito's lemma, put-call parity and digital pricing by call spreads.

Claims:
- Forward price by replication: borrow S0, buy the stock, short the forward; forward strike equals S0 e^(r dt); $80 stock, 5 percent, two years gives 88.41. "is $80 our strike is 88 41" [0:17:15]
- The price is then a discounted expectation under a risk-neutral probability q unrelated to real-world odds. "like this is called a risk neutral" [0:22:10]
- Only volatility enters. "world we'll need some assumptions on the" [0:22:40]
- Black-Scholes reduces to the heat equation; boundary conditions are 0 at S=0 and discounted S minus K for a call at infinity. "price should be 0 and at infinity" [0:32:12]
- Price equals the discounted expected payout under the measure where the stock drifts at the interest rate. "drift of our stock is actually interest" [0:34:21]
- Digital priced by a call spread: (C(K-eps) - C(K+eps)) / (2 eps), which is the strike derivative of the call. "call price but with respect to strike" [0:48:18]

- Intuition from the bookie; discrete replication; closed form and risk-neutral expectation; static replication examples (parity, digital). "it's a simple replicating portfolio it's static" [0:43:00]

Worked:
- Traders hedge dynamically and keep a small, specific market risk while collecting a fee. "so we will just collect a fee" [0:29:52]
- Static replication with liquid calls prices and hedges digitals, which trade less. "price and hedge most importantly the digital" [0:47:43]

Failed:
- Implied volatility varies with strike, a smile, so the constant volatility assumption fails. "were to i didn't put implied volatilities" [0:38:07]
- Hedges must be rebalanced every dt. "time dt we will have to rebalance" [0:29:12]
- Complicated, American or path-dependent payoffs need finite differences, trees or Monte Carlo. "or american pay offs or path dependent" [0:35:43]
