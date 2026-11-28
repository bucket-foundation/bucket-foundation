# Stochastic Processes

Brownian motion, geometric Brownian motion, Ornstein-Uhlenbeck and jump diffusions are the price models behind derivative pricing and many trading rules. Ito calculus turns them into PDEs; change of measure gives risk-neutral prices.

## Papers

- Bachelier 1900, Theorie de la speculation. First Brownian price model.
- Uhlenbeck and Ornstein 1930, On the Theory of the Brownian Motion, Physical Review 36. doi:10.1103/physrev.36.823. The OU process, base model for mean reversion.
- Black and Scholes 1973, The Pricing of Options and Corporate Liabilities, JPE. doi:10.1086/260062
- Shreve, Stochastic Calculus for Finance II (Springer). Standard graduate text.

## In The Video Corpus

- ZwS1gMGegrM @ 0:02:00 Bachelier to Carr-Madan
- UD92QBqA8Eo @ 0:09:00 OU-optimal entry and exit levels
- S7eig5VXFpY @ 0:15:00 Brownian mid and Poisson fills in market making

## Open Question

Gaussian increments understate tails: Laplace fits S&P daily returns better (zapp8smQKhg @ 1:03:00).

## Derivation

### Ito's Lemma

Assumptions: \(X_t\) solves \(dX_t = \mu(t,X_t)\,dt + \sigma(t,X_t)\,dW_t\) with \(W\) a standard Brownian motion; \(f(t,x)\) is \(C^{1,2}\).

1. Taylor-expand \(f\) to second order in \(x\) and first order in \(t\):
\[ df = f_t\,dt + f_x\,dX + \tfrac12 f_{xx}\,(dX)^2 + \tfrac12 f_{tt}(dt)^2 + f_{tx}\,dt\,dX + \dots \]
2. Square the increment: \((dX)^2 = \mu^2 dt^2 + 2\mu\sigma\,dt\,dW + \sigma^2 (dW)^2\).
3. Quadratic variation of Brownian motion over \([0,t]\) is \(t\), so in the mean-square limit \((dW)^2 = dt\), while \(dt\,dW\) and \(dt^2\) vanish faster than \(dt\).
4. Keep terms of order \(dt\): \((dX)^2 = \sigma^2 dt\), and the \(f_{tt}\) and \(f_{tx}\) terms drop.
5. Substitute \(dX\):
\[ \boxed{\,df(t,X_t) = \Big(f_t + \mu f_x + \tfrac12 \sigma^2 f_{xx}\Big)dt + \sigma f_x\, dW_t\,} \]

Check on geometric Brownian motion \(dS = \mu S\,dt + \sigma S\,dW\) with \(f = \ln S\): \(f_x = 1/S\), \(f_{xx} = -1/S^2\), so \(d\ln S = (\mu - \tfrac12\sigma^2)dt + \sigma\,dW\) and \(S_t = S_0 \exp\big((\mu-\tfrac12\sigma^2)t + \sigma W_t\big)\).

Sources: Ito, Stochastic integral, Proc. Imperial Academy 20(8):519-524, 1944, doi:10.3792/pia/1195572786. Ito, On a Formula Concerning Stochastic Differentials, Nagoya Math. J. 3:55-65, 1951, doi:10.1017/S0027763000012216. Both Crossref records fetched 2026-11-27.
