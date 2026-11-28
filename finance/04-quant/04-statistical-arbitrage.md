# Statistical Arbitrage

Trade the spread of related assets back to equilibrium: pairs by distance or cointegration, baskets by PCA residuals. Edge per trade is small, so cost, borrow and crowding decide the outcome.

## Papers

- Gatev, Goetzmann, Rouwenhorst 2006, Pairs Trading: Performance of a Relative-Value Arbitrage Rule, RFS (NBER w7032, doi:10.3386/w7032).
- Avellaneda and Lee 2010, Statistical arbitrage in the US equities market, Quantitative Finance. doi:10.1080/14697680903124632. PCA and ETF residuals modeled as OU.
- Engle and Granger 1987, cointegration. doi:10.2307/1913236
- August 2007 quant crisis: deleveraging of crowded long/short books (LJIwxiMxbaw @ 1:13:00).

## In The Video Corpus

- 5G7YdjnRvVI @ 0:09:00 GLD/GDX cointegrated, KO/PEP not
- CechARGinR4 @ 0:56:00 PCA curve trades
- UD92QBqA8Eo @ 0:02:00 pairs profits fell after 2001 decimalization
- sAONff8XU80 @ 0:11:00 Kalshi/Polymarket spread mean reverts, half-life 1.5 s

## Open Question

Cointegration breaks without warning; Chan advises holding both mean reversion and momentum books (DW9zQ8Hz6gQ @ 0:19:00).

## Derivation

### Cointegration and Error Correction

Assumptions: \(y_t\) is an \(n\)-vector of I(1) series (each stationary after one difference). The series are cointegrated if some \(\beta \ne 0\) makes \(\beta^\top y_t\) stationary.

1. Two-asset case: \(p^A_t\) and \(p^B_t\) are I(1). If \(s_t = p^A_t - \beta p^B_t\) is I(0), \(s_t\) is the tradable spread and \(\beta\) the hedge ratio.
2. Engle-Granger step one: estimate \(\beta\) by OLS of \(p^A\) on \(p^B\). Under cointegration the estimator converges at rate \(T\), faster than the usual \(\sqrt T\).
3. Step two: test the residuals \(\hat s_t\) for a unit root (augmented Dickey-Fuller, with critical values adjusted for the estimated \(\beta\)). Reject the unit root to accept cointegration.
4. Granger representation: a cointegrated VAR has an error correction form
\[ \boxed{\,\Delta y_t = \alpha\,\beta^\top y_{t-1} + \sum_{i=1}^{k-1}\Gamma_i\,\Delta y_{t-i} + \varepsilon_t\,} \]
The term \(\alpha\beta^\top y_{t-1}\) pulls the spread back; \(\alpha\) sets the speed.
5. Spread as OU: in continuous time \(ds = \theta(\mu - s)dt + \sigma dW\), and the discrete AR(1) fit \(s_t = a + b s_{t-1} + e_t\) gives \(\theta = -\ln b\) per period and half-life \(\ln 2/\theta\).

Source: Engle and Granger 1987, Econometrica 55(2):251, doi:10.2307/1913236, Crossref record fetched 2026-11-27.

### Johansen Test

Assumptions: \(y_t\) follows a Gaussian VAR(\(k\)) in levels; write it in error correction form \(\Delta y_t = \Pi y_{t-1} + \sum_{i=1}^{k-1}\Gamma_i\Delta y_{t-i} + \varepsilon_t\), \(\varepsilon_t \sim N(0,\Omega)\). Cointegration rank \(r\) means \(\Pi = \alpha\beta^\top\) with \(\alpha, \beta\) of size \(n\times r\).

1. Concentrate out the \(\Gamma_i\): regress \(\Delta y_t\) and \(y_{t-1}\) on the lagged differences; call the residuals \(R_{0t}\) and \(R_{1t}\).
2. Product moments \(S_{ij} = T^{-1}\sum_t R_{it}R_{jt}^\top\) for \(i,j \in \{0,1\}\).
3. For fixed \(\beta\), OLS gives \(\hat\alpha(\beta) = S_{01}\beta(\beta^\top S_{11}\beta)^{-1}\) and the concentrated likelihood \(L^{-2/T} \propto |S_{00} - S_{01}\beta(\beta^\top S_{11}\beta)^{-1}\beta^\top S_{10}|\).
4. By the determinant identity for partitioned matrices this equals \(|S_{00}|\,|\beta^\top(S_{11} - S_{10}S_{00}^{-1}S_{01})\beta| / |\beta^\top S_{11}\beta|\). Minimizing over \(\beta\) is the generalized eigenproblem
\[ |\lambda S_{11} - S_{10}S_{00}^{-1}S_{01}| = 0 \]
with ordered eigenvalues \(\hat\lambda_1 > \dots > \hat\lambda_n\); \(\hat\beta\) is the first \(r\) eigenvectors.
5. Maximized likelihood: \(L_{\max}^{-2/T} \propto |S_{00}|\prod_{i=1}^r(1-\hat\lambda_i)\). The likelihood ratio of rank \(r\) against rank \(n\) is the trace statistic
\[ \boxed{\,\lambda_{\text{trace}}(r) = -T\sum_{i=r+1}^{n}\ln(1-\hat\lambda_i)\,} \]
and of \(r\) against \(r+1\) the maximum-eigenvalue statistic \(-T\ln(1-\hat\lambda_{r+1})\). Their limit laws are functionals of Brownian motion, so critical values come from Johansen's tables.

Sources: Johansen, Statistical analysis of cointegration vectors, J. Economic Dynamics and Control 12(2-3):231-254, 1988, doi:10.1016/0165-1889(88)90041-3. Johansen, Estimation and Hypothesis Testing of Cointegration Vectors in Gaussian Vector Autoregressive Models, Econometrica 59(6):1551, 1991, doi:10.2307/2938278. Crossref records fetched 2026-11-27.
