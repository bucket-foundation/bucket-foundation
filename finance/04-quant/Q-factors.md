# Factor Models

ID: `Q-factors`
As of: 2026-11-27
Bead: `bkt-q5moa.1`

## What It Is

Factor models explain cross-sectional returns with a few portfolios: market, size (SMB), value (HML), then profitability (RMW) and investment (CMA). Momentum (winners minus losers) is the main addition outside Fama-French.

## Key Numbers and Dates

- Fama and French, Common risk factors in the returns on stocks and bonds, JFE 33(1):3-56, February 1993. **A**
- Jegadeesh and Titman, Returns to Buying Winners and Selling Losers, JF 48(1):65-91, March 1993. Momentum. **A**
- Fama and French, A five-factor asset pricing model, JFE 116(1):1-22, April 2015. **A**
- Ken French Data Library posts factor returns free; a December 2023 paper documents process changes and CRSP data changes. **A**

## 2026 State

French library now built on CRSP's new format after legacy FIZ files were discontinued; old downloads differ from new ones.

## Sources

1. Crossref record, Fama-French 1993. https://api.crossref.org/works/10.1016/0304-405X(93)90023-5 (fetched 2026-11-27)
2. Crossref record, Jegadeesh-Titman 1993. https://api.crossref.org/works/10.1111/j.1540-6261.1993.tb04702.x (fetched 2026-11-27)
3. Crossref record, Fama-French 2015. https://api.crossref.org/works/10.1016/j.jfineco.2014.10.010 (fetched 2026-11-27)
4. Kenneth French Data Library. https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/data_library.html (fetched 2026-11-27)

Grades: A primary data or statute, B reputable secondary, C single source or memory pending check.

## Derivation

### CAPM

Assumptions: investors hold mean-variance efficient portfolios (card `Q-mpt`); all share the same beliefs \(\mu, \Sigma\) and one horizon; they borrow and lend without limit at \(r_f\); markets clear with no frictions.

1. Every investor holds the tangency portfolio \(w_T\) plus the riskless asset. Market clearing makes the market portfolio \(M\) equal \(w_T\).
2. Tangency first-order condition, from \(\max (w^\top\mu - r_f)/\sigma_w\): \(\mu - r_f\mathbf 1 = \kappa\,\Sigma w_M\) for a scalar \(\kappa\).
3. Component \(i\) of \(\Sigma w_M\) is \(\operatorname{Cov}(R_i, R_M)\), so \(E[R_i] - r_f = \kappa\,\operatorname{Cov}(R_i, R_M)\).
4. Apply this to \(M\) itself: \(E[R_M] - r_f = \kappa\,\sigma_M^2\), so \(\kappa = (E[R_M]-r_f)/\sigma_M^2\).
5. Substitute:
\[ \boxed{\,E[R_i] - r_f = \beta_i\,(E[R_M] - r_f),\quad \beta_i = \frac{\operatorname{Cov}(R_i,R_M)}{\sigma_M^2}\,} \]

Only covariance with the market is priced. Idiosyncratic variance earns no premium.

Source: Sharpe 1964, doi:10.2307/2977928, Crossref record fetched 2026-11-27.

### APT

Assumptions: returns follow a \(k\)-factor model \(R_i = E[R_i] + \sum_{j=1}^k b_{ij} f_j + \varepsilon_i\) with \(E[f_j] = 0\), \(E[\varepsilon_i] = 0\), \(\varepsilon_i\) uncorrelated with factors and with each other, idiosyncratic variances bounded; the number of assets \(n\) is large; there is no asymptotic arbitrage.

1. Take a portfolio \(w\) with \(w^\top\mathbf 1 = 0\) (zero cost) and \(w^\top b_{\cdot j} = 0\) for every factor \(j\) (zero factor exposure). Spread it as \(w_i = O(1/n)\).
2. Its return is \(w^\top E[R] + \sum_i w_i\varepsilon_i\). The variance of the second term is \(\sum_i w_i^2\sigma_{\varepsilon i}^2 = O(1/n) \to 0\).
3. A zero-cost, riskless-in-the-limit portfolio must earn zero, so \(w^\top E[R] = 0\) for every \(w\) orthogonal to \(\mathbf 1\) and to each column of \(B\).
4. By linear algebra, a vector orthogonal to every vector that is orthogonal to \(\{\mathbf 1, b_{\cdot 1}, \dots, b_{\cdot k}\}\) lies in their span. Hence
\[ \boxed{\,E[R_i] \approx \lambda_0 + \sum_{j=1}^k b_{ij}\lambda_j\,} \]
with \(\lambda_0\) the zero-beta rate and \(\lambda_j\) the premium on factor \(j\). The approximation holds for all but a finite number of assets as \(n\) grows. CAPM is the one-factor case with the market as factor.

Source: Ross 1976, The arbitrage theory of capital asset pricing, J. Economic Theory 13(3):341-360, doi:10.1016/0022-0531(76)90046-6, Crossref record fetched 2026-11-27.
