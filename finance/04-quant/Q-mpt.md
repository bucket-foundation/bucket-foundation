# Portfolio Theory

ID: `Q-mpt`
As of: 2026-11-27
Bead: `bkt-q5moa.1`

## What It Is

Markowitz framed portfolio choice as mean versus variance: diversify to cut variance for a given expected return. The efficient frontier is the set of best trade-offs. Sharpe's CAPM priced assets by covariance with the market (beta).

## Key Numbers and Dates

- Markowitz, Portfolio Selection, Journal of Finance 7(1):77, March 1952, doi 10.2307/2975974. **A**
- Sharpe, Capital Asset Prices, Journal of Finance 19(3):425, September 1964, doi 10.2307/2977928. **A**
- 1990 Nobel in economics: Markowitz, Miller, Sharpe. **A**

## Sources

1. Crossref record, Markowitz 1952. https://api.crossref.org/works/10.2307/2975974 (fetched 2026-11-27)
2. Crossref record, Sharpe 1964. https://api.crossref.org/works/10.2307/2977928 (fetched 2026-11-27)
3. Nobel Prize, economic sciences 1990. https://www.nobelprize.org/prizes/economic-sciences/1990/summary/ (fetched 2026-11-27)

Grades: A primary data or statute, B reputable secondary, C single source or memory pending check.

## Derivation

### Mean-Variance Frontier

Assumptions: \(n\) risky assets with expected return vector \(\mu\) and positive definite covariance \(\Sigma\); weights \(w\) sum to one; short sales allowed; the investor ranks portfolios by mean and variance only.

1. Problem: minimize \(\tfrac12 w^\top \Sigma w\) subject to \(w^\top\mu = m\) and \(w^\top \mathbf 1 = 1\).
2. Lagrangian: \(\mathcal L = \tfrac12 w^\top\Sigma w - \lambda(w^\top\mu - m) - \gamma(w^\top\mathbf 1 - 1)\).
3. First-order condition: \(\Sigma w = \lambda\mu + \gamma\mathbf 1\), so \(w = \lambda\Sigma^{-1}\mu + \gamma\Sigma^{-1}\mathbf 1\).
4. Define \(A = \mathbf 1^\top\Sigma^{-1}\mu\), \(B = \mu^\top\Sigma^{-1}\mu\), \(C = \mathbf 1^\top\Sigma^{-1}\mathbf 1\), \(D = BC - A^2 > 0\). The constraints give \(\lambda B + \gamma A = m\) and \(\lambda A + \gamma C = 1\), so \(\lambda = (Cm - A)/D\) and \(\gamma = (B - Am)/D\).
5. Minimum variance at mean \(m\): \(\sigma^2 = w^\top\Sigma w = \lambda m + \gamma\), which gives
\[ \boxed{\,\sigma^2(m) = \frac{C m^2 - 2 A m + B}{D}\,} \]
a parabola in \((m, \sigma^2)\) and a hyperbola in \((\sigma, m)\). Its vertex is the global minimum-variance portfolio \(w_g = \Sigma^{-1}\mathbf 1 / C\), with mean \(A/C\) and variance \(1/C\).
6. With a riskless asset at rate \(r_f\), maximize the Sharpe ratio \((w^\top\mu - r_f)/\sqrt{w^\top\Sigma w}\). The solution is the tangency portfolio
\[ \boxed{\,w_T = \frac{\Sigma^{-1}(\mu - r_f\mathbf 1)}{\mathbf 1^\top\Sigma^{-1}(\mu - r_f\mathbf 1)}\,} \]
and every efficient portfolio mixes \(w_T\) with the riskless asset.

Source: Markowitz 1952, doi:10.2307/2975974, Crossref record fetched 2026-11-27.
