# Option Pricing

ID: `Q-options`
As of: 2026-11-27
Bead: `bkt-q5moa.1`

## What It Is

Black, Scholes and Merton priced a European option by building a riskless hedge from the stock and a bond. Price depends on spot, strike, time, rate and volatility. Markets quote implied volatility; its pattern across strikes and maturities is the volatility surface.

## Key Numbers and Dates

- Black and Scholes, The Pricing of Options and Corporate Liabilities, JPE 81(3):637-654, May 1973. **A**
- Merton, Theory of Rational Option Pricing, Bell Journal 4(1):141, 1973. **A**
- 1997 Nobel in economics: Merton and Scholes. Black died in 1995. **A**

## Sources

1. Crossref record, Black-Scholes 1973. https://api.crossref.org/works/10.1086/260062 (fetched 2026-11-27)
2. Crossref record, Merton 1973. https://api.crossref.org/works/10.2307/3003143 (fetched 2026-11-27)
3. Nobel Prize, economic sciences 1997. https://www.nobelprize.org/prizes/economic-sciences/1997/summary/ (fetched 2026-11-27)

Grades: A primary data or statute, B reputable secondary, C single source or memory pending check.

## Derivation

### Black-Scholes PDE

Assumptions: the stock follows \(dS = \mu S\,dt + \sigma S\,dW\) with constant \(\mu, \sigma\); a riskless rate \(r\) is constant; trading is continuous, frictionless, with short sales and fractional shares; no dividends; no arbitrage. The option value is \(V(t,S)\), a \(C^{1,2}\) function.

1. Ito's lemma (card `02-stochastic-processes`):
\[ dV = \Big(V_t + \mu S V_S + \tfrac12\sigma^2 S^2 V_{SS}\Big)dt + \sigma S V_S\,dW \]
2. Hold the option and short \(\Delta\) shares: \(\Pi = V - \Delta S\), self-financing, so \(d\Pi = dV - \Delta\,dS\).
3. Choose \(\Delta = V_S\). The \(dW\) terms cancel, and the \(\mu\) terms cancel with them:
\[ d\Pi = \Big(V_t + \tfrac12\sigma^2 S^2 V_{SS}\Big)dt \]
4. \(\Pi\) is riskless over \(dt\). No arbitrage forces it to earn \(r\): \(d\Pi = r\Pi\,dt = r(V - S V_S)dt\).
5. Equate the two expressions for \(d\Pi\):
\[ \boxed{\,V_t + \tfrac12\sigma^2 S^2 V_{SS} + r S V_S - r V = 0\,} \]
6. For a European call, the terminal condition is \(V(T,S) = \max(S-K,0)\). Substitute \(x = \ln S\), \(\tau = T - t\), and remove the drift and discount terms to reach the heat equation \(u_\tau = \tfrac12\sigma^2 u_{xx}\). Its solution, transformed back, gives
\[ \boxed{\,C = S\,N(d_1) - K e^{-r\tau} N(d_2),\quad d_{1,2} = \frac{\ln(S/K) + (r \pm \tfrac12\sigma^2)\tau}{\sigma\sqrt{\tau}}\,} \]

The drift \(\mu\) does not appear in the price: the hedge removes it.

Sources: Black and Scholes 1973, doi:10.1086/260062. Merton 1973, doi:10.2307/3003143. Crossref records fetched 2026-11-27.
